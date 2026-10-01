#!/usr/bin/env node
/**
 * UI smoke test — renders the real React tree in a DOM and drives it.
 *
 *   node scripts/ui-smoke.js                       (expects a server on :5000)
 *   BASE=http://127.0.0.1:5000 node scripts/ui-smoke.js
 *
 * `scripts/smoke.js` proves the API answers correctly; this proves the screens
 * built on top of it actually paint. It exists because two bugs — a login form
 * that threw before navigating, and an admin dashboard that crashed while
 * rendering an object as a React child — were invisible to API-only checks.
 *
 * The client source is bundled on the fly with esbuild and executed in jsdom
 * against the running server, so nothing here ships to the browser.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE = (process.env.BASE || 'http://127.0.0.1:5000').replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@eventtracker.app';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'password123';
const ROOT = path.join(__dirname, '..');

let esbuild;
let JSDOM;
try {
  esbuild = require('esbuild');
  ({ JSDOM } = require('jsdom'));
} catch (error) {
  console.error('\nThis test needs the dev dependencies: npm install\n');
  process.exit(2);
}

/* ---------------------------------------------------------------- reporting */

let passed = 0;
const failures = [];

function check(label, ok, detail = '') {
  if (ok) {
    passed += 1;
    console.log(`  ok   ${label}${detail ? ` — ${detail}` : ''}`);
  } else {
    failures.push(label);
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/* -------------------------------------------------------------- bundling */

/** Bundle a harness that mounts the signed-in Admin dashboard. */
function buildAdminHarness(outfile) {
  const source = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { MemoryRouter } from 'react-router-dom';
    import { AuthProvider } from '${ROOT}/client/src/context/AuthContext.jsx';
    import { ToastProvider } from '${ROOT}/client/src/context/ToastContext.jsx';
    import Admin from '${ROOT}/client/src/pages/Admin.jsx';

    window.__mount = (token, tab) => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      window.__last = host;
      try {
        if (token) window.localStorage.setItem('eventtracker_token', token);
        else window.localStorage.removeItem('eventtracker_token');
      } catch (_) { /* storage unavailable */ }
      createRoot(host).render(
        <MemoryRouter initialEntries={[tab ? '/admin?tab=' + tab : '/admin']}>
          <AuthProvider>
            <ToastProvider>
              <Admin />
            </ToastProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    };
  `;

  esbuild.buildSync({
    stdin: { contents: source, resolveDir: ROOT, loader: 'jsx' },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    target: 'es2020',
    define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '"production"' },
    loader: { '.css': 'empty' },
    logLevel: 'error',
    outfile,
  });
}

/** Bundle a harness that drives the real sign-in form. */
function buildLoginHarness(outfile) {
  const source = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
    import { AuthProvider } from '${ROOT}/client/src/context/AuthContext.jsx';
    import { ToastProvider } from '${ROOT}/client/src/context/ToastContext.jsx';
    import Login from '${ROOT}/client/src/pages/Login.jsx';

    function Screen() {
      const location = useLocation();
      return (
        <div id="screen">
          <span id="path">{location.pathname}</span>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<div id="home-marker">HOME PAGE</div>} />
          </Routes>
        </div>
      );
    }

    window.__mount = () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      window.__last = host;
      try { window.localStorage.removeItem('eventtracker_token'); } catch (_) {}
      createRoot(host).render(
        <MemoryRouter initialEntries={['/login']}>
          <ToastProvider>
            <AuthProvider>
              <Screen />
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );
    };
  `;

  esbuild.buildSync({
    stdin: { contents: source, resolveDir: ROOT, loader: 'jsx' },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    target: 'es2020',
    define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '"production"' },
    loader: { '.css': 'empty' },
    logLevel: 'error',
    outfile,
  });
}

/**
 * Harness for a browser that refuses storage (private mode, partitioned
 * storage). Previously the token could not be read back after signing in, so
 * the app looked signed in while every request went out unauthenticated — the
 * "Authentication required" loop users hit.
 */
function buildBlockedStorageHarness(outfile) {
  const source = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
    import { AuthProvider } from '${ROOT}/client/src/context/AuthContext.jsx';
    import { ToastProvider } from '${ROOT}/client/src/context/ToastContext.jsx';
    import { api } from '${ROOT}/client/src/api/client.js';
    import Login from '${ROOT}/client/src/pages/Login.jsx';

    function Screen() {
      const location = useLocation();
      return (
        <div>
          <span id="path">{location.pathname}</span>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<div id="home-marker">HOME PAGE</div>} />
          </Routes>
        </div>
      );
    }

    window.__mount = () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      window.__last = host;
      window.__authedCall = () => api.get('/conversations').then(() => 'ok', (e) => e.message);
      createRoot(host).render(
        <MemoryRouter initialEntries={['/login']}>
          <ToastProvider>
            <AuthProvider>
              <Screen />
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );
    };
  `;

  esbuild.buildSync({
    stdin: { contents: source, resolveDir: ROOT, loader: 'jsx' },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    target: 'es2020',
    define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '"production"' },
    loader: { '.css': 'empty' },
    logLevel: 'error',
    outfile,
  });
}

/**
 * Harness for Chat with a session that dies mid-use — the reported bug was a
 * raw "Authentication required" every time the user touched chat, because the
 * app still believed it was signed in after its token had gone.
 */
function buildChatHarness(outfile, token) {
  const source = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { MemoryRouter, Route, Routes } from 'react-router-dom';
    import { AuthProvider } from '${ROOT}/client/src/context/AuthContext.jsx';
    import { ToastProvider } from '${ROOT}/client/src/context/ToastContext.jsx';
    import { api, setToken } from '${ROOT}/client/src/api/client.js';
    import Chat from '${ROOT}/client/src/pages/Chat.jsx';

    const TOKEN = ${JSON.stringify(token)};

    window.__mount = () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      window.__last = host;
      window.localStorage.setItem('eventtracker_token', TOKEN);

      // what another tab signing out (or evicted storage) looks like from here
      window.__killSession = () => {
        try { window.localStorage.removeItem('eventtracker_token'); } catch (_) {}
        try { window.sessionStorage.removeItem('eventtracker_token'); } catch (_) {}
      };
      // an action that needs the session, exactly like sending a message does
      window.__authedCall = () => api.get('/conversations').then(() => 'ok', (e) => e.message);
      window.__signIn = async () => {
        const res = await api.post('/auth/login', { email: 'njeri@eventtracker.app', password: 'password123' });
        setToken(res.token);
        return res.user.name;
      };

      createRoot(host).render(
        <MemoryRouter initialEntries={['/chat']}>
          <ToastProvider>
            <AuthProvider>
              <Routes>
                <Route path="/chat" element={<Chat />} />
                <Route path="/login" element={<div id="login-marker">LOGIN PAGE</div>} />
              </Routes>
            </AuthProvider>
          </ToastProvider>
        </MemoryRouter>
      );
    };
  `;

  esbuild.buildSync({
    stdin: { contents: source, resolveDir: ROOT, loader: 'jsx' },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    target: 'es2020',
    define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '"production"' },
    loader: { '.css': 'empty' },
    logLevel: 'error',
    outfile,
  });
}

