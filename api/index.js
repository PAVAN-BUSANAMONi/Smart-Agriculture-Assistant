import app from '../backend/src/app.js';
import { initDatabase } from '../backend/src/db/mongo.js';

let dbInitPromise = null;

export default async function handler(req, res) {
  if (!dbInitPromise) {
    dbInitPromise = initDatabase().catch((err) => {
      console.warn('Serverless database bootstrap notice:', err?.message || err);
    });
  }

  await dbInitPromise;
  return app(req, res);
}

