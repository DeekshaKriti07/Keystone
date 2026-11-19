import jwt from 'jsonwebtoken';
import db from '../db.js';

const findUser = db.prepare('SELECT id, name, email FROM users WHERE id = ?');
export function verifyToken(token) {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    if (!Number.isSafeInteger(payload.sub)) return null;
    const user = findUser.get(payload.sub);
    return user ? { user, expires: payload.exp * 1000 } : null;
  } catch { return null; }
}

export function requestIdentity(req) {
  const auth = req.get('Authorization');
  return auth?.startsWith('Bearer ') ? verifyToken(auth.slice(7)) : null;
}

export function requireAuth(req, res, next) {
  const identity = requestIdentity(req);
  if (!identity) return res.status(401).json({ error: 'Sign in to access your tasks.' });
  req.userId = identity.user.id;
  next();
}
