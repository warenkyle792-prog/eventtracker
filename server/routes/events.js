const express = require('express');
const db = require('../db');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { getEventById, listEvents, attendeePreview, mapEventRow, getUserById } = require('../db/helpers');

const router = express.Router();

/** GET /api/events — discovery with search / filters / sort / pagination */
router.get('/', optionalAuth, (req, res) => {
  const { search = '', category = '', when = '', price = '', sort = 'soon', page = '1', limit = '24' } = req.query;
  const lim = Math.min(parseInt(limit, 10) || 24, 60);
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * lim;
  const { events, total } = listEvents({ search, category, when, price, sort, limit: lim, offset });

  const userId = req.userId;
  const withFlags = events.map((e) => ({
    ...e,
    is_saved: userId ? Boolean(db.prepare('SELECT 1 FROM saves WHERE event_id = ? AND user_id = ?').get(e.id, userId)) : false,
    my_rsvp: userId
      ? (db.prepare('SELECT status FROM rsvps WHERE event_id = ? AND user_id = ?').get(e.id, userId)?.status || null)
      : null,
  }));
  res.json({ events: withFlags, total, page: parseInt(page, 10) || 1, pageSize: lim });
});

router.get('/featured', optionalAuth, (req, res) => {
  const { events } = listEvents({ featured: true, limit: 8, sort: 'popular' });
  const extra = listEvents({ limit: 8, sort: 'popular' }).events;
  const merged = [...events, ...extra.filter((e) => !events.find((x) => x.id === e.id))].slice(0, 8);
  res.json({ events: merged });
});

/** GET /api/events/:id — full detail */
router.get('/:id(\\d+)', optionalAuth, (req, res) => {
  const event = getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });

  const userId = req.userId;
  event.attendees = attendeePreview(event.id, 8);
  event.is_saved = userId
    ? Boolean(db.prepare('SELECT 1 FROM saves WHERE event_id = ? AND user_id = ?').get(event.id, userId))
    : false;
  event.my_rsvp = userId
    ? (db.prepare('SELECT status FROM rsvps WHERE event_id = ? AND user_id = ?').get(event.id, userId)?.status || null)
    : null;
  event.host = getUserById(event.host_id);
  event.host.stats = require('../db/helpers').userStats(event.host_id);
  res.json({ event });
});

/** POST /api/events — create */
router.post('/', requireAuth, (req, res) => {
  const {
    title, tagline = '', description, category_id, venue = '', city = '', country = '',
    starts_at, ends_at = '', price = 0, currency = 'USD', capacity = 0, image_url = '', tags = '',
  } = req.body || {};

  if (!title || !description || !category_id || !starts_at) {
    return res.status(400).json({ error: 'Title, description, category and start date are required' });
  }
  const priceCents = Math.max(0, Math.round(Number(price) * 100)) || 0;
  const tagString = Array.isArray(tags) ? tags.join(',') : String(tags);

  const info = db.prepare(`
    INSERT INTO events (title, tagline, description, category_id, host_id, venue, city, country,
                        starts_at, ends_at, price_cents, currency, capacity, image_url, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    String(title).trim().slice(0, 140),
    String(tagline).trim().slice(0, 200),
    String(description).trim(),
    category_id,
    req.userId,
    String(venue).trim().slice(0, 140),
    String(city).trim().slice(0, 80),
    String(country).trim().slice(0, 80),
    String(starts_at).slice(0, 19).replace('T', ' '),
    ends_at ? String(ends_at).slice(0, 19).replace('T', ' ') : '',
    priceCents,
    String(currency).slice(0, 8) || 'USD',
    Math.max(0, parseInt(capacity, 10) || 0),
    String(image_url).trim().slice(0, 500),
    tagString.slice(0, 300)
  );

  const event = getEventById(info.lastInsertRowid);
  res.status(201).json({ event });
});

/** PUT /api/events/:id — update (host only) */
router.put('/:id(\\d+)', requireAuth, (req, res) => {
  const event = getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.host_id !== req.userId) return res.status(403).json({ error: 'Only the host can edit this event' });

  const b = req.body || {};
  db.prepare(`
    UPDATE events SET
      title = COALESCE(?, title),
      tagline = COALESCE(?, tagline),
      description = COALESCE(?, description),
      venue = COALESCE(?, venue),
      city = COALESCE(?, city),
      country = COALESCE(?, country),
      starts_at = COALESCE(?, starts_at),
      ends_at = COALESCE(?, ends_at),
      capacity = COALESCE(?, capacity),
      image_url = COALESCE(?, image_url),
      tags = COALESCE(?, tags)
    WHERE id = ?
  `).run(
    b.title ?? null, b.tagline ?? null, b.description ?? null, b.venue ?? null,
    b.city ?? null, b.country ?? null,
    b.starts_at ? String(b.starts_at).slice(0, 19).replace('T', ' ') : null,
    b.ends_at !== undefined ? (b.ends_at ? String(b.ends_at).slice(0, 19).replace('T', ' ') : '') : null,
    b.capacity !== undefined ? Math.max(0, parseInt(b.capacity, 10) || 0) : null,
    b.image_url ?? null,
    Array.isArray(b.tags) ? b.tags.join(',') : b.tags ?? null,
    event.id
  );
  res.json({ event: getEventById(event.id) });
});

/** DELETE /api/events/:id */
router.delete('/:id(\\d+)', requireAuth, (req, res) => {
  const event = getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  if (event.host_id !== req.userId) return res.status(403).json({ error: 'Only the host can delete this event' });
  db.prepare('DELETE FROM events WHERE id = ?').run(event.id);
  res.json({ ok: true });
});

/** POST /api/events/:id/rsvp { status: going|interested|none } */
router.post('/:id(\\d+)/rsvp', requireAuth, (req, res) => {
  const event = getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const { status = 'going' } = req.body || {};
  if (!['going', 'interested', 'none'].includes(status)) {
    return res.status(400).json({ error: 'Status must be going, interested or none' });
  }
  if (status === 'none') {
    db.prepare('DELETE FROM rsvps WHERE event_id = ? AND user_id = ?').run(event.id, req.userId);
  } else {
    db.prepare(`
      INSERT INTO rsvps (event_id, user_id, status) VALUES (?, ?, ?)
      ON CONFLICT(event_id, user_id) DO UPDATE SET status = excluded.status
    `).run(event.id, req.userId, status);
  }
  const counts = db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'going' THEN 1 ELSE 0 END) AS going,
      SUM(CASE WHEN status = 'interested' THEN 1 ELSE 0 END) AS interested
    FROM rsvps WHERE event_id = ?
  `).get(event.id);
  res.json({ ok: true, status, going_count: counts.going || 0, interested_count: counts.interested || 0 });
});

