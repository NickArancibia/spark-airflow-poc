import { kafka, topic, ensureTopic, producerTx } from "../shared/kafka.js";
import { hasSufficientLiquidity, reserveLiquidity, getLiquidity, purchaseBtc } from "./liquidity_service.js";

const consumer = kafka.consumer({ groupId: "liquidity-service" });
const producer = await producerTx("liquidity-");

// BTC price (in production, this would come from an oracle/API)
const BTC_PRICE_USD = 101232.12;

await ensureTopic();
await consumer.connect();
await consumer.subscribe({ topic, fromBeginning: false });

const liquidityStatus = getLiquidity();
console.log("[liquidity] listening…");
console.log(`[liquidity] Initial status: Available ₿${liquidityStatus.availableBtc.toFixed(8)} / Total ₿${liquidityStatus.totalBtc.toFixed(8)}`);
console.log(`[liquidity] BTC Price: $${BTC_PRICE_USD.toLocaleString()}`);

await consumer.run({
    eachMessage: async ({ message }) => {
        const key = message.key?.toString();
        const evt = JSON.parse(message.value.toString());

        if (evt.type === "TransactionValidated") {
            const usdAmount = evt.payload.fiat;
            const email = evt.email;

            // Convert USD to BTC
            const btcAmount = usdAmount / BTC_PRICE_USD;

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
            const status = reserveLiquidity(btcAmount);

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
            console.log("[liquidity] → LiquidityReady:", key, email, `$${usdAmount}`, `₿${btcAmount.toFixed(8)}`, `| Available: ₿${status.availableBtc.toFixed(8)}`);
        }
    }
});