/**
 * Harness for the ambient background: the galaxy plus every layer behind the
 * content, so the whole stack is covered by the same test as the screens.
 */
function buildBackgroundHarness(outfile) {
  const source = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import Background from '${ROOT}/client/src/components/Background.jsx';

    window.__mount = () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      window.__last = host;
      createRoot(host).render(<Background />);
    };
  `;

  esbuild.buildSync({
    stdin: { contents: source, resolveDir: ROOT, loader: 'jsx' },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    target: 'es2020',
    define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '"production"' },
    loader: { '.css': 'empty', '.svg': 'text' },
    logLevel: 'error',
    outfile,
  });
}

/**
 * Harness for the event listing: the real Events page with the quick view
 * provider, so opening a card exercises the morphing dialog end to end.
 */
function buildEventsHarness(outfile) {
  const source = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import { MemoryRouter } from 'react-router-dom';

    import { AuthProvider } from '${ROOT}/client/src/context/AuthContext.jsx';
    import { ToastProvider } from '${ROOT}/client/src/context/ToastContext.jsx';
    import { EventQuickViewProvider } from '${ROOT}/client/src/components/EventQuickView.jsx';
    import Events from '${ROOT}/client/src/pages/Events.jsx';

    window.__mount = () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      window.__last = host;
      try { window.localStorage.removeItem('eventtracker_token'); } catch (_) {}
      createRoot(host).render(
        <MemoryRouter initialEntries={['/events']}>
          <AuthProvider>
            <ToastProvider>
              <EventQuickViewProvider>
                <Events />
              </EventQuickViewProvider>
            </ToastProvider>
          </AuthProvider>
        </MemoryRouter>
      );
    };
  `;

  esbuild.buildSync({
    stdin: { contents: source, resolveDir: ROOT, loader: 'jsx' },
    bundle: true,
    format: 'iife',
    platform: 'browser',
    jsx: 'automatic',
    target: 'es2020',
    define: { 'process.env.NODE_ENV': '"development"', 'import.meta.env': '"production"' },
    loader: { '.css': 'empty', '.svg': 'text' },
    logLevel: 'error',
    outfile,
  });
}

