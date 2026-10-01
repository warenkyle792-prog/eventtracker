/** JWT auth middleware. */
const jwt = require('jsonwebtoken');
const { getUserById } = require('../db/helpers');

const JWT_SECRET = process.env.JWT_SECRET || 'eventtracker-dev-secret-change-me';

function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '30d' });
}

function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  if (typeof req.query?.token === 'string') return req.query.token;
  return null;
}

function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = getUserById(payload.id);
    if (!user) return res.status(401).json({ error: 'Account no longer exists' });
    req.userId = user.id;
    req.username = user.username;
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      const user = getUserById(payload.id);
      if (user) {
        req.userId = user.id;
        req.username = user.username;
        req.user = user;
      }
    } catch { /* anonymous */ }
  }
  next();
}

module.exports = { signToken, requireAuth, optionalAuth, JWT_SECRET };
