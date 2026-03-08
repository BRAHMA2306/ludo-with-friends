const { createClient } = require('redis');

let redisClient;
const memoryStore = new Map();

async function initRedis() {
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  redisClient = createClient({ url });

  redisClient.on('error', (err) => {
    // Only log once
    if (redisClient) {
      console.log('Redis Client Error', err.message);
      redisClient = null; // Disable client on error to fallback
    }
  });

  try {
    // try to connect within 1s
    const connectPromise = redisClient.connect();
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1000));
    await Promise.race([connectPromise, timeoutPromise]);
    console.log('Connected to Redis');
  } catch (err) {
    console.log('Could not connect to Redis, falling back to in-memory store.');
    redisClient = null;
  }
}

async function setGameState(roomId, state) {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.set(`room:${roomId}`, JSON.stringify(state));
      return;
    } catch(e) {}
  }
  memoryStore.set(`room:${roomId}`, JSON.stringify(state));
}

async function getGameState(roomId) {
  let data;
  if (redisClient && redisClient.isOpen) {
    try {
      data = await redisClient.get(`room:${roomId}`);
      return data ? JSON.parse(data) : null;
    } catch(e) {}
  }
  data = memoryStore.get(`room:${roomId}`);
  return data ? JSON.parse(data) : null;
}

module.exports = {
  initRedis,
  setGameState,
  getGameState
};
