/**
 * /api/feed — personalized event feed:
 * events hosted by people you follow, events you saved/attend,
 * plus featured & trending discovery blocks.
 */
const express = require('express');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');
const { listEvents, getEventById } = require('../db/helpers');

const router = express.Router();

router.get('/', optionalAuth, (req, res) => {
  const userId = req.userId;

  let forYou = [];
  let following = [];

  if (userId) {
    const followIds = db.prepare('SELECT following_id FROM follows WHERE follower_id = ?').all(userId)
      .map((r) => r.following_id);

    // Events hosted by people the user follows
    const hostEvents = db.prepare(`
      SELECT e.id FROM events e
      WHERE e.host_id IN (${followIds.length ? followIds.map(() => '?').join(',') : 'NULL'})
        AND e.starts_at >= datetime('now')
      ORDER BY e.starts_at ASC LIMIT 12
    `).all(...followIds).map((r) => r.id);
    following = hostEvents.map(getEventById).filter(Boolean);

    // Affinity: categories the user RSVPs/saves in
    const aff = db.prepare(`
      SELECT e.category_id AS cid, COUNT(*) AS n FROM rsvps r
      JOIN events e ON e.id = r.event_id WHERE r.user_id = ?
      GROUP BY e.category_id ORDER BY n DESC LIMIT 3
    `).all(userId).map((r) => r.cid);
    if (aff.length) {
      const ids = db.prepare(`
        SELECT e.id FROM events e
        WHERE e.category_id IN (${aff.map(() => '?').join(',')}) AND e.starts_at >= datetime('now')
        ORDER BY e.starts_at ASC LIMIT 12
      `).all(...aff).map((r) => r.id);
      forYou = ids.map(getEventById).filter(Boolean);
    }
  }

  const trending = listEvents({ sort: 'popular', limit: 8 }).events;
  const upcoming = listEvents({ sort: 'soon', limit: 8 }).events;
  const featured = listEvents({ featured: true, limit: 8, sort: 'popular' }).events;

  res.json({ forYou, following, trending, upcoming, featured });
});

module.exports = router;
