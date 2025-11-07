// In-memory user database
const users = new Map();

// Initialize with some demo users
users.set("admin@example.com", {
    email: "admin@example.com",
    password: "admin123",
    balanceUsd: 100000000000.00
});

users.set("user1@example.com", {
    email: "user1@example.com",
    password: "password123",
    balanceUsd: 5000.00
});

users.set("user2@example.com", {
    email: "user2@example.com",
    password: "password456",
    balanceUsd: 2500.50
});

// Get user by email
export function getUserByEmail(email) {
    return users.get(email);
}

// Get all users (without passwords)
export function getAllUsers() {
    return Array.from(users.values()).map(user => ({
        email: user.email,
        balanceUsd: user.balanceUsd
    }));
}

// Authenticate user
export function authenticateUser(email, password) {
    const user = users.get(email);
    if (!user) {
        return null;
    }
    if (user.password !== password) {
        return null;
    }
    return {
        email: user.email,
        balanceUsd: user.balanceUsd
    };
}

// Create new user
export function createUser(email, password, initialBalance = 0) {
    if (users.has(email)) {
        throw new Error("User already exists");
    }
    
    const newUser = {
        email,
        password,
        balanceUsd: initialBalance
    };
    
    users.set(email, newUser);
    return {
        email: newUser.email,
        balanceUsd: newUser.balanceUsd
    };
}

// Update user balance
export function updateBalance(email, newBalance) {
    const user = users.get(email);
    if (!user) {
        throw new Error("User not found");
    }
    
    user.balanceUsd = newBalance;
    return {
        email: user.email,
        balanceUsd: user.balanceUsd
    };
}

// Add to balance
export function addToBalance(email, amount) {
    const user = users.get(email);
    if (!user) {
        throw new Error("User not found");
    }
    
    user.balanceUsd += amount;
    return {
        email: user.email,
        balanceUsd: user.balanceUsd
    };
}

// Subtract from balance
export function subtractFromBalance(email, amount) {
    const user = users.get(email);
    if (!user) {
        throw new Error("User not found");
    }
    
    if (user.balanceUsd < amount) {
        throw new Error("Insufficient balance");
    }
    
    user.balanceUsd -= amount;
    return {
        email: user.email,
        balanceUsd: user.balanceUsd
    };
}

// Check if user has sufficient balance
export function hasSufficientBalance(email, amount) {
    const user = users.get(email);
    if (!user) {
        return false;
    }
    return user.balanceUsd >= amount;
}

// Get user balance
export function getBalance(email) {
    const user = users.get(email);
    if (!user) {
        throw new Error("User not found");
    }
    return user.balanceUsd;
}

// Delete user
export function deleteUser(email) {
    if (!users.has(email)) {
        throw new Error("User not found");
    }
    users.delete(email);
    return true;
}

// Update password
export function updatePassword(email, oldPassword, newPassword) {
    const user = users.get(email);
    if (!user) {
        throw new Error("User not found");
    }
    
    if (user.password !== oldPassword) {
        throw new Error("Incorrect password");
    }
    
    user.password = newPassword;
    return true;
}

// Check if user exists
export function userExists(email) {
    return users.has(email);
}

// Get user count
export function getUserCount() {
    return users.size;
}

// Reset database (useful for testing)
export function resetDatabase() {
    users.clear();
    
    // Re-initialize with demo users
    users.set("admin@example.com", {
        email: "admin@example.com",
        password: "admin123",
        balanceUsd: 10000.00
    });
    
    users.set("user1@example.com", {
        email: "user1@example.com",
        password: "password123",
        balanceUsd: 5000.00
    });
    
    users.set("user2@example.com", {
        email: "user2@example.com",
        password: "password456",
        balanceUsd: 2500.50
    });
    
    return true;
}

