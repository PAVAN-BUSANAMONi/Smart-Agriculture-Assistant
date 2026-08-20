import app from '../backend/src/app.js';
import { initDatabase } from '../backend/src/db/mongo.js';

let dbInitPromise = null;

export default async function handler(req, res) {
  try {
    if (!dbInitPromise) {
      dbInitPromise = initDatabase().catch((err) => {
        console.warn('Serverless database bootstrap notice:', err?.message || err);
        return null;
      });
    }

    await dbInitPromise;
    return app(req, res);
  } catch (err) {
    console.error('Unhandled Vercel serverless error:', err);
    if (!res.headersSent) {
      return res.status(500).json({
        error: 'Internal Serverless Error',
        message: err?.message || String(err),
      });
    }
  }
}


