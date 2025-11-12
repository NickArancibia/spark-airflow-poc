// In-memory liquidity management (Bitcoin)
let liquidity = {
    totalBtc: 10.0,      // Initial liquidity: 10 BTC
    reservedBtc: 0,      // Amount currently reserved for pending transactions
    availableBtc: 10.0
};

export const BTC_PRICE_USD = 101232.12;

// Get current liquidity status
export function getLiquidity() {
    return {
        totalBtc: liquidity.totalBtc,
        reservedBtc: liquidity.reservedBtc,
        availableBtc: liquidity.availableBtc
    };
}

// Get available liquidity
export function getAvailableLiquidity() {
    return liquidity.availableBtc;
}

// Check if there's sufficient liquidity
export function hasSufficientLiquidity(amountBtc) {
    return liquidity.availableBtc >= amountBtc;
}

// Add liquidity
export function addLiquidity(amountBtc) {
    if (amountBtc <= 0) {
        throw new Error("Amount must be positive");
    }

    liquidity.totalBtc += amountBtc;
    liquidity.availableBtc += amountBtc;

    return getLiquidity();
}

// Remove liquidity
export function removeLiquidity(amountBtc) {
    if (amountBtc <= 0) {
        throw new Error("Amount must be positive");
    }

    if (liquidity.availableBtc < amountBtc) {
        throw new Error("Insufficient available liquidity");
    }

    liquidity.totalBtc -= amountBtc;
    liquidity.availableBtc -= amountBtc;

    return getLiquidity();
}

// Reserve liquidity for a transaction
export function reserveLiquidity(amountBtc) {
    if (amountBtc <= 0) {
        throw new Error("Amount must be positive");
    }

    if (liquidity.availableBtc < amountBtc) {
        throw new Error("Insufficient available liquidity");
    }

    liquidity.reservedBtc += amountBtc;
    liquidity.availableBtc -= amountBtc;

    return getLiquidity();
}

// Release reserved liquidity (transaction cancelled/failed)
export function releaseLiquidity(amountBtc) {
    if (amountBtc <= 0) {
        throw new Error("Amount must be positive");
    }

    if (liquidity.reservedBtc < amountBtc) {
        throw new Error("Cannot release more than reserved amount");
    }

    liquidity.reservedBtc -= amountBtc;
    liquidity.availableBtc += amountBtc;

    return getLiquidity();
}

// Commit reserved liquidity (transaction completed)
export function commitLiquidity(amountBtc) {
    if (amountBtc <= 0) {
        throw new Error("Amount must be positive");
    }

    if (liquidity.reservedBtc < amountBtc) {
        throw new Error("Cannot commit more than reserved amount");
    }

    liquidity.reservedBtc -= amountBtc;
    liquidity.totalBtc -= amountBtc;

    return getLiquidity();
}

// Set liquidity to a specific amount
export function setLiquidity(amountBtc) {
    if (amountBtc < 0) {
        throw new Error("Liquidity cannot be negative");
    }

    if (amountBtc < liquidity.reservedBtc) {
        throw new Error("Cannot set liquidity below reserved amount");
    }

    liquidity.totalBtc = amountBtc;
    liquidity.availableBtc = amountBtc - liquidity.reservedBtc;

    return getLiquidity();
}

// Reset liquidity to initial state
export function resetLiquidity() {
    liquidity = {
        totalBtc: 10.0,
        reservedBtc: 0,
        availableBtc: 10.0
    };

    return getLiquidity();
}

// Simula una compra de BTC y actualiza la liquidez real
export function purchaseBtc(amountBtc, priceUsd = BTC_PRICE_USD) {
    if (amountBtc <= 0) {
        throw new Error("Purchase amount must be positive");
    }

    const estimatedCost = amountBtc * priceUsd;
    console.log(`[liquidity] 🛒 Buying ₿${amountBtc.toFixed(8)} (~$${estimatedCost.toLocaleString()}) from exchange...`);

    // await new Promise(res => setTimeout(res, 500));

    // Actualizar liquidez
    liquidity.totalBtc += amountBtc;
    liquidity.availableBtc += amountBtc;

    console.log(`[liquidity] ✅ Purchase completed: ₿${amountBtc.toFixed(8)} added to liquidity.`);
    console.log(`[liquidity] 💰 New total: ₿${liquidity.totalBtc.toFixed(8)} (available ₿${liquidity.availableBtc.toFixed(8)})`);

    return getLiquidity();
}
