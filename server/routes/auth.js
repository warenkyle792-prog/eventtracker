/**
 * /api/auth — registration, sign-in and the session bootstrap.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');
const { getUserById, getUserWithPassword, getUserByEmail, userStats } = require('../db/helpers');
const notifications = require('../services/notifications');

const router = express.Router();

function withStats(user) {
  const fresh = getUserById(user.id);
  return { ...fresh, stats: userStats(user.id) };
}

const RESERVED = new Set(['admin', 'root', 'eventtracker', 'support', 'help', 'api', 'settings', 'login', 'register']);

router.post('/register', (req, res, next) => {
  try {
    const { name, username, email, password, phone = '', location = '', interests = [] } = req.body || {};

    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: 'Name, username, email and password are required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!/^[a-z0-9_.]{3,24}$/i.test(username)) {
      return res.status(400).json({ error: 'Username must be 3–24 characters (letters, numbers, underscores)' });
    }
    if (RESERVED.has(String(username).toLowerCase())) {
      return res.status(400).json({ error: 'That username is reserved' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const cleanUsername = String(username).toLowerCase();
    const cleanEmail = String(email).toLowerCase();

    if (db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername)) {
      return res.status(409).json({ error: 'That username is already taken' });
    }
    if (getUserByEmail(cleanEmail)) {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }

    const hash = bcrypt.hashSync(String(password), 10);
    const interestString = (Array.isArray(interests) ? interests : String(interests).split(','))
      .map((s) => String(s).trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 8)
      .join(',');

    const info = db.prepare(`
      INSERT INTO users (name, username, email, password_hash, bio, location, phone, interests)
      VALUES (?, ?, ?, ?, '', ?, ?, ?)
    `).run(
      String(name).trim().slice(0, 80),
      cleanUsername,
      cleanEmail,
      hash,
      String(location).trim().slice(0, 120),
      String(phone).trim().slice(0, 40),
      interestString
    );

    const user = getUserById(info.lastInsertRowid);

    notifications.create({
      userId: user.id,
      type: 'system',
      title: 'Welcome to EventTracker',
      body: 'Follow a few categories, save your first event, and create one of your own when you are ready.',
      link: '/discover',
    });

    res.status(201).json({ token: signToken(user), user: withStats(user) });
  } catch (error) {
    next(error);
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const user = getUserWithPassword(email);
  if (!user || !bcrypt.compareSync(String(password), user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  res.json({ token: signToken(user), user: withStats(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({
    user: { ...req.user, stats: userStats(req.userId) },
    unread_notifications: notifications.unreadCount(req.userId),
  });
});

module.exports = router;
