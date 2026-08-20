export default async function handler(req, res) {
  try {
    const { default: app } = await import('../backend/src/app.js');
    return app(req, res);
  } catch (err) {
    console.error('Serverless Error:', err);
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
