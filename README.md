# EventTracker

An event discovery and management platform: browse and filter events, follow and
save them, buy tickets with M-Pesa or card, check attendees in at the door, chat
with organisers, promote listings and run the whole thing from an admin console.

Everything ships in one repository — a React client, an Express API, a SQLite
database and a bundled demo dataset (cover artwork included, no external assets).

---

## Highlights

**Discovery**
- Home page with a search bar, featured/sponsored spotlight, popular categories
  and an upcoming-events rail ordered by date
- Discover page with search, category, date range, location, price and
  free/paid filters, sort options, active-filter chips and pagination
- Events index with quick date chips (today, tomorrow, weekend, this week) and a
  list/grid layout toggle
- Category pages, related events, map links, share and save/follow

**Event management**
- Four-step create/edit form (details → date & location → tickets → media) with
  a live preview before publishing, single or multi-tier ticketing, capacity,
  currency and contact details
- Cover image upload **or camera capture**, optional feature video, profile
  pictures and banners
- Organiser tools on the event page: guest list, check-in stats, edit, cancel
  and delete

**Payments**
- Dedicated payment service layer (`server/services/payments`) with providers
  for **M-Pesa (Daraja STK push)**, **cards (Stripe PaymentIntent)** and free
  registration; adding another provider means implementing one interface
- Server-side cart pricing: totals are always recalculated on the backend, with
  stock and per-user limits enforced before an intent is created
- Idempotent intent creation, provider verification, webhook/callback handling
  and a polling endpoint for the client
- Platform commission: a configurable service fee (5% by default, editable in
  Admin → Settings) is charged on the ticket subtotal, shown in the checkout
  summary before payment, and stored on the transaction as `fee_cents` so
  commission is a ledger figure rather than something calculated after the fact
- Statuses: `pending`, `processing`, `successful`, `failed`, `cancelled`,
  `refunded`. Every transaction stores reference, user, event, amount, fee,
  currency, method, status, provider reference and timestamps
- No provider secret ever reaches the browser, and a payment is never treated as
  successful because the client said so

**Tickets**
- A ticket is issued **only** after the payment is confirmed successful, and is
  idempotent per transaction
- Each ticket carries a unique code (`ET-XXXX-XXXX`) and a QR code signed with
  HMAC-SHA256, plus ticket type, attendee, event, payment status and check-in
  state
- `/verify` checks tickets in from the camera (`BarcodeDetector` where
  available) with a typed-code fallback for USB scanners; one check-in per
  ticket, organiser-only

**Promotions**
- Three placements — featured listing, boosted ranking and sponsored placement —
  each with a fixed price shown before payment
- A promotion is created as `pending` and only becomes `active` when the linked
  payment is confirmed by the payment service
- Impression/click counters and campaign reporting for organisers and admins

**Social**
- Follow events and people, save events, comment on events, notify
- Real-time chat: direct messages and per-event group chats over Socket.IO
  (typing indicators, presence, REST fallback)

**Administration**
- Overview dashboard: commission earned, tickets sold (paid vs free), gross
  revenue, promotion revenue, a per-event commission table with the organiser's
  net, 14-day volume chart, payment-method split, best-performing events and
  provider modes
