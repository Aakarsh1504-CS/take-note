const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
// Also try the project root .env (legacy location), without overriding.
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const required = ['MONGO_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[env] Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};

env.isProd = env.nodeEnv === 'production';

module.exports = env;
