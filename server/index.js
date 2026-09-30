/**
 * EventTracker API server — Express + Socket.IO + sql.js
 * Node 24 compatible.
 */

require('dotenv').config();

const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const db = require('./db');
const { initializeDatabase } = require('./db');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL =
  process.env.CLIENT_URL || 'http://localhost:5173';

async function startServer() {
  await initializeDatabase();

  const { attachSockets } = require('./sockets');

  const io = new Server(server, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  app.set('io', io);

  attachSockets(io);

  app.use(
    cors({
      origin: true,
      credentials: true
    })
  );

  app.use(
    express.json({
      limit: '2mb'
    })
  );

  const uploadsDir = path.join(__dirname, 'uploads');

  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, {
      recursive: true
    });
  }

  app.use(
    '/uploads',
    express.static(uploadsDir)
  );

  app.use(
    '/api/auth',
    require('./routes/auth')
  );

  app.use(
    '/api/users',
    require('./routes/users')
  );

  app.use(
    '/api/categories',
    require('./routes/categories')
  );

  app.use(
    '/api/events',
    require('./routes/events')
  );

  app.use(
    '/api/feed',
    require('./routes/feed')
  );

  app.use(
    '/api/conversations',
    require('./routes/chat')
  );

  app.use(
    '/api/uploads',
    require('./routes/uploads')
  );

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      name: 'EventTracker API',
      time: new Date().toISOString()
    });
  });

  const clientDist = path.join(
    __dirname,
    '..',
    'client',
    'dist'
  );

  if (fs.existsSync(clientDist)) {
    app.use(
      express.static(clientDist)
    );

    app.get('*', (req, res, next) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/uploads') ||
        req.path.startsWith('/socket.io')
      ) {
        return next();
      }

      res.sendFile(
        path.join(
          clientDist,
          'index.html'
        )
      );
    });
  }

  app.use(
    (err, _req, res, _next) => {
      console.error(err);

      res.status(err.status || 500).json({
        error:
          err.message ||
          'Server error'
      });
    }
  );

  server.listen(PORT, () => {
    console.log(
      `\n  ✦ EventTracker API → http://localhost:${PORT}`
    );

    console.log(
      `  ✦ Socket.IO → attached`
    );

    if (!fs.existsSync(clientDist)) {
      console.log(
        `  ✦ Client (Vite dev) → ${CLIENT_URL} [run "npm run dev"]\n`
      );
    } else {
      console.log(
        `  ✦ Serving client build from client/dist\n`
      );
    }
  });
}

startServer().catch((error) => {
  console.error(
    '\nEventTracker failed to start:\n',
    error
  );

  process.exit(1);
});

module.exports = {
  app,
  server
};