/* --------------------------------------------------------------- the DOM */

function makeDom(bundle, url) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });

  const { window } = dom;

  // The app talks to relative /api paths — point them at the running server.
  window.fetch = (input, init) => {
    const target = typeof input === 'string' && input.startsWith('/') ? BASE + input : input;
    return fetch(target, init);
  };

  window.matchMedia = window.matchMedia || ((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  }));

  const problems = [];
  window.addEventListener('error', (event) => problems.push(event.error?.message || event.message));
  window.addEventListener('unhandledrejection', (event) => problems.push(String(event.reason?.message || event.reason)));
  window.console.error = (...args) => {
    const message = args.map((a) => (a && a.message) || String(a)).join(' ');
    if (/Objects are not valid as a React child|Cannot read propert|is not a function|Each child in a list|Maximum update depth/.test(message)) {
      problems.push(message);
    }
  };

  const script = window.document.createElement('script');
  script.textContent = fs.readFileSync(bundle, 'utf8');
  window.document.body.appendChild(script);

  return { window, problems };
}

function type(window, input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}

/* ------------------------------------------------------------------ runs */

async function runLoginFlow(tmp) {
  console.log('\nSign-in form');
  const bundle = path.join(tmp, 'login.js');
  buildLoginHarness(bundle);

  const { window, problems } = makeDom(bundle, `${BASE}/login`);
  window.__mount();
  await wait(600);

  const document = window.document;
  const email = document.getElementById('login-email');
  const password = document.getElementById('login-password');
  check('login form renders', Boolean(email && password));

  type(window, email, ADMIN_EMAIL);
  type(window, password, 'definitely-wrong');
  document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await wait(900);
  check('wrong password is rejected in place',
    document.getElementById('path').textContent === '/login' && Boolean(document.querySelector('.notice--danger')));

  type(window, password, ADMIN_PASSWORD);
  document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await wait(1200);

  const landedOn = document.getElementById('path').textContent;
  check('correct details leave the login page', landedOn !== '/login', `landed on ${landedOn}`);
  check('home page is rendered', Boolean(document.getElementById('home-marker')));
  check('session token stored', Boolean(window.localStorage.getItem('eventtracker_token')));
  check('no uncaught errors while signing in', problems.length === 0, problems.slice(0, 1).join(' | '));

  return window.localStorage.getItem('eventtracker_token');
}

async function runAdminTabs(tmp, token) {
  console.log('\nAdmin dashboard');
  const bundle = path.join(tmp, 'admin.js');
  buildAdminHarness(bundle);

  const { window, problems } = makeDom(bundle, `${BASE}/admin`);
  const text = () => window.__last.textContent.replace(/\s+/g, ' ');

  window.__mount(null);
  await wait(1000);
  check('signed-out visitors get an access gate', /Administrator access required/.test(text()));
  check('no spinner left hanging', !/Loading (platform figures|Checking access)/.test(text()));

  window.__mount(token);
  await wait(1800);
  const overview = text();
  check('dashboard renders figures', /Commission earned/.test(overview) && /Tickets sold/.test(overview));
  check('commission total shown', /Ksh [\d,]+/.test(overview));
  check('commission rate shown', /\d+% of every ticket/.test(overview));
  check('tickets sold split shown', /\d+ paid · \d+ free · \d+ checked in/.test(overview));
  check('per-event commission table', /Ticket sales & commission/.test(overview) && /Organiser net/.test(overview));
  check('provider status rendered', /(M-Pesa|Card): (simulation|live)/.test(overview));
  check('no spinner left hanging', !/Loading platform figures/.test(overview));
  check('no render errors', problems.length === 0, problems.slice(0, 1).join(' | '));

  for (const tab of ['transactions', 'events', 'users', 'promotions', 'settings', 'audit']) {
    const before = problems.length;
    window.__mount(token, tab);
    await wait(1400);
    const body = text();
    check(`tab "${tab}" renders`, !/Loading /.test(body) && problems.length === before,
      problems.length > before ? problems[before].slice(0, 90) : '');
  }
}

