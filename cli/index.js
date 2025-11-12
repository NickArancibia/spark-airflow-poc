import inquirer from "inquirer";
import chalk from "chalk";
import Table from "cli-table3";
import ora from "ora";
import axios from "axios";

const API_URL = process.env.API_URL || "http://localhost:3000";

// Transaction history (in-memory, CLI-side)
const transactionHistory = [];

// Current BTC price (fetched from API)
let btcPriceUsd = 101232.12;

// Axios instance with default config
const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 35000
});

// Helper to create Basic Auth header
function createAuthHeader(email, password) {
    return `Basic ${Buffer.from(`${email}:${password}`).toString("base64")}`;
}

// Clear console and show banner
function showBanner() {
    console.clear();
    console.log(chalk.cyan.bold("\n╔════════════════════════════════════════════════════════════╗"));
    console.log(chalk.cyan.bold("║") + chalk.yellow.bold("          💰 BTC TRANSACTION SYSTEM CLI 💰              ") + chalk.cyan.bold("║"));
    console.log(chalk.cyan.bold("╚════════════════════════════════════════════════════════════╝"));
    console.log(chalk.gray(`   Connected to: ${API_URL}\n`));
}

// Format USD amount
function formatUSD(amount) {
    return chalk.green(`$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
}

function formatBTC(amount) {
    return chalk.yellow(`₿${amount.toFixed(8)}`);
}

// Fetch system info (BTC price, etc.)
async function fetchSystemInfo() {
    try {
        const response = await apiClient.get("/system/info");
        btcPriceUsd = response.data.btcPriceUsd;
    } catch (error) {
        console.log(chalk.yellow("⚠️  Could not fetch system info, using cached values"));
    }
}

// Main menu
async function showMainMenu() {
    showBanner();

    // Fetch system info on each menu load
    await fetchSystemInfo();

    const { action } = await inquirer.prompt([
        {
            type: "list",
            name: "action",
            message: chalk.cyan("¿Qué deseas hacer?"),
            choices: [
                { name: "👤 Consultar balance de usuario", value: "checkBalance" },
                { name: "💸 Ejecutar transacción", value: "executeTransaction" },
                { name: "🔷 Ver estado de liquidez BTC", value: "viewLiquidity" },
                { name: "📊 Ver historial de transacciones", value: "viewHistory" },
                { name: "🔌 Test de conexión API", value: "testConnection" },
                new inquirer.Separator(),
                { name: "🚪 Salir", value: "exit" }
            ]
        }
    ]);

    switch (action) {
        case "checkBalance":
            await checkBalance();
            break;
        case "executeTransaction":
            await executeTransaction();
            break;
        case "viewLiquidity":
            await viewLiquidity();
            break;
        case "viewHistory":
            await viewHistory();
            break;
        case "testConnection":
            await testConnection();
            break;
        case "exit":
            console.log(chalk.green("\n✨ ¡Hasta luego! ✨\n"));
            process.exit(0);
    }

    // Return to main menu
    await pressEnterToContinue();
    await showMainMenu();
}

// Test API connection
async function testConnection() {
    console.log(chalk.cyan.bold("\n🔌 Test de Conexión API\n"));

    const spinner = ora("Conectando al servidor API...").start();

    try {
        const response = await apiClient.get("/health");
        spinner.succeed(chalk.green("Conexión exitosa!"));

        const table = new Table({
            head: [chalk.cyan("Campo"), chalk.cyan("Valor")],
            colWidths: [20, 40]
        });

        table.push(
            ["Estado", chalk.green("✅ OK")],
            ["Servicio", chalk.white(response.data.service)],
            ["URL", chalk.white(API_URL)],
            ["Timestamp", chalk.gray(response.data.timestamp)]
        );

        console.log("\n" + table.toString() + "\n");
    } catch (error) {
        spinner.fail(chalk.red("Error de conexión"));
        console.log(chalk.red(`\n❌ No se pudo conectar a ${API_URL}`));
        console.log(chalk.yellow("   Asegúrate de que el servidor API esté corriendo (npm run api)\n"));
        if (error.code) {
            console.log(chalk.gray(`   Error code: ${error.code}\n`));
        }
    }
}

// Check balance
async function checkBalance() {
    console.log(chalk.cyan.bold("\n🔍 Consultar Balance\n"));

    const answers = await inquirer.prompt([
        {
            type: "input",
            name: "email",
            message: "Email del usuario:",
            validate: (input) => input.length > 0 || "El email es requerido"
        },
        {
            type: "password",
            name: "password",
            message: "Contraseña del usuario:",
            mask: "*",
            validate: (input) => input.length > 0 || "La contraseña es requerida"
        }
    ]);

    const spinner = ora("Consultando balance...").start();

    try {
        const response = await apiClient.get(`/users/${answers.email}/balance`, {
            headers: {
                Authorization: createAuthHeader(answers.email, answers.password)
            }
        });

        spinner.succeed(chalk.green("Balance obtenido"));

        const data = response.data;

        const table = new Table({
            head: [chalk.cyan("Campo"), chalk.cyan("Valor")],
            colWidths: [20, 40]
        });

        table.push(
            ["Email", chalk.white(data.email)],
            ["Balance USD", formatUSD(data.balanceUsd)],
            ["Balance BTC Equiv.", formatBTC(data.balanceBtc)],
            ["Precio BTC", formatUSD(btcPriceUsd)]
        );

        console.log("\n" + table.toString() + "\n");
    } catch (error) {
        spinner.fail(chalk.red("Error al consultar balance"));
        handleApiError(error);
    }
}

// Execute transaction
async function executeTransaction() {
    console.log(chalk.cyan.bold("\n💸 Ejecutar Transacción\n"));

    const answers = await inquirer.prompt([
        {
            type: "input",
            name: "email",
            message: "Email del usuario:",
            validate: (input) => input.length > 0 || "El email es requerido"
        },
        {
            type: "password",
            name: "password",
            message: "Contraseña del usuario:",
            mask: "*",
            validate: (input) => input.length > 0 || "La contraseña es requerida"
        },
        {
            type: "input",
            name: "destinationIban",
            message: "IBAN de destino:",
            default: "ES1234567890123456789012",
            validate: (input) => input.length > 0 || "El IBAN es requerido"
        },
        {
            type: "number",
            name: "amount",
            message: "Monto (USD):",
            validate: (input) => {
                if (!input || input <= 0) return "El monto debe ser mayor a 0";
                return true;
            }
        }
    ]);

    const spinner = ora("Procesando transacción...").start();

    try {
        const response = await apiClient.post(
            "/transaction",
            {
                destinationIban: answers.destinationIban,
                amount: answers.amount
            },
            {
                headers: {
                    Authorization: createAuthHeader(answers.email, answers.password)
                }
            }
        );

        spinner.succeed(chalk.green("Transacción completada exitosamente!"));

        const result = response.data;

        // Add to history
        transactionHistory.unshift({
            ...result,
            email: answers.email,
            clientTimestamp: new Date().toISOString()
        });

        // Show result
        const table = new Table({
            head: [chalk.cyan("Campo"), chalk.cyan("Valor")],
            colWidths: [20, 50]
        });

        table.push(
            ["Estado", chalk.green("✅ " + result.status.toUpperCase())],
            ["Transaction ID", chalk.white(result.transaction_id)],
            ["Email", chalk.white(answers.email)],
            ["Monto (USD)", formatUSD(result.data.amount)],
            ["IBAN Destino", chalk.white(result.data.destinationIban)],
            ["Invoice ID", chalk.white(result.data.invoice_id)],
            ["BTC Transaction ID", chalk.yellow(result.data.txid)],
            ["Timestamp", chalk.gray(result.timestamp)]
        );

        console.log("\n" + table.toString() + "\n");

    } catch (error) {
        spinner.fail(chalk.red("Error en la transacción"));
        handleApiError(error);
    }
}

// View BTC liquidity
async function viewLiquidity() {
    console.log(chalk.cyan.bold("\n🔷 Estado de Liquidez BTC\n"));

    const spinner = ora("Obteniendo estado de liquidez...").start();

    try {
        const response = await apiClient.get("/liquidity");

        spinner.succeed(chalk.green("Estado obtenido"));

        const liquidity = response.data.liquidity;

        const table = new Table({
            head: [chalk.cyan("Métrica"), chalk.cyan("Valor")],
            colWidths: [30, 30]
        });

        table.push(
            ["Total BTC", formatBTC(liquidity.totalBtc)],
            ["BTC Disponible", formatBTC(liquidity.availableBtc)],
            ["BTC Reservado", formatBTC(liquidity.reservedBtc)],
            ["Utilización", chalk.yellow(`${liquidity.utilizationPercent.toFixed(2)}%`)],
            new inquirer.Separator().line,
            ["Valor Total (USD)", formatUSD(liquidity.totalUsd)],
            ["Valor Disponible (USD)", formatUSD(liquidity.availableUsd)],
            ["Precio BTC", formatUSD(liquidity.btcPriceUsd)]
        );

        console.log("\n" + table.toString() + "\n");

        // Visual bar
        const barLength = 40;
        const availablePercent = (liquidity.availableBtc / liquidity.totalBtc);
        const filledLength = Math.round(availablePercent * barLength);
        const emptyLength = barLength - filledLength;

        console.log(chalk.white("Liquidez Disponible:"));
        console.log(
            chalk.green("█".repeat(filledLength)) +
            chalk.gray("░".repeat(emptyLength)) +
            chalk.white(` ${(availablePercent * 100).toFixed(1)}%`)
        );
        console.log();

    } catch (error) {
        spinner.fail(chalk.red("Error al obtener liquidez"));
        handleApiError(error);
    }
}

// View transaction history
async function viewHistory() {
    console.log(chalk.cyan.bold("\n📊 Historial de Transacciones\n"));

    if (transactionHistory.length === 0) {
        console.log(chalk.yellow("No hay transacciones en el historial.\n"));
        console.log(chalk.gray("(Solo se muestran transacciones realizadas durante esta sesión del CLI)\n"));
        return;
    }

    const table = new Table({
        head: [
            chalk.cyan("#"),
            chalk.cyan("Email"),
            chalk.cyan("Monto"),
            chalk.cyan("Estado"),
            chalk.cyan("Timestamp")
        ],
        colWidths: [5, 25, 15, 15, 25]
    });

    transactionHistory.forEach((tx, index) => {
        const statusIcon = tx.status === "completed" ? "✅" : tx.status === "rejected" ? "❌" : "⏳";
        const statusColor = tx.status === "completed" ? chalk.green : tx.status === "rejected" ? chalk.red : chalk.yellow;

        table.push([
            chalk.white(index + 1),
            chalk.white(tx.email),
            formatUSD(tx.data.amount),
            statusColor(`${statusIcon} ${tx.status}`),
            chalk.gray(new Date(tx.clientTimestamp).toLocaleString())
        ]);
    });

    console.log(table.toString() + "\n");
    console.log(chalk.green(`📊 Total de transacciones: ${transactionHistory.length}\n`));
}

// Handle API errors
function handleApiError(error) {
    if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        console.log(chalk.red(`\n❌ Error ${status}: ${data.error || "Unknown error"}`));
        if (data.message) {
            console.log(chalk.yellow(`   ${data.message}`));
        }
        if (data.reason) {
            console.log(chalk.yellow(`   Razón: ${data.reason}`));
        }
    } else if (error.code === "ECONNREFUSED") {
        console.log(chalk.red(`\n❌ Error: No se pudo conectar al servidor en ${API_URL}`));
        console.log(chalk.yellow(`   Asegúrate de que el servidor API esté corriendo (npm run api)`));
    } else if (error.code === "ETIMEDOUT" || error.code === "ECONNABORTED") {
        console.log(chalk.red(`\n❌ Error: Timeout - El servidor no respondió a tiempo`));
    } else {
        console.log(chalk.red(`\n❌ Error: ${error.message}`));
    }
    console.log();
}

// Press enter to continue
async function pressEnterToContinue() {
    await inquirer.prompt([
        {
            type: "input",
            name: "continue",
            message: chalk.gray("Presiona Enter para continuar..."),
        }
    ]);
}

// Start CLI
async function main() {
    try {
        // Initial connection test
        console.log(chalk.cyan("🔄 Conectando al servidor API...\n"));
        try {
            await apiClient.get("/health");
            console.log(chalk.green(`✅ Conectado exitosamente a ${API_URL}\n`));
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            console.log(chalk.red(`⚠️  No se pudo conectar a ${API_URL}`));
            console.log(chalk.yellow("   El CLI seguirá funcionando, pero las operaciones fallarán.\n"));
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        await showMainMenu();
    } catch (error) {
        if (error.isTtyError) {
            console.log(chalk.red("Error: Este CLI no puede renderizarse en este entorno"));
        } else {
            console.log(chalk.red(`Error: ${error.message}`));
        }
        process.exit(1);
    }
}

main();
