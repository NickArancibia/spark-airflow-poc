import { kafka, topic, ensureTopic, producerTx } from "../shared/kafka.js";
import { hasSufficientLiquidity, reserveLiquidity, getLiquidity } from "./liquidity_service.js";

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
                const out = {
                    transaction_id: evt.transaction_id,
                    type: "Rejected",
                    email,
                    payload: {
                        reason: "Insufficient BTC liquidity",
                        email,
                        fiat: usdAmount,
                        btc_required: btcAmount,
                        currency: evt.payload.currency
                    },
                    ts: new Date().toISOString()
                };
                await producer.send({ topic, messages: [{ key, value: JSON.stringify(out) }] });
                console.log("[liquidity] → Rejected (insufficient BTC liquidity):", key, email, `$${usdAmount}`, `₿${btcAmount.toFixed(8)} needed`);
                return;
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
                    currency: evt.payload.currency,
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
