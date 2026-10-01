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
 * Bundle a harness that mounts the marine layer on its own, so the ambience is
 * covered by the same test as the screens it sits behind.
 */
function buildMarineHarness(outfile) {
  const source = `
    import React from 'react';
    import { createRoot } from 'react-dom/client';
    import MarineLife from '${ROOT}/client/src/components/MarineLife.jsx';

    window.__mount = () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      window.__last = host;
      createRoot(host).render(<MarineLife />);
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

async function runMarineLayer(tmp) {
  console.log('\nLive background');
  const bundle = path.join(tmp, 'marine.js');
  buildMarineHarness(bundle);

  const { window, problems } = makeDom(bundle, `${BASE}/`);
  window.__mount();
  await wait(400);

  const host = window.__last;
  const all = (selector) => host.querySelectorAll(selector);
  const sea = all('.app-bg__sea');
  check('sea layer mounted', sea.length === 1);

  const species = [
    ['sea-item--fish', 5, 'reef fish'],
    ['sea-item--ray', 2, 'manta rays'],
    ['sea-item--turtle', 1, 'sea turtle'],
    ['sea-item--jelly', 2, 'jellyfish'],
    ['sea-item--school', 1, 'school'],
  ];
  for (const [className, expected, label] of species) {
    const found = all(`.${className}`).length;
    check(`${expected} × ${label}`, found === expected, `found ${found}`);
  }

  check('eight fish in the school', all('.sea-school__fish').length === 8);
  check('eight bubble strands', all('.sea-bubble').length === 8);

  const tinted = [...species.map(([c]) => c), 'sea-bubble']
    .filter((className) => all(`.${className}`).length > 0).length;
  check('every species is tinted', tinted === 6, `${tinted}/6`);

  const vars = host.querySelector('.sea-item')?.getAttribute('style') || '';
  check('each swimmer carries its own lane and speed', /--lane:/.test(vars) && /--dur:/.test(vars) && /--o:/.test(vars));
  check('no render errors', problems.length === 0, problems.slice(0, 1).join(' | '));
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
    await runMarineLayer(tmp);
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
