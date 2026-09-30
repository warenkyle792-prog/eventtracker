# ✦ EventTracker

**A modern, glassmorphism event discovery & social platform.**
Find extraordinary events, meet the people behind them, RSVP in one tap, and keep the
conversation going — with live chat, rich profiles, and a premium glassy UI that works
beautifully in both light and dark themes.

![](https://img.shields.io/badge/stack-React%20%2B%20Express%20%2B%20SQLite-7c5cff) ![](https://img.shields.io/badge/ui-glassmorphism-00d4ff) ![](https://img.shields.io/badge/realtime-Socket.IO-ff5c8a)

---

## ✨ Features

| Area | What’s inside |
|---|---|
| **Authentication** | JWT sign-up / sign-in, bcrypt-hashed passwords, persistent sessions |
| **Event creation** | Full create/edit form with live preview card, cover upload (or URL), tags, pricing, capacity |
| **Event discovery** | Search, category filters, date & price filters, sorting, pagination |
| **Event details** | Hero cover, RSVP (going / interested), save, share, capacity meter, comments, related events |
| **Categories** | 8 curated categories with live event counts and dedicated colour gradients |
| **Event feed** | Personalised feed — hosts you follow, trending, upcoming & featured blocks |
| **Chat** | Real-time 1:1 and event-group messaging (Socket.IO), typing indicators, presence, REST fallback |
| **User profiles** | Stats, follow/unfollow, hosting / attending / saved tabs, profile editor with avatar upload |
| **Navigation** | Frosted-glass sticky navbar, mobile drawer, bottom tab bar on mobile |
| **Theming** | Working light/dark switcher — both themes are dark, glassy, and fully readable |
| **Responsive** | Fluid layouts from 320px phones to wide desktops |

> **Design language:** glass cards, frosted-glass navigation, rounded corners, soft shadows,
> subtle borders, smooth hover lifts and transitions, gradient accents, roomy spacing.

---

## 🧰 Tech stack

- **Frontend** — React 18, React Router 6, Vite 5, lucide-react icons, socket.io-client
- **Backend** — Node.js 18+, Express 4, Socket.IO 4
- **Database** — SQLite via better-sqlite3 (zero config, single file)
- **Auth** — JSON Web Tokens (`jsonwebtoken`) + `bcryptjs`
- **Uploads** — Multer (event covers & avatars stored in `server/uploads`)

---

## 🚀 Quick start

### Prerequisites

- **Node.js ≥ 18** (check with `node -v`)
- **npm ≥ 9** (ships with Node)

### 1. Install dependencies

```bash
npm install
```

> This installs the root (API) and the `client/` workspace in one command.

### 2. Seed the demo database

```bash
npm run seed
```

Creates `server/data/eventtracker.db` with 8 categories, 8 demo hosts, 20 events,
RSVPs, comments, follows and chat threads — plus generated SVG cover art & avatars.

### 3. Run in development

```bash
npm run dev
```

| Service | URL |
|---|---|
| **App (Vite)** | http://localhost:5173 |
| **API + Socket.IO** | http://localhost:5000 |

Vite proxies `/api`, `/uploads` and `/socket.io` to the backend automatically.

### 4. Production mode (optional)

```bash
npm run build     # builds the React client into client/dist
npm start         # Express serves API + client on http://localhost:5000
```

### Demo accounts

Any of these — password for all: **`password123`**

```
amara@eventtracker.app    daniel@eventtracker.app   mei@eventtracker.app
sofia@eventtracker.app    kwame@eventtracker.app    elena@eventtracker.app
james@eventtracker.app    zara@eventtracker.app
```

(You can also sign up with a brand-new account.)

---

## ⚙️ Configuration

Copy `.env.example` to `.env` (optional — sensible defaults are built in):

```bash
cp .env.example .env
```

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `5000` | API / production server port |
| `CLIENT_URL` | `http://localhost:5173` | Vite dev-server URL (CORS hint) |
| `JWT_SECRET` | dev fallback | **Change in production** — signs auth tokens |

---

## 📁 Project structure

```
eventtracker/
├── .vscode/                 # VS Code workspace settings & extensions
├── .env.example             # Environment template
├── .gitignore
├── package.json             # Root scripts + API dependencies (npm workspaces)
├── README.md
├── server/                  # ── Backend ─────────────────────────────
│   ├── index.js             # Express app + Socket.IO bootstrap
│   ├── sockets.js           # Realtime chat / presence handlers
│   ├── seed.js              # Demo data + generated SVG artwork
│   ├── db/
│   │   ├── index.js         # SQLite connection + schema
│   │   └── helpers.js       # Shared data-access helpers
│   ├── middleware/
│   │   └── auth.js          # JWT sign / verify middleware
│   ├── routes/
│   │   ├── auth.js          # register · login · me
│   │   ├── users.js         # profiles · follow · directory search
│   │   ├── categories.js    # categories + counts
│   │   ├── events.js        # CRUD · RSVP · save · comments · related
│   │   ├── feed.js          # personalised discovery feed
│   │   ├── chat.js          # conversations & messages (REST)
│   │   └── uploads.js       # image uploads (covers / avatars)
│   ├── data/                # SQLite database (created by `npm run seed`)
│   └── uploads/             # covers/ · avatars/ (seeded SVGs + user uploads)
└── client/                  # ── Frontend (Vite + React) ─────────────
    ├── index.html           # App shell + web fonts
    ├── vite.config.js       # Dev server + API proxy
    ├── public/              # favicon
    └── src/
        ├── main.jsx         # React entry + providers
        ├── App.jsx          # Routes & layout
        ├── api/client.js    # fetch wrapper + token storage
        ├── context/         # Theme · Auth · Toast contexts
        ├── components/      # Navbar · MobileNav · Footer · EventCard · UI kit
        ├── pages/           # Discover · Events · EventDetails · CreateEvent
        │                    # Profile · Chat · Login · Register · NotFound
        ├── styles/          # theme.css (tokens) · app.css (glass design system)
        └── utils/format.js  # date / price formatting
```

---

## 🎨 Theming notes

Both themes intentionally use **dark backgrounds** (glassmorphism requirement):

- **Light (`data-theme="light"`)** — deep midnight base with luminous glass panels,
  brighter borders and colourful aurora glows.
- **Dark (`data-theme="dark"`)** — even deeper near-black base with subtle, glassy
  surfaces and gentler borders.

The switcher lives in the navbar (`☾ Night` / `☀ Lumos`); the choice is persisted to
`localStorage`. All colours are CSS variables in `client/src/styles/theme.css`.

---

## 🧪 Handy scripts

| Command | Description |
|---|---|
| `npm run dev` | Start API (5000) + Vite client (5173) together |
| `npm run dev:server` | API only |
| `npm run dev:client` | Vite client only |
| `npm run build` | Production build of the React client |
| `npm start` | Production server (serves API + `client/dist`) |
| `npm run seed` | Seed the database (skips if data exists) |
| `npm run reset-db` | **Wipe** the database and re-seed |

---

## 🔌 API overview

```
POST   /api/auth/register            POST   /api/events
POST   /api/auth/login               PUT    /api/events/:id
GET    /api/auth/me                  DELETE /api/events/:id

GET    /api/events                   POST   /api/events/:id/rsvp
GET    /api/events/featured          POST   /api/events/:id/save
GET    /api/events/:id               GET    /api/events/:id/comments
GET    /api/events/:id/related       POST   /api/events/:id/comments

GET    /api/categories               GET    /api/feed
GET    /api/categories/:slug

GET    /api/users?q=                 GET    /api/users/:username
GET    /api/users/me                 GET    /api/users/:username/events
PUT    /api/users/me                 POST   /api/users/:username/follow

GET    /api/conversations            GET    /api/conversations/:id/messages
POST   /api/conversations            POST   /api/conversations/:id/messages

POST   /api/uploads?kind=cover|avatar    GET /api/health
```

**Socket.IO events** — `conversation:join/leave`, `message:send` → `message:new`,
`typing:start/stop`, `presence:update` (authenticated via the JWT in `socket.handshake.auth.token`).

---

## 🧹 Troubleshooting

| Issue | Fix |
|---|---|
| `better-sqlite3` build errors | Make sure Node ≥ 18; then `rm -rf node_modules && npm install` |
| Port 5000 already in use | `PORT=5001 npm run dev:server` (update `client/vite.config.js` proxy) |
| Blank page after `npm run build` | Run `npm start` (not `npm run dev`) so Express serves `client/dist` |
| Want a fresh demo | `npm run reset-db` |
| Chat not connecting | Both apps must run together (`npm run dev`), token must be valid |

---

Made with ✦ — glassy nights, bright events.
