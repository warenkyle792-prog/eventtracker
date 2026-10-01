/**
 * EventTracker API server — Express + Socket.IO + sql.js
 *
 * Serves the JSON API, uploads, realtime sockets and (in production) the
 * built React client from client/dist.
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { initializeDatabase } = require('./db');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

async function startServer() {
  await initializeDatabase();

  const { attachSockets, createRealtimeSink } = require('./sockets');
  const notifications = require('./services/notifications');

  const io = new Server(server, {
    cors: { origin: true, credentials: true },
  });

  app.set('io', io);
  attachSockets(io);
  notifications.registerRealtime(createRealtimeSink(io));

  app.use(cors({ origin: true, credentials: true }));

  // Keep the raw body for webhook signature verification, then parse JSON.
  app.use(express.json({
    limit: '12mb',
    verify: (req, _res, buf) => {
      if (req.originalUrl.includes('/webhooks/')) req.rawBody = buf.toString('utf8');
    },
  }));
  app.use(express.urlencoded({ extended: true }));

  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  app.use('/uploads', express.static(uploadsDir, {
    maxAge: '7d',
    setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
  }));

  /* ---- API routes ------------------------------------------------ */
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/categories', require('./routes/categories'));
  app.use('/api/events', require('./routes/events'));
  app.use('/api/feed', require('./routes/feed'));
  app.use('/api/conversations', require('./routes/chat'));
  app.use('/api/uploads', require('./routes/uploads'));
  app.use('/api/payments', require('./routes/payments'));
  app.use('/api/tickets', require('./routes/tickets'));
  app.use('/api/promotions', require('./routes/promotions'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/admin', require('./routes/admin'));

  app.get('/api/health', (_req, res) => {
    const payments = require('./services/payments');
    res.json({
      ok: true,
      name: 'EventTracker API',
      time: new Date().toISOString(),
      payment_providers: payments.providerModes(),
    });
  });

  /* ---- Static client (production build) -------------------------- */
  const clientDist = path.join(__dirname, '..', 'client', 'dist');

  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));

    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  /* ---- Errors ---------------------------------------------------- */
  app.use((err, _req, res, _next) => {
    if (err?.message?.includes('Unexpected end of JSON')) {
      return res.status(400).json({ error: 'Malformed request body' });
    }
    if (!err?.status || err.status >= 500) console.error(err);
    res.status(err?.status || 500).json({ error: err?.message || 'Server error' });
  });

  app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

  server.listen(PORT, '0.0.0.0', () => {
    const payments = require('./services/payments');
    const modes = payments.providerModes()
      .map((p) => `${p.label}: ${p.mode}`)
      .join(' · ');

    console.log(`\n  EventTracker API  → http://localhost:${PORT}`);
    console.log(`  Payments          → ${modes}`);
    console.log(fs.existsSync(clientDist)
      ? '  Client            → serving build from client/dist\n'
      : `  Client (Vite dev) → ${CLIENT_URL}\n`);
  });
}

startServer().catch((error) => {
  console.error('\nEventTracker failed to start:\n', error);
  process.exit(1);
});

module.exports = { app, server };
