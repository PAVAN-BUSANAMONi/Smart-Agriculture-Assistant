import { getUserById } from './auth.store.js';
import { verifyToken } from './token.service.js';

function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    return header.slice(7).trim();
  }

  if (typeof req.query.token === 'string') {
    return req.query.token;
  }

  return '';
}

export async function attachRequestAuth(req, _res, next) {
  try {
    const token = readToken(req);
    if (!token) {
      return next();
    }

    const payload = verifyToken(token);
    if (payload.type !== 'access') {
      return next();
    }

    let user = await getUserById(payload.sub);
    
    // Vercel stateless workaround: re-create owner if ephemeral local store was reset
    if (!user && payload.sub === '00000000-0000-4000-8000-owner0000000') {
      const { ensureOwnerAdmin } = await import('./auth.store.js');
      const ownerEmail = String(process.env.OWNER_EMAIL || process.env.SMTP_USER || '').trim().toLowerCase();
      const ownerName = String(process.env.OWNER_NAME || 'Owner').trim() || 'Owner';
      if (ownerEmail) {
        user = await ensureOwnerAdmin({ name: ownerName, email: ownerEmail });
      }
    }

    if (!user || user.status !== 'active') {
      return next();
    }

    req.auth = { token, user };
    req.headers['x-user-id'] = user.id;
    req.headers['x-user-role'] = user.role;
    return next();
  } catch {
    return next();
  }
}

export function requireAuth(req, res, next) {
  if (!req.auth?.user) {
    return res.status(401).json({ message: 'Authentication required.' });
  }
  return next();
}

export function requireAdmin(req, res, next) {
  if (!req.auth?.user || req.auth.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required.' });
  }
  return next();
}
