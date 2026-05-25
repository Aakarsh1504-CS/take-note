const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const env = require('./config/env');
const authRoutes = require('./routes/auth');
const noteRoutes = require('./routes/notes');
const requestId = require('./middleware/requestId');
const { apiLimiter } = require('./middleware/rateLimit');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// --- security & infrastructure ---
app.disable('x-powered-by');
// Trust the first hop so req.ip is the real client behind Render's proxy
// (needed for rate-limiting to key on the actual user, not the LB).
app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: env.isProd ? undefined : false }));
app.use(compression());
app.use(requestId);
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

if (!env.isProd) {
  morgan.token('id', (req) => req.id);
  app.use(morgan(':id :method :url :status :response-time ms'));
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    })
  );
}

// --- API ---
const apiRouter = express.Router();
apiRouter.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Real readiness probe: 200 only if mongo is up. Used by Render / uptime
// checks to distinguish "process alive" from "actually serving traffic".
apiRouter.get('/health', (_req, res) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  const code = mongoose.connection.readyState;
  const dbOk = code === 1;
  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    db: states[code] || 'unknown',
    uptime: Math.round(process.uptime()),
  });
});

apiRouter.use(apiLimiter);
apiRouter.use('/auth', authRoutes);
apiRouter.use('/notes', noteRoutes);
app.use('/api', apiRouter);

// --- production SPA serving ---
if (env.isProd) {
  const clientDist = path.resolve(__dirname, '../../client/dist');
  app.use(
    express.static(clientDist, {
      maxAge: '1y',
      // index.html should never be cached so deploys take effect immediately.
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html')) res.set('Cache-Control', 'no-cache');
      },
    })
  );
  app.get(/^\/(?!api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
