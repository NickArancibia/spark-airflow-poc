import { createClient } from 'redis';

// Redis client setup
const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('[users] Redis Client Error', err));

// Connect to Redis
await redisClient.connect();
console.log('[users] Connected to Redis');

// Helper to get user key
function getUserKey(email) {
    return `user:${email}`;
}

// Get user by email
export async function getUserByEmail(email) {
    const data = await redisClient.get(getUserKey(email));
    if (!data) return null;
    
    const user = JSON.parse(data);
    return {
        email: user.email,
        password: user.password,
        balanceUsd: user.balanceUsd
    };
}

// Get all users (without passwords)
export async function getAllUsers() {
    const emails = await redisClient.lRange('users_list', 0, -1);
    const users = [];
    
    for (const email of emails) {
        const data = await redisClient.get(getUserKey(email));
        if (data) {
            const user = JSON.parse(data);
            users.push({
                email: user.email,
                balanceUsd: user.balanceUsd
            });
        }
    }
    
    return users;
}

// Authenticate user
export async function authenticateUser(email, password) {
    const user = await getUserByEmail(email);
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
export async function createUser(email, password, initialBalance = 0) {
    const exists = await redisClient.exists(getUserKey(email));
    if (exists) {
        throw new Error("User already exists");
    }

    const newUser = {
        email,
        password,
        balanceUsd: initialBalance
    };

    await redisClient.set(getUserKey(email), JSON.stringify(newUser));
    await redisClient.rPush('users_list', email);
    
    return {
        email: newUser.email,
        balanceUsd: newUser.balanceUsd
    };
}

// Update user balance
export async function updateBalance(email, newBalance) {
    const user = await getUserByEmail(email);
    if (!user) {
        throw new Error("User not found");
    }

    user.balanceUsd = newBalance;
    await redisClient.set(getUserKey(email), JSON.stringify(user));
    
    return {
        email: user.email,
        balanceUsd: user.balanceUsd
    };
}

// Add to balance
export async function addToBalance(email, amount) {
    const user = await getUserByEmail(email);
    if (!user) {
        throw new Error("User not found");
    }

    user.balanceUsd += amount;
    await redisClient.set(getUserKey(email), JSON.stringify(user));
    
    return {
        email: user.email,
        balanceUsd: user.balanceUsd
    };
}

// Subtract from balance
export async function subtractFromBalance(email, amount) {
    const user = await getUserByEmail(email);
    if (!user) {
        throw new Error("User not found");
    }

    if (user.balanceUsd < amount) {
        throw new Error("Insufficient balance");
    }

    user.balanceUsd -= amount;
    await redisClient.set(getUserKey(email), JSON.stringify(user));
    
    return {
        email: user.email,
        balanceUsd: user.balanceUsd
    };
}

// Check if user has sufficient balance
export async function hasSufficientBalance(email, amount) {
    const user = await getUserByEmail(email);
    if (!user) {
        return false;
    }
    return user.balanceUsd >= amount;
}

// Get user balance
export async function getBalance(email) {
    const user = await getUserByEmail(email);
    if (!user) {
        throw new Error("User not found");
    }
    return user.balanceUsd;
}

// Delete user
export async function deleteUser(email) {
    const exists = await redisClient.exists(getUserKey(email));
    if (!exists) {
        throw new Error("User not found");
    }
    
    await redisClient.del(getUserKey(email));
    await redisClient.lRem('users_list', 0, email);
    
    return true;
}

// Update password
export async function updatePassword(email, oldPassword, newPassword) {
    const user = await getUserByEmail(email);
    if (!user) {
        throw new Error("User not found");
    }

    if (user.password !== oldPassword) {
        throw new Error("Incorrect password");
    }

    user.password = newPassword;
    await redisClient.set(getUserKey(email), JSON.stringify(user));
    
    return true;
}

// Check if user exists
export async function userExists(email) {
    const exists = await redisClient.exists(getUserKey(email));
    return exists === 1;
}

// Get user count
export async function getUserCount() {
    const count = await redisClient.lLen('users_list');
    return count;
}

// Reset database (useful for testing)
export async function resetDatabase() {
    // Get all user emails and delete them
    const emails = await redisClient.lRange('users_list', 0, -1);
    for (const email of emails) {
        await redisClient.del(getUserKey(email));
    }
    await redisClient.del('users_list');

    // Re-initialize with demo users
    const demoUsers = [
        {
            email: "admin@example.com",
            password: "admin123",
            balanceUsd: 10000.00
        },
        {
            email: "user1@example.com",
            password: "password123",
            balanceUsd: 5000.00
        },
        {
            email: "user2@example.com",
            password: "password456",
            balanceUsd: 2500.50
        }
    ];

    for (const user of demoUsers) {
        await redisClient.set(getUserKey(user.email), JSON.stringify(user));
        await redisClient.rPush('users_list', user.email);
    }

    return true;
}

// Export client for cleanup
export { redisClient };

