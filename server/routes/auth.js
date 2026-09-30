const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { signToken, requireAuth } = require('../middleware/auth');
const { getUserById, getUserWithPassword, getUserByEmail, userStats } = require('../db/helpers');

const router = express.Router();

function publicUser(u) {
  const user = getUserById(u.id);
  return { ...user, stats: userStats(u.id) };
}

router.post('/register', (req, res) => {
  const { name, username, email, password } = req.body || {};
  if (!name || !username || !email || !password) {
    return res.status(400).json({ error: 'Name, username, email and password are required' });
  }
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!/^[a-z0-9_]{3,24}$/i.test(username)) {
    return res.status(400).json({ error: 'Username must be 3–24 characters (letters, numbers, underscores)' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Please enter a valid email' });

  const cleanUsername = username.toLowerCase();
  const cleanEmail = email.toLowerCase();
  if (getUserByUsernameSafe(cleanUsername)) return res.status(409).json({ error: 'That username is already taken' });
  if (getUserByEmail(cleanEmail)) return res.status(409).json({ error: 'An account with that email already exists' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(
    'INSERT INTO users (name, username, email, password_hash, bio, location) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(name.trim(), cleanUsername, cleanEmail, hash, '', '');

  const user = getUserById(info.lastInsertRowid);
  res.status(201).json({ token: signToken(user), user: { ...user, stats: userStats(user.id) } });
});

function getUserByUsernameSafe(username) {
  return db.prepare('SELECT id FROM users WHERE username = ?').get(username);
}

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = getUserWithPassword(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  res.json({ token: signToken(user), user: publicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  const user = getUserById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: { ...user, stats: userStats(user.id) } });
});

module.exports = router;
