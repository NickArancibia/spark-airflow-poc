import { Kafka, logLevel } from "kafkajs";

// Support both Docker (kafka:29092) and local development (localhost:9092)
const KAFKA_BROKERS = process.env.KAFKA_BROKERS || "localhost:9092";

export const kafka = new Kafka({
    clientId: "tx-system",
    brokers: KAFKA_BROKERS.split(","),
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
