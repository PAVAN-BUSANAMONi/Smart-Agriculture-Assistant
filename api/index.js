import app from '../backend/src/app.js';

export default async function handler(req, res) {
  try {
    const originalUrl =
      req.headers['x-matched-path'] ||
      req.headers['x-vercel-matched-path'] ||
      req.headers['x-forwarded-uri'] ||
      req.headers['x-original-url'] ||
      req.url;

    if (originalUrl && (req.url === '/api' || req.url === '/api/')) {
      req.url = originalUrl;
    }

    return app(req, res);
  } catch (err) {
    console.error('Serverless Error:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          error: 'Serverless Crash',
          message: err?.message || String(err),
          stack: err?.stack || null,
        }),
      );
    }
  }
}
