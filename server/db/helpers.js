/**
 * Shared data-access helpers used by the route modules.
 */
const db = require('./index');

const USER_PUBLIC = `u.id, u.name, u.username, u.email, u.bio, u.location, u.avatar_url, u.cover_url, u.created_at`;

function getUserById(id) {
  return db.prepare(`SELECT ${USER_PUBLIC} FROM users u WHERE u.id = ?`).get(id);
}

function getUserByUsername(username) {
  return db.prepare(`SELECT ${USER_PUBLIC} FROM users u WHERE u.username = ?`).get(String(username).toLowerCase());
}

function getUserByEmail(email) {
  return db.prepare(`SELECT * FROM users WHERE email = ?`).get(String(email).toLowerCase());
}

function getUserWithPassword(email) {
  return db.prepare(`SELECT * FROM users WHERE email = ? OR username = ?`)
    .get(String(email).toLowerCase(), String(email).toLowerCase());
}

function mapEventRow(row) {
  if (!row) return null;
  return {
    ...row,
    tags: row.tags ? String(row.tags).split(',').map((t) => t.trim()).filter(Boolean) : [],
    is_featured: Boolean(row.is_featured),
    price_cents: row.price_cents || 0,
  };
}

const EVENT_SELECT = `
  SELECT e.*, c.name AS category_name, c.slug AS category_slug, c.icon AS category_icon,
         c.gradient AS category_gradient, c.color AS category_color,
         u.name AS host_name, u.username AS host_username, u.avatar_url AS host_avatar,
         (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = 'going') AS going_count,
         (SELECT COUNT(*) FROM rsvps r WHERE r.event_id = e.id AND r.status = 'interested') AS interested_count,
         (SELECT COUNT(*) FROM comments cm WHERE cm.event_id = e.id) AS comment_count
  FROM events e
  JOIN categories c ON c.id = e.category_id
  JOIN users u ON u.id = e.host_id
`;

function getEventById(id) {
  return mapEventRow(db.prepare(`${EVENT_SELECT} WHERE e.id = ?`).get(id));
}

function listEvents({ search = '', category = '', when = '', price = '', sort = 'soon', limit = 24, offset = 0, hostId = null, ids = null, featured = false } = {}) {
  const where = [];
  const params = [];

  if (search) {
    where.push('(e.title LIKE ? OR e.description LIKE ? OR e.tags LIKE ? OR e.city LIKE ? OR e.venue LIKE ?)');
    const q = `%${search}%`;
    params.push(q, q, q, q, q);
  }
  if (category) {
    where.push('c.slug = ?');
    params.push(category);
  }
  if (featured) where.push('e.is_featured = 1');
  if (hostId) {
    where.push('e.host_id = ?');
    params.push(hostId);
  }
  if (ids && ids.length) {
    where.push(`e.id IN (${ids.map(() => '?').join(',')})`);
    params.push(...ids);
  }

  const now = new Date();
  const iso = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
  if (when === 'today') {
    const end = new Date(now); end.setHours(23, 59, 59, 999);
    where.push('e.starts_at >= ? AND e.starts_at <= ?');
    params.push(iso(now), iso(end));
  } else if (when === 'week') {
    const end = new Date(now); end.setDate(end.getDate() + 7);
    where.push('e.starts_at >= ? AND e.starts_at <= ?');
    params.push(iso(now), iso(end));
  } else if (when === 'month') {
    const end = new Date(now); end.setMonth(end.getMonth() + 1);
    where.push('e.starts_at >= ? AND e.starts_at <= ?');
    params.push(iso(now), iso(end));
  } else if (when === 'past') {
    where.push('e.starts_at < ?');
    params.push(iso(now));
  } else {
    // default: upcoming only
    where.push('e.starts_at >= ?');
    params.push(iso(now));
  }

  if (price === 'free') where.push('e.price_cents = 0');
  if (price === 'paid') where.push('e.price_cents > 0');

  let orderBy = 'e.starts_at ASC';
  if (sort === 'new') orderBy = 'e.created_at DESC';
  if (sort === 'popular') orderBy = 'going_count DESC, e.starts_at ASC';
  if (sort === 'price_asc') orderBy = 'e.price_cents ASC, e.starts_at ASC';

  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = db.prepare(`${EVENT_SELECT} ${clause} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);
  const { total } = db.prepare(`SELECT COUNT(*) AS total FROM events e
    JOIN categories c ON c.id = e.category_id
    JOIN users u ON u.id = e.host_id ${clause}`).get(...params);

  // Batch-attach a small attendee preview so cards can show faces
  const events = rows.map(mapEventRow);
  if (events.length) {
    const ids = events.map((e) => e.id);
    const attRows = db.prepare(`
      SELECT r.event_id, u.id, u.name, u.username, u.avatar_url
      FROM rsvps r JOIN users u ON u.id = r.user_id
      WHERE r.status = 'going' AND r.event_id IN (${ids.map(() => '?').join(',')})
      ORDER BY r.created_at DESC
    `).all(...ids);
    const byEvent = new Map();
    for (const row of attRows) {
      if (!byEvent.has(row.event_id)) byEvent.set(row.event_id, []);
      const list = byEvent.get(row.event_id);
      if (list.length < 6) list.push(row);
    }
    for (const e of events) e.attendees = byEvent.get(e.id) || [];
  }
  return { events, total };
}

function attendeePreview(eventId, limit = 6) {
  return db.prepare(`
    SELECT u.id, u.name, u.username, u.avatar_url, r.status
    FROM rsvps r JOIN users u ON u.id = r.user_id
    WHERE r.event_id = ? ORDER BY r.created_at DESC LIMIT ?
  `).all(eventId, limit);
}

function categoryCounts() {
  return db.prepare(`
    SELECT c.*, COUNT(e.id) AS event_count
    FROM categories c LEFT JOIN events e ON e.category_id = c.id
    GROUP BY c.id ORDER BY event_count DESC, c.name ASC
  `).all();
}

function userStats(userId) {
  const events = db.prepare('SELECT COUNT(*) AS n FROM events WHERE host_id = ?').get(userId).n;
  const followers = db.prepare('SELECT COUNT(*) AS n FROM follows WHERE following_id = ?').get(userId).n;
  const following = db.prepare('SELECT COUNT(*) AS n FROM follows WHERE follower_id = ?').get(userId).n;
  const attending = db.prepare("SELECT COUNT(*) AS n FROM rsvps WHERE user_id = ? AND status = 'going'").get(userId).n;
  return { events, followers, following, attending };
}

module.exports = {
  db,
  USER_PUBLIC,
  getUserById,
  getUserByUsername,
  getUserByEmail,
  getUserWithPassword,
  mapEventRow,
  getEventById,
  listEvents,
  attendeePreview,
  categoryCounts,
  userStats,
};
