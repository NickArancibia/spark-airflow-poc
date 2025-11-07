import express from "express";
import { v4 as uuid } from "uuid";
import { kafka, ensureTopic, producerTx, topic } from "../shared/kafka.js";
import { authenticateUser } from "../data/users.js";

const app = express();
const PORT = 3000;
const REQUEST_TIMEOUT = 30000; // 30 seconds

// Basic Authentication middleware
const basicAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Basic ")) {
        return res.status(401).json({
            error: "Authentication required",
            message: "You must provide valid credentials using Basic Authentication"
        });
    }

    // Decode credentials
    const base64Credentials = authHeader.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
    const [email, password] = credentials.split(":");

    // Authenticate user using database
    const user = authenticateUser(email, password);

    if (!user) {
        return res.status(401).json({
            error: "Invalid credentials",
            message: "Incorrect email or password"
        });
    }

    // Inject authenticated user into request
    req.user = user;

    // Valid credentials, continue
    next();
};

// JSON parsing middleware
app.use(express.json());

// Map to store pending promises
const pendingRequests = new Map();

// Initialize Kafka Producer
await ensureTopic();
const producer = await producerTx("seed-");

// Initialize Kafka Consumer to listen for responses
const consumer = kafka.consumer({ groupId: "seed-http-server" });
await consumer.connect();
await consumer.subscribe({ topic, fromBeginning: false });

// Process response events
consumer.run({
    eachMessage: async ({ message }) => {
        const evt = JSON.parse(message.value.toString());
        const transaction_id = evt.transaction_id;

        console.log("[seed] event received:", evt.type, transaction_id);

        if (evt.type !== "PaymentCompleted" && evt.type !== "Rejected") {
            return;
        }

        // Check if there's a pending request waiting for this response
        if (pendingRequests.has(transaction_id)) {
            const { resolve } = pendingRequests.get(transaction_id);
            pendingRequests.delete(transaction_id);
            resolve(evt);
        }
    }
}).catch(err => {
    console.error("[seed] Consumer error:", err);
});

console.log("[seed] Consumer started, listening for responses...");

// Endpoint to create a new transaction (protected with Basic Auth)
app.post("/transaction", basicAuth, async (req, res) => {
    const transaction_id = uuid();

    try {
        const { destinationIban, amount, currency } = req.body;

        // Validate parameters
        if (!destinationIban || !amount || !currency) {
            return res.status(400).json({
                error: "Missing required parameters",
                required: ["destinationIban", "amount", "currency"]
            });
        }

        // Validate that amount is a positive number
        if (typeof amount !== "number" || amount <= 0) {
            return res.status(400).json({
                error: "Amount must be a positive number"
            });
        }

        // Create Promise to wait for response
        const responsePromise = new Promise((resolve, reject) => {
            // Store resolve/reject for when the response arrives
            pendingRequests.set(transaction_id, { resolve, reject });

            // Timeout: if no response in X seconds, reject
            setTimeout(() => {
                if (pendingRequests.has(transaction_id)) {
                    pendingRequests.delete(transaction_id);
                    reject(new Error("Timeout: No response received from processing"));
                }
            }, REQUEST_TIMEOUT);
        });

        // Create the event
        const event = {
            transaction_id,
            type: "NewOrderReceived",
            email: req.user.email,
            payload: {
                destinationIban,
                fiat: amount,
                currency
            },
            ts: new Date().toISOString()
        };

        // Send to Kafka
        await producer.send({
            topic,
            messages: [{ key: transaction_id, value: JSON.stringify(event) }]
        });

        console.log(`[seed] sent NewOrderReceived: ${transaction_id} | ${amount} ${currency} -> ${destinationIban}`);
        console.log(`[seed] waiting for response: ${transaction_id}...`);

        // Wait for response
        const resultEvent = await responsePromise;

        // Process according to the received event type
        if (resultEvent.type === "PaymentCompleted") {
            console.log(`[seed] ✓ PaymentCompleted received: ${transaction_id}`);
            return res.status(200).json({
                success: true,
                status: "completed",
                transaction_id,
                data: {
                    destinationIban,
                    amount,
                    currency,
                    invoice_id: resultEvent.payload.invoice_id,
                    txid: resultEvent.payload.txid
                },
                timestamp: resultEvent.ts
            });
        } else if (resultEvent.type === "Rejected") {
            console.log(`[seed] ✗ Rejected received: ${transaction_id}`);
            return res.status(422).json({
                success: false,
                status: "rejected",
                transaction_id,
                data: {
                    destinationIban,
                    amount,
                    currency
                },
                message: "Transaction was rejected during validation",
                timestamp: resultEvent.ts
            });
        } else {
            // Unexpected event
            console.log(`[seed] ? Unexpected event: ${resultEvent.type} for ${transaction_id}`);
            return res.status(500).json({
                success: false,
                status: "unknown",
                transaction_id,
                message: `Unexpected event: ${resultEvent.type}`,
                timestamp: resultEvent.ts
            });
        }

    } catch (error) {
        // Cleanup on error
        pendingRequests.delete(transaction_id);

        console.error("[seed] Error processing transaction:", error);

        // If timeout
        if (error.message.includes("Timeout")) {
            return res.status(504).json({
                success: false,
                status: "timeout",
                transaction_id,
                error: "Timeout",
                message: "No response received from processing within the expected time"
            });
        }

        // Other error
        res.status(500).json({
            success: false,
            status: "error",
            transaction_id,
            error: "Internal server error",
            message: error.message
        });
    }
});

// Health check endpoint
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "seeder" });
});

// Start server
app.listen(PORT, () => {
    console.log(`[seed] HTTP Server running at http://localhost:${PORT}`);
    console.log(`[seed] Endpoint: POST http://localhost:${PORT}/transaction`);
    console.log(`[seed] Health check: GET http://localhost:${PORT}/health`);
});

// Kafka error handling
producer.on("producer.disconnect", () => {
    console.error("[seed] Producer disconnected");
});

