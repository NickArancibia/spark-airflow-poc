import { commitLiquidity } from "../liquidity/liquidity_service.js";
import { kafka, topic, ensureTopic, producerTx } from "../shared/kafka.js";
import { subtractFromBalance } from "../data/users.js";

const consumer = kafka.consumer({ groupId: "payment-service" });
const producer = await producerTx("payment-");

// Track processed transactions to avoid duplicates
const processedTransactions = new Set();

await ensureTopic();
await consumer.connect();
await consumer.subscribe({ topic, fromBeginning: false });

console.log("[payment] listening…");

await consumer.run({
    eachMessage: async ({ message }) => {
        const key = message.key?.toString();
        const evt = JSON.parse(message.value.toString());

        if (evt.type === "LiquidityReady") {
            console.log('[payment] Payment received transaction id', evt.transaction_id);

            // Check if already processed (idempotency)
            if (processedTransactions.has(evt.transaction_id)) {
                console.log(`[payment] ⚠️  Transaction ${evt.transaction_id} already processed, skipping`);
                return;
            }

            try {
                // Mark as processing
                processedTransactions.add(evt.transaction_id);

                const email = evt.email;
                const usdAmount = evt.payload.fiat;
                const btcAmount = evt.payload.btc_amount;

                // Step 1: Commit liquidity first (this validates the reservation exists)
                commitLiquidity(btcAmount);
                console.log(`[payment] ✓ Committed ₿${btcAmount.toFixed(8)} from liquidity`);

                // Step 2: Deduct user balance (only after liquidity is confirmed)
                subtractFromBalance(email, usdAmount);
                console.log(`[payment] ✓ Deducted $${usdAmount} from ${email}`);

                // Step 3: Send PaymentCompleted event
                const out = {
                    transaction_id: evt.transaction_id,
                    type: "PaymentCompleted",
                    payload: {
                        invoice_id: "inv-" + Math.random().toString(16).slice(2),
                        txid: "btc-" + Date.now()
                    },
                    ts: new Date().toISOString()
                };

                await producer.send({ topic, messages: [{ key, value: JSON.stringify(out) }] });
                console.log("[payment] →", out.type, key);
            } catch (error) {
                console.error(`[payment] ✗ Error processing payment for ${evt.transaction_id}:`, error.message);

                // Remove from processed set so it can be retried if needed
                processedTransactions.delete(evt.transaction_id);

                // Send rejection event to avoid timeout
                const errorOut = {
                    transaction_id: evt.transaction_id,
                    type: "Rejected",
                    payload: {
                        reason: `Payment processing failed: ${error.message}`
                    },
                    ts: new Date().toISOString()
                };
                await producer.send({ topic, messages: [{ key, value: JSON.stringify(errorOut) }] });
                console.log("[payment] → Rejected", key);
            }
        }
    }
});
