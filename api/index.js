export default async function handler(req, res) {
  try {
    const appModule = await import('../backend/src/app.js');
    const app = appModule.default || appModule;
    return app(req, res);
  } catch (error) {
    console.error('Lambda crash caught:', error);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: 'CRASH_IN_LAMBDA',
        message: error?.message || String(error),
        stack: error?.stack || null,
        cwd: process.cwd(),
      }),
    );
  }
}