- Transactions with filters, a commission column and total, detail drawer
  (including the commission kept and the organiser's net), provider re-check and
  refunds
- Event feature/cancel/delete, user role management, campaign control,
  commerce settings and an audit log of privileged actions

**Interface**
- Live ambient background: a drifting colour wash, three soft light sources, a
  slowly turning aurora ribbon, a panning grid, a slow spotlight that follows the
  pointer, and marine life drifting across the water — reef fish including a
  small school, manta rays whose wings beat, a paddling sea turtle, jellyfish
  pulsing with trailing tentacles and rising bubbles. Each creature travels on
  its own lane, speed and depth. The layer pauses when the tab is hidden, turns
  still with the creatures hidden under `prefers-reduced-motion`, and keeps only
  the near, sharper creatures on small screens
- Real light and dark themes — clean white/light grey in light mode, true
  neutral black in dark mode (no blue cast) — with a switcher in the navbar
- A deliberately blue-free palette: warm copper accent over hue-free greys,
  with green/amber/red reserved for status
- Responsive from 320 px phones to wide desktops: desktop navigation with an
  account menu, a glass bottom bar on phones, single-pane chat and stacked
  detail/checkout layouts
- Camera access is requested only when a capture button is pressed and is never
  disabled by responsive rules

---

## Stack

| Layer | Choice |
|---|---|
| Client | React 18, React Router 6, Vite 5, lucide-react, socket.io-client |
| Server | Node 18+, Express 4, Socket.IO 4 |
| Database | SQLite through `sql.js` (single file, no native build step) |
| Auth | JWT + bcrypt password hashing |
| Uploads | Multer, stored under `server/uploads` |
| QR codes | `qrcode` on the server, signed payloads verified on check-in |

---

## Getting started

```bash
npm install          # installs the API and the client workspace
npm run seed         # writes the demo database + artwork (skips if data exists)
npm run dev          # API on :5000 and Vite on :5173
```

Open http://localhost:5173.

For a production-style run:

```bash
npm run build        # builds the client into client/dist
npm start            # API + built client on http://localhost:5000
```

`npm run reset-db` wipes and re-seeds the database.

### Tests

```bash
npm run test:api     # 144 API checks against a running server (seeds data, so reset afterwards)
npm run test:ui      # renders the real React tree in jsdom and drives it
```

`test:api` covers the endpoints; `test:ui` covers the screens — it signs in
through the actual login form, checks that a wrong password is refused in place
and a correct one lands on the home page, then renders the admin dashboard and
every admin tab against live data. Bugs like a form that threw before it could
navigate, or a dashboard that crashed rendering an object as a React child, only
show up in a real render.

Both expect a server on `http://127.0.0.1:5000`; override with `BASE=`.

### Demo accounts

All accounts use the password `password123`.

| Account | Role |
|---|---|
| `admin@eventtracker.app` | platform administrator |
| `daniel@eventtracker.app`, `zawadi@eventtracker.app`, `kamau@eventtracker.app`, `fatuma@eventtracker.app`, `lucia@eventtracker.app` | organisers |
| `njeri@eventtracker.app`, `brian@eventtracker.app`, `wanjiku@eventtracker.app`, `omar@eventtracker.app` | attendees |

The seed creates 8 categories, 10 members, 20 events (18 upcoming, 2 past), real
ticket tiers, 30 transactions with mixed statuses, issued and checked-in
tickets, running promotions, comments, follows and a few conversations.

### Payments without credentials

With no provider keys set, M-Pesa and card run in **sandbox mode**: the intent is
created and stays `pending`, and the payment screen offers Approve / Decline
buttons that call `POST /api/payments/:reference/simulate`. That endpoint is
disabled automatically once real credentials are configured. Nothing is ever
charged in sandbox mode.

Copy `.env.example` to `.env` to set `JWT_SECRET`, `TICKET_SECRET`, the M-Pesa
Daraja keys and the Stripe keys.

---

## Project layout

```
server/
  index.js               Express app, Socket.IO, static uploads, SPA fallback
  db/                    sql.js connection, schema and query helpers
  middleware/            JWT authentication
  routes/                auth, users, categories, events, feed, tickets,
                         payments, promotions, notifications, admin, uploads, chat
  services/              payments (index + mpesa/card providers + money),
                         tickets, promotions, notifications
  sockets.js             realtime: presence, chat, ticket and payment events
  seed.js                demo dataset and generated SVG artwork
  uploads/               covers, avatars, videos, misc
client/
  src/components/        Navbar, MobileNav, EventCard, TicketCard, CameraCapture,
                         MediaUploader, Payments, UI, Background, MarineLife
  src/context/           Theme, Auth, Toast, Notification providers
  src/hooks/             media queries, async helper, event search state
  src/pages/             Home, Discover, Events, EventDetails, CreateEvent,
                         Checkout, Categories, Tickets, TicketDetail, Verify,
                         Promotions, Profile, Chat, Notifications, Admin, auth
  src/styles/            theme tokens + application stylesheet
```

---

## API sketch

```
POST   /api/auth/register | login | logout      GET /api/auth/me
GET    /api/feed                                GET /api/events?search&category&when&…
GET    /api/events/:id                          POST /api/events
POST   /api/events/:id/register                 GET  /api/events/:id/attendees
POST   /api/events/:id/follow | save | rsvp      GET  /api/events/:id/comments
GET    /api/payments/methods | quote | :ref      POST /api/payments/intents
POST   /api/payments/:ref/simulate | cancel      POST /api/payments/mpesa/callback
GET    /api/tickets | /api/tickets/:code         POST /api/tickets/verify
GET    /api/promotions/plans | mine              POST /api/promotions
GET    /api/conversations | :id/messages          POST /api/conversations
GET    /api/notifications                        POST /api/notifications/read
GET    /api/admin/overview | transactions | events | users | promotions | audit
```

---

## License

MIT.
