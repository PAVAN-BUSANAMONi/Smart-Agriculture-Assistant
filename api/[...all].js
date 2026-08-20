import app from '../backend/src/app.js';

export default async function handler(req, res) {
  return app(req, res);
}
