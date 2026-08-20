function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function resolveBackendOrigin() {
  const configuredOrigin = trimTrailingSlash(import.meta.env.VITE_API_URL || '');
  const devOverrideOrigin = trimTrailingSlash(import.meta.env.VITE_DEV_API_URL || '');

  if (!import.meta.env.PROD) {
    return devOverrideOrigin;
  }

  // On Vercel deployments (*.vercel.app) or standard web deployments, use same-origin relative API routes
  // to avoid cross-origin CORS blocks and latency from external Render instances.
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return '';
  }

  // If VITE_API_URL points to onrender.com, bypass it in favor of same-origin serverless API
  if (configuredOrigin && !configuredOrigin.includes('onrender.com')) {
    return configuredOrigin;
  }

  return '';
}

export const BACKEND_ORIGIN = resolveBackendOrigin();
export const API_BASE_URL = BACKEND_ORIGIN ? `${BACKEND_ORIGIN}/api/v1` : '/api/v1';
export const ALERTS_STREAM_URL = BACKEND_ORIGIN ? `${BACKEND_ORIGIN}/api/v1/alerts/stream` : '/api/v1/alerts/stream';