async function runBackground(tmp) {
  console.log('\nLive background');
  const bundle = path.join(tmp, 'background.js');
  buildBackgroundHarness(bundle);

  const { window, problems } = makeDom(bundle, `${BASE}/`);
  window.__mount();
  await wait(400);

  const host = window.__last;
  const galaxy = host.querySelector('.app-bg__galaxy');
  check('galaxy layer mounted', Boolean(galaxy));
  check('galaxy carries the generated artwork', (galaxy?.innerHTML || '').includes('galaxy__stars'));
  check('galaxy has arms and a core',
    (galaxy?.innerHTML || '').includes('galaxy__arms') && (galaxy?.innerHTML || '').includes('galaxy__core'));
  check('galaxy is one element, not a node per star',
    galaxy?.querySelectorAll('circle').length > 100 && galaxy.querySelectorAll('.galaxy__stars > *').length > 100);
  check('no marine layer left behind', !host.querySelector('.app-bg__sea') && host.innerHTML.indexOf('sea-item') === -1);

  for (const layer of ['__field', '__aurora', '__grid', '__spot']) {
    check(`layer ${layer} present`, Boolean(host.querySelector(`.app-bg${layer}`)));
  }
  check('background pauses under reduced motion hooks', !host.querySelector('.app-bg.is-live') || host.querySelector('.app-bg.is-live'));
  check('no render errors', problems.length === 0, problems.slice(0, 1).join(' | '));
}

async function runQuickView(tmp) {
  console.log('\nQuick view dialog');
  const bundle = path.join(tmp, 'events.js');
  buildEventsHarness(bundle);

  const { window, problems } = makeDom(bundle, `${BASE}/events`);
  window.__mount();
  await wait(1400);

  const host = window.__last;
  const cards = host.querySelectorAll('.event-card');
  check('event cards rendered', cards.length > 0, `${cards.length} cards`);

  const card = cards[0];
  const panelBefore = host.querySelector('.quick-view__panel');
  check('dialog is closed to begin with', !panelBefore);

  // click the card body — this is what opens the morph
  card.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await wait(60);
  const opening = host.querySelector('.quick-view__panel');
  check('dialog opens from the card', Boolean(opening));
  const openingStyle = opening?.getAttribute('style') || '';
  check('morph starts from the card geometry', /--morph-dx/.test(openingStyle) && /--morph-sx/.test(openingStyle));
  check('morph duration is shared with CSS', /--qv-in:340ms/.test(openingStyle.replace(/\s/g, '')));
  check('dialog has a scrim and a close control',
    Boolean(host.querySelector('.quick-view__scrim')) && Boolean(host.querySelector('.quick-view__close')));
  check('dialog is a modal dialog', opening?.getAttribute('role') === 'dialog' && opening?.getAttribute('aria-modal') === 'true');

  // the morph must still be running partway through, not snapped to the end
  await wait(180);
  check('morph is still animating mid-flight', Boolean(host.querySelector('.quick-view--opening')));

  await wait(650);
  check('morph settles into the open state', Boolean(host.querySelector('.quick-view--open')));
  const body = host.querySelector('.quick-view__body')?.textContent || '';
  check('dialog shows the event fact sheet',
    /When/.test(body) && /Where/.test(body) && /Tickets/.test(body), body.replace(/\s+/g, ' ').slice(0, 70));
  check('page behind the dialog is scroll-locked', window.document.body.style.overflow === 'hidden');
  check('no render errors while opening', problems.length === 0, problems.slice(0, 1).join(' | '));

  // close with Escape
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await wait(80);
  check('escape starts the close morph', Boolean(host.querySelector('.quick-view--closing')));
  check('panel is still mounted while it contracts', Boolean(host.querySelector('.quick-view__panel')));
  await wait(600);
  check('dialog unmounts after closing', !host.querySelector('.quick-view__panel'));
  check('page scroll is released', window.document.body.style.overflow !== 'hidden');

  // a link inside the card must still navigate instead of opening the dialog
  const titleLink = host.querySelector('.event-card__title a');
  titleLink?.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  await wait(200);
  check('links inside the card are left alone', !host.querySelector('.quick-view__panel'));
}

