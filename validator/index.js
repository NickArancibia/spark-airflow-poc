import { kafka, topic, ensureTopic, producerTx } from "../shared/kafka.js";
import { hasSufficientBalance, userExists } from "../data/users.js";

const groupId = "validator-service";

const consumer = kafka.consumer({ groupId });
const producer = await producerTx("validator-");

await ensureTopic();
await consumer.connect();
await consumer.subscribe({ topic, fromBeginning: false });

console.log("[validator] listening…");

await consumer.run({
    eachMessage: async ({ message }) => {
        const key = message.key?.toString();
        const evt = JSON.parse(message.value.toString());
        if (evt.type === "NewOrderReceived") {
            const email = evt.email;
            const amount = evt.payload.fiat;

            // Check if email is provided
            if (!email) {
                const out = {
                    transaction_id: evt.transaction_id,
                    type: "Rejected",
                    payload: {
                        reason: "Missing email",
                        fiat: amount
                    },
                    ts: new Date().toISOString()
                };
                await producer.send({ topic, messages: [{ key, value: JSON.stringify(out) }] });
                console.log("[validator] → Rejected (no email):", key);
                return;
            }

            // Check if user exists
            if (!userExists(email)) {
                const out = {
                    transaction_id: evt.transaction_id,
                    type: "Rejected",
                    payload: {
                        reason: "User not found",
                        email,
                        fiat: amount
                    },
                    ts: new Date().toISOString()
                };
                await producer.send({ topic, messages: [{ key, value: JSON.stringify(out) }] });
                console.log("[validator] → Rejected (user not found):", key, email);
                return;
            }

            // Check if user has sufficient balance
            if (!hasSufficientBalance(email, amount)) {
                const out = {
                    transaction_id: evt.transaction_id,
                    type: "Rejected",
                    payload: {
                        reason: "Insufficient balance",
                        email,
                        fiat: amount
                    },
                    ts: new Date().toISOString()
                };
                await producer.send({ topic, messages: [{ key, value: JSON.stringify(out) }] });
                console.log("[validator] → Rejected (insufficient balance):", key, email, `$${amount}`);
                return;
            }

            // Validation passed
            const out = {
                transaction_id: evt.transaction_id,
                type: "TransactionValidated",
                email,
                payload: {
                    email,
                    fiat: amount
                },
                ts: new Date().toISOString()
            };
            await producer.send({ topic, messages: [{ key, value: JSON.stringify(out) }] });
            console.log("[validator] → TransactionValidated:", key, email, `$${amount}`);
        }
    }
});
