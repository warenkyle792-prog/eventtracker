const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const {
  getUserById, getUserByUsername, userStats, listEvents, mapEventRow,
} = require('../db/helpers');

const router = express.Router();

function profileWithStats(user, viewerId) {
  const stats = userStats(user.id);
  const is_following = viewerId
    ? Boolean(db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(viewerId, user.id))
    : false;
  return { ...user, stats, is_following: is_following && viewerId !== user.id };
}

/** GET /api/users?q= — people directory (for starting new chats) */
router.get('/', optionalAuth, (req, res) => {
  const q = String(req.query.q || '').trim();
  const like = `%${q}%`;
  const rows = q
    ? db.prepare(`
        SELECT u.id, u.name, u.username, u.avatar_url, u.bio FROM users u
        WHERE u.name LIKE ? OR u.username LIKE ? OR u.bio LIKE ?
        ORDER BY u.name ASC LIMIT 20
      `).all(like, like, like)
    : db.prepare('SELECT u.id, u.name, u.username, u.avatar_url, u.bio FROM users u ORDER BY u.name ASC LIMIT 20').all();
  res.json({ users: rows });
});

/** GET /api/users/me — full profile of the current user */
router.get('/me', requireAuth, (req, res) => {
  const user = getUserById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: profileWithStats(user, req.userId) });
});

/** PUT /api/users/me — edit profile */
router.put('/me', requireAuth, (req, res) => {
  const { name, bio, location, avatar_url, cover_url, password } = req.body || {};
  const me = db.prepare('SELECT * FROM users WHERE id = ?').get(req.userId);
  if (!me) return res.status(404).json({ error: 'User not found' });

  let hash = me.password_hash;
  if (password) {
    if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
    hash = bcrypt.hashSync(String(password), 10);
  }
  db.prepare(`
    UPDATE users SET name = ?, bio = ?, location = ?, avatar_url = ?, cover_url = ?, password_hash = ?
    WHERE id = ?
  `).run(
    name !== undefined ? String(name).trim().slice(0, 80) : me.name,
    bio !== undefined ? String(bio).slice(0, 500) : me.bio,
    location !== undefined ? String(location).slice(0, 120) : me.location,
    avatar_url !== undefined ? String(avatar_url).slice(0, 500) : me.avatar_url,
    cover_url !== undefined ? String(cover_url).slice(0, 500) : me.cover_url,
    hash,
    req.userId
  );
  const user = getUserById(req.userId);
  res.json({ user: profileWithStats(user, req.userId) });
});

/** GET /api/users/:username — public profile */
router.get('/:username', optionalAuth, (req, res) => {
  const user = getUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: profileWithStats(user, req.userId) });
});

/** GET /api/users/:username/events?tab=hosting|attending|saved */
router.get('/:username/events', optionalAuth, (req, res) => {
  const user = getUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const tab = req.query.tab || 'hosting';

  const { getEventById } = require('../db/helpers');

  if (tab === 'saved') {
    const ids = db.prepare('SELECT event_id FROM saves WHERE user_id = ? ORDER BY rowid DESC')
      .all(user.id).map((r) => r.event_id);
    return res.json({ events: ids.map(getEventById).filter(Boolean) });
  }

  if (tab === 'attending') {
    const ids = db.prepare("SELECT event_id FROM rsvps WHERE user_id = ? AND status = 'going'")
      .all(user.id).map((r) => r.event_id);
    return res.json({ events: ids.map(getEventById).filter(Boolean) });
  }

  // Hosting — include upcoming and past events
  const rows = db.prepare(`
    SELECT e.*, c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon,
           c.gradient AS category_gradient, c.color AS category_color,
           u.name AS host_name, u.username AS host_username, u.avatar_url AS host_avatar,
           (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = 'going') AS going_count,
           (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = 'interested') AS interested_count,
           (SELECT COUNT(*) FROM comments cm WHERE cm.event_id = e.id) AS comment_count
    FROM events e JOIN categories c ON c.id = e.category_id JOIN users u ON u.id = e.host_id
    WHERE e.host_id = ? ORDER BY e.starts_at DESC
  `).all(user.id);
  res.json({ events: rows.map(mapEventRow) });
});

/** GET /api/users/:username/followers | following */
router.get('/:username/followers', (req, res) => {
  const user = getUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const rows = db.prepare(`
    SELECT u.id, u.name, u.username, u.avatar_url, u.bio FROM follows f
    JOIN users u ON u.id = f.follower_id WHERE f.following_id = ? ORDER BY f.created_at DESC LIMIT 100
  `).all(user.id);
  res.json({ users: rows });
});

router.get('/:username/following', (req, res) => {
  const user = getUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const rows = db.prepare(`
    SELECT u.id, u.name, u.username, u.avatar_url, u.bio FROM follows f
    JOIN users u ON u.id = f.following_id WHERE f.follower_id = ? ORDER BY f.created_at DESC LIMIT 100
  `).all(user.id);
  res.json({ users: rows });
});

/** POST /api/users/:username/follow — toggle */
router.post('/:username/follow', requireAuth, (req, res) => {
  const user = getUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.id === req.userId) return res.status(400).json({ error: 'You cannot follow yourself' });
  const existing = db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?')
    .get(req.userId, user.id);
  if (existing) {
    db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.userId, user.id);
  } else {
    db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.userId, user.id);
  }
  res.json({ ok: true, is_following: !existing, stats: userStats(user.id) });
});

module.exports = router;