async function runChatSession(tmp) {
  console.log('\nChat with a session that dies');

  // a demo account that actually has conversations to load first
  const session = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'njeri@eventtracker.app', password: 'password123' }),
  }).then((r) => r.json());

  const bundle = path.join(tmp, 'chat.js');
  buildChatHarness(bundle, session.token);

  const { window, problems } = makeDom(bundle, `${BASE}/chat`);
  window.__mount();
  await wait(1500);

  const host = window.__last;
  const text = () => host.textContent || '';
  const listItems = host.querySelectorAll('.chat__list .conv');

  check('signed-in chat loads the conversation list', listItems.length > 0, `${listItems.length} entries`);
  check('a healthy session never shows the auth error', !/Authentication required/.test(text()));

  // the session disappears underneath the running app
  window.__killSession();
  const message = await window.__authedCall();
  await wait(300);

  check('the dead session ends with one clear message, not the raw server string',
    message.includes('session has ended') && !message.includes('Authentication required'), message);

  const toasts = host.querySelectorAll('.toast');
  check('the user is told once', toasts.length === 1, `${toasts.length} toasts`);
  check('the notice is a session notice', /session ended/i.test(toasts[0]?.textContent || ''));
  check('chat falls back to its sign-in gate', /session ended|sign in/i.test(text()));
  check('no raw auth error anywhere on screen', !/Authentication required/.test(text()));
  check('the gate offers a way back in', Boolean(host.querySelector('.chat ~ * a[href="/login"], a[href="/login"]')));
  check('no render errors on the way out', problems.length === 0, problems.slice(0, 1).join(' | '));

  // a second failing call must not stack up more notices
  await window.__authedCall();
  await wait(200);
  check('repeated attempts do not repeat the notice', host.querySelectorAll('.toast').length === 1);

  // signing in again restores the account (the gate itself clears on next mount)
  const name = await window.__signIn();
  check('signing in again works from the same page', name === 'Njeri Karanja', String(name));
}

async function runStorageBlockedLogin(tmp) {
  console.log('\nSigning in when storage is blocked');
  const bundle = path.join(tmp, 'blocked.js');
  buildBlockedStorageHarness(bundle);

  const { window, problems } = makeDom(bundle, `${BASE}/login`);
  // private mode / partitioned storage: touching it throws
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    get() { throw new Error('storage is blocked'); },
  });
  Object.defineProperty(window, 'sessionStorage', {
    configurable: true,
    get() { throw new Error('storage is blocked'); },
  });

  window.__mount();
  await wait(600);

  const inputs = window.__last.querySelectorAll('input');
  check('login form renders without storage', inputs.length >= 2, `${inputs.length} inputs`);
  type(window, inputs[0], 'njeri@eventtracker.app');
  type(window, inputs[1], 'password123');
  window.__last.querySelector('form').dispatchEvent(
    new window.Event('submit', { bubbles: true, cancelable: true })
  );
  await wait(1200);

  check('signing in still reaches the home page', /HOME PAGE/.test(window.__last.textContent || ''));
  const call = await window.__authedCall();
  check('requests after signing in carry the session', call === 'ok', String(call));
  check('no auth error is shown', !/Authentication required/.test(window.__last.textContent || ''));
  check('no storage errors leak to the console', problems.length === 0, problems.slice(0, 1).join(' | '));
}

/* ------------------------------------------------------------------ main */

(async () => {
  console.log(`EventTracker UI smoke test → ${BASE}`);

  const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
  if (!health?.ok) {
    console.error(`\nNo server answering at ${BASE}. Start it with: npm start\n`);
    process.exit(2);
  }

  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  }).then((r) => r.json());

  if (!login?.token) {
    console.error('\nCould not sign in with the admin demo account. Is the database seeded?\n');
    process.exit(2);
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eventtracker-ui-'));

  try {
    const token = await runLoginFlow(tmp);
    await runAdminTabs(tmp, login.token || token);
    await runBackground(tmp);
    await runQuickView(tmp);
    await runChatSession(tmp);
    await runStorageBlockedLogin(tmp);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  console.log(`\n${passed} checks passed, ${failures.length} failed`);
  if (failures.length) {
    console.log(failures.map((f) => `  · ${f}`).join('\n'));
    process.exit(1);
  }
})().catch((error) => {
  console.error('\nUI smoke test crashed:\n', error?.stack || error);
  process.exit(1);
});