/** POST /api/events/:id/save — toggle bookmark */
router.post('/:id(\\d+)/save', requireAuth, (req, res) => {
  const event = getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const existing = db.prepare('SELECT 1 FROM saves WHERE event_id = ? AND user_id = ?').get(event.id, req.userId);
  if (existing) {
    db.prepare('DELETE FROM saves WHERE event_id = ? AND user_id = ?').run(event.id, req.userId);
  } else {
    db.prepare('INSERT INTO saves (event_id, user_id) VALUES (?, ?)').run(event.id, req.userId);
  }
  res.json({ ok: true, is_saved: !existing });
});

/** GET /api/events/:id/comments */
router.get('/:id(\\d+)/comments', (req, res) => {
  const rows = db.prepare(`
    SELECT cm.*, u.name, u.username, u.avatar_url
    FROM comments cm JOIN users u ON u.id = cm.user_id
    WHERE cm.event_id = ? ORDER BY cm.created_at DESC LIMIT 100
  `).all(req.params.id);
  res.json({ comments: rows });
});

/** POST /api/events/:id/comments */
router.post('/:id(\\d+)/comments', requireAuth, (req, res) => {
  const event = getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const body = String(req.body?.body || '').trim();
  if (!body) return res.status(400).json({ error: 'Comment cannot be empty' });
  const info = db.prepare('INSERT INTO comments (event_id, user_id, body) VALUES (?, ?, ?)')
    .run(event.id, req.userId, body.slice(0, 1000));
  const comment = db.prepare(`
    SELECT cm.*, u.name, u.username, u.avatar_url
    FROM comments cm JOIN users u ON u.id = cm.user_id WHERE cm.id = ?
  `).get(info.lastInsertRowid);
  res.status(201).json({ comment });
});

/** GET /api/events/:id/related */
router.get('/:id(\\d+)/related', (req, res) => {
  const event = getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  const { events } = listEvents({ category: event.category_slug, limit: 5 });
  const related = events.filter((e) => e.id !== event.id).slice(0, 4);
  if (related.length < 4) {
    const more = listEvents({ limit: 10 }).events.filter(
      (e) => e.id !== event.id && !related.find((r) => r.id === e.id)
    );
    related.push(...more.slice(0, 4 - related.length));
  }
  res.json({ events: related });
});

module.exports = router;
