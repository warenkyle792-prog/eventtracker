/**
 * EventTracker — SQLite database layer using sql.js
 * Node 24 compatible. No native C++ compilation required.
 */

require('dotenv').config({
  path: require('path').join(__dirname, '..', '..', '.env')
});

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'eventtracker.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let database = null;

function saveDatabase() {
  if (!database) return;

  const data = database.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

function normalizeParams(params) {
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0];
  }

  return params;
}

function createStatement(sql) {
  return {
    get(...args) {
      const params = normalizeParams(args);
      const stmt = database.prepare(sql);

      try {
        stmt.bind(params);

        if (!stmt.step()) {
          return undefined;
        }

        return stmt.getAsObject();
      } finally {
        stmt.free();
      }
    },

    all(...args) {
      const params = normalizeParams(args);
      const stmt = database.prepare(sql);
      const rows = [];

      try {
        stmt.bind(params);

        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }

        return rows;
      } finally {
        stmt.free();
      }
    },

    run(...args) {
      const params = normalizeParams(args);
      const stmt = database.prepare(sql);

      try {
        stmt.bind(params);
        stmt.step();
      } finally {
        stmt.free();
      }

      saveDatabase();

      let lastInsertRowid = 0;

      try {
        const result = database.exec(
          'SELECT last_insert_rowid() AS id'
        );

        if (
          result.length &&
          result[0].values.length
        ) {
          lastInsertRowid = Number(result[0].values[0][0]);
        }
      } catch (_) {
        lastInsertRowid = 0;
      }

      return {
        changes: database.getRowsModified(),
        lastInsertRowid
      };
    }
  };
}

const db = {
  prepare(sql) {
    if (!database) {
      throw new Error(
        'Database is not initialized. Call initializeDatabase() first.'
      );
    }

    return createStatement(sql);
  },

  exec(sql) {
    if (!database) {
      throw new Error(
        'Database is not initialized. Call initializeDatabase() first.'
      );
    }

    const result = database.exec(sql);
    saveDatabase();
    return result;
  },

  pragma() {
    return undefined;
  }
};

async function initializeDatabase() {
  if (database) {
    return db;
  }

  const SQL = await initSqlJs({
    locateFile: (file) =>
      path.join(
        __dirname,
        '..',
        '..',
        'node_modules',
        'sql.js',
        'dist',
        file
      )
  });

  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE);
    database = new SQL.Database(buffer);
  } else {
    database = new SQL.Database();
  }

  database.run('PRAGMA foreign_keys = ON');

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      bio TEXT DEFAULT '',
      location TEXT DEFAULT '',
      avatar_url TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      icon TEXT DEFAULT 'sparkles',
      color TEXT DEFAULT '#7c5cff',
      gradient TEXT DEFAULT 'linear-gradient(135deg,#7c5cff,#00d4ff)'
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      tagline TEXT DEFAULT '',
      description TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      host_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      venue TEXT DEFAULT '',
      city TEXT DEFAULT '',
      country TEXT DEFAULT '',
      starts_at TEXT NOT NULL,
      ends_at TEXT DEFAULT '',
      price_cents INTEGER DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      capacity INTEGER DEFAULT 0,
      image_url TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      is_featured INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS rsvps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'going',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE (event_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS saves (
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (event_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS follows (
      follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (follower_id, following_id)
    );

    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'dm',
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      title TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS conversation_participants (
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (conversation_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_events_category
      ON events(category_id);

    CREATE INDEX IF NOT EXISTS idx_events_host
      ON events(host_id);

    CREATE INDEX IF NOT EXISTS idx_events_starts
      ON events(starts_at);

    CREATE INDEX IF NOT EXISTS idx_rsvps_event
      ON rsvps(event_id);

    CREATE INDEX IF NOT EXISTS idx_rsvps_user
      ON rsvps(user_id);

    CREATE INDEX IF NOT EXISTS idx_comments_event
      ON comments(event_id);

    CREATE INDEX IF NOT EXISTS idx_messages_conv
      ON messages(conversation_id);

    CREATE INDEX IF NOT EXISTS idx_follows_following
      ON follows(following_id);
  `);

  saveDatabase();

  return db;
}

module.exports = db;
module.exports.initializeDatabase = initializeDatabase;
module.exports.saveDatabase = saveDatabase;