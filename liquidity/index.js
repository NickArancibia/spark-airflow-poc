import { kafka, topic, ensureTopic, producerTx } from "../shared/kafka.js";
import { BTC_PRICE_USD, hasSufficientLiquidity, reserveLiquidity, getLiquidity, purchaseBtc, commitLiquidity } from "./liquidity_service.js";

const consumer = kafka.consumer({ groupId: "liquidity-service" });
const producer = await producerTx("liquidity-");

// Track processed transactions to avoid duplicates
const processedTransactions = new Set();
const committedTransactions = new Set();

await ensureTopic();
await consumer.connect();
await consumer.subscribe({ topic, fromBeginning: false });

// Warmup delay to let Kafka stabilize
console.log("[liquidity] Waiting for Kafka to stabilize...");
await new Promise(resolve => setTimeout(resolve, 2000));

const liquidityStatus = getLiquidity();
console.log("[liquidity] listening…");
console.log(`[liquidity] Initial status: Available ₿${liquidityStatus.availableBtc.toFixed(8)} / Total ₿${liquidityStatus.totalBtc.toFixed(8)}`);
console.log(`[liquidity] BTC Price: $${BTC_PRICE_USD.toLocaleString()}`);

await consumer.run({
    eachMessage: async ({ message }) => {
        const key = message.key?.toString();
        const evt = JSON.parse(message.value.toString());

        // Handle PaymentCompleted - commit the reserved liquidity
        if (evt.type === "PaymentCompleted") {
            console.log('[liquidity] Received PaymentCompleted for transaction', evt.transaction_id);

            // Check if already committed (idempotency)
            if (committedTransactions.has(evt.transaction_id)) {
                console.log(`[liquidity] ⚠️  Transaction ${evt.transaction_id} already committed, skipping`);
                return;
            }

            const btcAmount = evt.payload.btc_amount;
            if (!btcAmount) {
                console.log('[liquidity] ⚠️  No btc_amount in PaymentCompleted event, skipping commit');
                return;
            }

            try {
                committedTransactions.add(evt.transaction_id);

                const liquidityBefore = getLiquidity();
                console.log(`[liquidity] 📊 Before commit: Total=₿${liquidityBefore.totalBtc.toFixed(8)}, Reserved=₿${liquidityBefore.reservedBtc.toFixed(8)}, Available=₿${liquidityBefore.availableBtc.toFixed(8)}`);

                commitLiquidity(btcAmount);

                const liquidityAfter = getLiquidity();
                console.log(`[liquidity] ✓ Committed ₿${btcAmount.toFixed(8)} | After: Total=₿${liquidityAfter.totalBtc.toFixed(8)}, Reserved=₿${liquidityAfter.reservedBtc.toFixed(8)}, Available=₿${liquidityAfter.availableBtc.toFixed(8)}`);
            } catch (error) {
                console.error(`[liquidity] ✗ Error committing liquidity:`, error.message);
                committedTransactions.delete(evt.transaction_id);
            }
            return;
        }

        if (evt.type === "TransactionValidated") {
            console.log('[liquidity] Liquidity received transaction id', evt.transaction_id);

            // Check if already processed (idempotency)
            if (processedTransactions.has(evt.transaction_id)) {
                console.log(`[liquidity] ⚠️  Transaction ${evt.transaction_id} already processed, skipping`);
                return;
            }

            try {
                // Mark as processing
                processedTransactions.add(evt.transaction_id);

                const usdAmount = evt.payload.fiat;
                const email = evt.email;

                // Convert USD to BTC
                const btcAmount = usdAmount / BTC_PRICE_USD;

                // Log state before
                const liquidityBefore = getLiquidity();
                console.log(`[liquidity] 📊 Before: Total=₿${liquidityBefore.totalBtc.toFixed(8)}, Reserved=₿${liquidityBefore.reservedBtc.toFixed(8)}, Available=₿${liquidityBefore.availableBtc.toFixed(8)}`);

                // Check if there's sufficient BTC liquidity
                if (!hasSufficientLiquidity(btcAmount)) {
                    const deficit = btcAmount - getLiquidity().availableBtc;

                    const extraBuffer = deficit * 0.1;
                    const purchaseAmount = deficit + extraBuffer;

                    console.log(`[liquidity] 🚀 Insufficient BTC liquidity — auto-purchasing ₿${purchaseAmount.toFixed(8)}...`);
                    const newStatus = await purchaseBtc(purchaseAmount);
                    console.log(`[liquidity] ✅ Purchase completed. New available liquidity: ₿${newStatus.availableBtc.toFixed(8)}`);
                }

                // Reserve BTC liquidity for this transaction
                console.log(`[liquidity] 🔒 Reserving ₿${btcAmount.toFixed(8)} for transaction ${evt.transaction_id}`);
                const status = reserveLiquidity(btcAmount);
                console.log(`[liquidity] ✓ Reserved ₿${btcAmount.toFixed(8)} | After: Total=₿${status.totalBtc.toFixed(8)}, Reserved=₿${status.reservedBtc.toFixed(8)}, Available=₿${status.availableBtc.toFixed(8)}`);

                const out = {
                    transaction_id: evt.transaction_id,
                    type: "LiquidityReady",
                    email,
                    payload: {
                        email,
                        btc_amount: btcAmount,
                        fiat: usdAmount,
                        btc_price: BTC_PRICE_USD,
                        trade_id: "t-" + Math.random().toString(16).slice(2)
                    },
                    ts: new Date().toISOString()
                };
                await producer.send({ topic, messages: [{ key, value: JSON.stringify(out) }] });
                console.log("[liquidity] → LiquidityReady:", key, email, `$${usdAmount}`, `₿${btcAmount.toFixed(8)}`);
            } catch (error) {
                console.error(`[liquidity] ✗ Error processing liquidity for ${evt.transaction_id}:`, error.message);
                // Remove from processed set so it can be retried if needed
                processedTransactions.delete(evt.transaction_id);

                // Send rejection event
                const errorOut = {
                    transaction_id: evt.transaction_id,
                    type: "Rejected",
                    payload: {
                        reason: `Liquidity processing failed: ${error.message}`
                    },
                    ts: new Date().toISOString()
                };
                await producer.send({ topic, messages: [{ key, value: JSON.stringify(errorOut) }] });
                console.log("[liquidity] → Rejected", key);
            }
        }
    }
});
