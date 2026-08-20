import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import pinoHttp from 'pino-http';

import { authRouter } from './modules/auth/auth.routes.js';
import { attachRequestAuth, requireAdmin, requireAuth } from './modules/auth/auth.middleware.js';
import { otpRouter } from './modules/otp/otp.routes.js';
import { profileRouter } from './modules/profile/profile.routes.js';
import { weatherRouter } from './modules/weather/weather.routes.js';
import { cropRouter } from './modules/crops/crops.routes.js';
import { diseaseRouter } from './modules/disease/disease.routes.js';
import { marketRouter } from './modules/market/market.routes.js';
import { schemesRouter } from './modules/schemes/schemes.routes.js';
import { alertsRouter } from './modules/alerts/alerts.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { digitalTwinRouter } from './modules/digitalTwin/digitalTwin.routes.js';
import { lifecycleRouter } from './modules/lifecycle/lifecycle.routes.js';
import { assistantRouter } from './modules/assistant/assistant.routes.js';
import { aiRouter } from './modules/ai/ai.routes.js';
import { dataRouter } from './modules/data/data.routes.js';
import { riskRouter } from './modules/risk/risk.routes.js';
import { marketplaceRouter } from './modules/marketplace/marketplace.routes.js';
import { communityRouter } from './modules/community/community.routes.js';
import { iotRouter } from './modules/iot/iot.routes.js';
import { transparencyRouter } from './modules/transparency/transparency.routes.js';
import { ownerRouter } from './modules/owner/owner.routes.js';
import { isAppError } from './lib/errors.js';
import { getMetricsSnapshot, observeHttpRequest } from './lib/metrics.js';
import { getDatabaseHealth } from './db/state.js';
import { initDatabase } from './db/mongo.js';

const app = express();
let dbInitPromise = null;

app.use(async (_req, _res, next) => {
  if (!dbInitPromise) {
    dbInitPromise = initDatabase().catch((err) => {
      console.warn('Database initialization notice:', err?.message || err);
      return null;
    });
  }
  await dbInitPromise;
  next();
});
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'smart-agriculture-api',
    env: process.env.NODE_ENV || 'development',
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX || 80),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication requests. Please retry later.' },
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.OTP_RATE_LIMIT_MAX || 50),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many OTP requests. Please retry later.' },
});

const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AI_RATE_LIMIT_MAX || 80),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'AI request limit reached. Please retry shortly.' },
});

app.use(helmet({ crossOriginResourcePolicy: false, contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(
  pinoHttp({
    logger,
    autoLogging: true,
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          id: request.id,
        };
      },
      res(response) {
        return {
          statusCode: response.statusCode,
        };
      },
    },
  }),
);
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    observeHttpRequest({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
    });
  });
  next();
});

function buildHealthPayload() {
  const database = getDatabaseHealth();

  return {
    ok: true,
    status: database.ready ? 'ok' : 'degraded',
    service: 'smart-agriculture-api',
    database,
  };
}

const apiRouter = express.Router();

apiRouter.get('/health', (_req, res) => {
  res.json(buildHealthPayload());
});

apiRouter.use('/owner', ownerRouter);
apiRouter.use(attachRequestAuth);
apiRouter.use('/auth', authLimiter, authRouter);
apiRouter.use('/otp', otpLimiter, otpRouter);
apiRouter.use('/ai', aiLimiter, aiRouter);
apiRouter.use('/profile', requireAuth, profileRouter);
apiRouter.use('/weather', requireAuth, weatherRouter);
apiRouter.use('/crops', requireAuth, cropRouter);
apiRouter.use('/disease', requireAuth, diseaseRouter);
apiRouter.use('/market', requireAuth, marketRouter);
apiRouter.use('/schemes', requireAuth, schemesRouter);
apiRouter.use('/alerts', requireAuth, alertsRouter);
apiRouter.use('/admin', requireAuth, requireAdmin, adminRouter);
apiRouter.use('/digital-twin', requireAuth, digitalTwinRouter);
apiRouter.use('/lifecycle', requireAuth, lifecycleRouter);
apiRouter.use('/assistant', requireAuth, assistantRouter);
apiRouter.use('/data', requireAuth, dataRouter);
apiRouter.use('/risk', requireAuth, riskRouter);
apiRouter.use('/marketplace', requireAuth, marketplaceRouter);
apiRouter.use('/community', requireAuth, communityRouter);
apiRouter.use('/iot', requireAuth, iotRouter);
apiRouter.use('/transparency', requireAuth, transparencyRouter);
apiRouter.get('/metrics', requireAuth, requireAdmin, (_req, res) => {
  res.json(getMetricsSnapshot());
});

// Mount on all prefixes for seamless serverless routing
app.use('/api/v1', apiRouter);
app.use('/v1', apiRouter);
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Fallback for unmatched routes so Express always sends a response
app.use((req, res) => {
  if (!res.headersSent) {
    res.status(404).json({
      error: 'Not Found',
      message: `Cannot ${req.method} ${req.originalUrl || req.url}`,
    });
  }
});

app.use((error, req, res, _next) => {
  if (req.log) {
    req.log.error(
      {
        err: error,
        path: req.path,
        method: req.method,
      },
      'request_failed',
    );
  }

  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Invalid JSON payload.' });
  }

  if (isAppError(error)) {
    return res.status(error.status).json({ message: error.message, detail: error.detail || null });
  }

  console.error('Unhandled API error:', error);
  return res.status(500).json({ message: error?.message || 'Internal server error', detail: error?.message || null });
});

export default app;

