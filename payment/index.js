import { commitLiquidity } from "../liquidity/liquidity_service.js";
import { kafka, topic, ensureTopic, producerTx } from "../shared/kafka.js";

const consumer = kafka.consumer({ groupId: "payment-service" });
const producer = await producerTx("payment-");

await ensureTopic();
await consumer.connect();
await consumer.subscribe({ topic, fromBeginning: false });

console.log("[payment] listening…");

await consumer.run({
    eachMessage: async ({ message }) => {
        const key = message.key?.toString();
        const evt = JSON.parse(message.value.toString());

        if (evt.type === "LiquidityReady") {
            console.log('Payment received transaction id', evt.transaction_id);
            // Simulate invoice request and payment
            const out = {
                transaction_id: evt.transaction_id,
                type: "PaymentCompleted",
                payload: { invoice_id: "inv-" + Math.random().toString(16).slice(2), txid: "btc-" + Date.now() },
                ts: new Date().toISOString()
            };

            // commitLiquidity(evt.payload.btc_amount);
            await producer.send({ topic, messages: [{ key, value: JSON.stringify(out) }] });
            console.log("[payment] →", out.type, key);
        }
    }
});
