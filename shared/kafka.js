import { Kafka, logLevel } from "kafkajs";

export const kafka = new Kafka({
    clientId: "tx-system",
    brokers: ["localhost:9092"],
    logLevel: logLevel.NOTHING
});

export const topic = "tx.events";

export async function ensureTopic() {
    const admin = kafka.admin();
    await admin.connect();
    await admin.createTopics({
        topics: [{ topic, numPartitions: 3, replicationFactor: 1 }],
        waitForLeaders: true
    }).catch(() => { });
    await admin.disconnect();
}

export async function producerTx(prefix = "svc-") {
    const p = kafka.producer({
        // idempotency helps avoid duplicates on retries
        idempotent: true,
        transactionalId: `${prefix}${Math.random().toString(16).slice(2)}`
    });
    await p.connect();
    return p;
}
