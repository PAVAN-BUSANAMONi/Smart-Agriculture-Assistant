import app from '../backend/src/app.js';
import { initDatabase } from '../backend/src/db/mongo.js';

initDatabase().catch(console.error);

export default app;
