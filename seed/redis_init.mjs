import net from 'net';

const REDIS_HOST = process.env.REDIS_HOST || 'redis';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

// Initial demo users with passwords
const initialUsers = [
  {
    email: "admin@example.com",
    password: "admin123",
    balanceUsd: 1500.00
  },
  {
    email: "user1@example.com",
    password: "password123",
    balanceUsd: 2300.00
  },
  {
    email: "user2@example.com",
    password: "password456",
    balanceUsd: 120.43
  }
];

function toRESP(args) {
  let out = `*${args.length}\r\n`;
  for (const a of args) {
    const s = String(a);
    out += `$${Buffer.byteLength(s, 'utf8')}\r\n${s}\r\n`;
  }
  return out;
}

async function run() {
  console.log('[redis-init] users to seed:', initialUsers);

  const socket = net.createConnection(REDIS_PORT, REDIS_HOST);
  let buffer = '';
  const pending = [];

  socket.on('data', (chunk) => {
    buffer += chunk.toString();
    // Resolve simple single-line replies (OK / errors)
    while (buffer.indexOf('\r\n') !== -1 && pending.length) {
      const idx = buffer.indexOf('\r\n');
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const resolver = pending.shift();
      resolver(line);
    }
  });

  await new Promise((resolve, reject) => {
    socket.once('connect', resolve);
    socket.once('error', reject);
  });

  function sendCommand(args) {
    return new Promise((resolve, reject) => {
      pending.push((line) => {
        // If error reply
        if (line.length > 0 && line[0] === '-') {
          reject(new Error(line.slice(1)));
        } else {
          resolve(line);
        }
      });
      socket.write(toRESP(args));
    });
  }

  try {
    // Clear users_list
    await sendCommand(['DEL', 'users_list']);

    for (const u of initialUsers) {
      const key = `user:${u.email}`;
      // Store full user JSON including password and balance
      await sendCommand(['SET', key, JSON.stringify(u)]);
      await sendCommand(['RPUSH', 'users_list', u.email]);
      console.log(`[redis-init] seeded ${u.email}`);
    }

    console.log('[redis-init] done');
  } catch (err) {
    console.error('[redis-init] error seeding redis:', err);
    process.exitCode = 2;
  } finally {
    socket.end();
  }
}

run().catch((e) => {
  console.error('[redis-init] fatal error', e);
  process.exit(1);
});
