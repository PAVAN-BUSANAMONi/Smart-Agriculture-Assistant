import app from '../backend/src/app.js';
import { initDatabase } from '../backend/src/db/mongo.js';

let dbInitPromise = null;

export default async function handler(req, res) {
  try {
    const matchedPath =
      req.headers['x-vercel-matched-path'] ||
      req.headers['x-matched-path'] ||
      req.headers['x-forwarded-uri'] ||
      req.headers['x-original-url'];

    if (matchedPath && (req.url === '/api/index.js' || req.url === '/api/index' || req.url === '/api')) {
      req.url = matchedPath;
    }

    if (!dbInitPromise) {
      dbInitPromise = initDatabase().catch((err) => {
        console.warn('Serverless database bootstrap notice:', err?.message || err);
        return null;
      });
    }

    await dbInitPromise;

    return new Promise((resolve, reject) => {
      res.on('finish', resolve);
      res.on('close', resolve);
      res.on('error', reject);
      app(req, res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
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


