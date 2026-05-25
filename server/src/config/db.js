const mongoose = require('mongoose');
const env = require('./env');

async function connectDB() {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(env.mongoUri, {
      // Fail fast on a bad URI / firewall problem instead of hanging
      // for 30s (the default).
      serverSelectionTimeoutMS: 8_000,
      socketTimeoutMS: 45_000,
      maxPoolSize: 20,
    });
    console.log('[db] connected');
  } catch (err) {
    console.error('[db] connection error:', err.message);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
  mongoose.connection.on('error', (err) => console.error('[db] error:', err.message));
}

module.exports = connectDB;
