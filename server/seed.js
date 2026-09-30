/**
 * EventTracker seed — creates demo categories, users, events, follows,
 * RSVPs, comments and chat threads. Generated SVG covers/avatars are
 * written to server/uploads so the app looks alive with zero external assets.
 *
 *   npm run seed          # seeds a fresh database
 *   npm run reset-db      # wipes the database and re-seeds
 */
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'eventtracker.db');

if (process.argv.includes('--reset')) {
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(DB_FILE + suffix, { force: true });
  console.log('✔ Database wiped.');
}

const db = require('./db');

const existing = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
if (existing > 0) {
  console.log('Database already contains data. Use "npm run reset-db" to wipe and re-seed.');
  process.exit(0);
}

/* ------------------------------------------------------------------ */
/* SVG asset generators                                                */
/* ------------------------------------------------------------------ */
const UPLOADS = path.join(__dirname, 'uploads');
const COVERS = path.join(UPLOADS, 'covers');
const AVATARS = path.join(UPLOADS, 'avatars');
for (const dir of [UPLOADS, COVERS, AVATARS]) fs.mkdirSync(dir, { recursive: true });

function coverSVG(colors, label) {
  const [c1, c2, c3] = colors;
  const safeLabel = String(label).toUpperCase().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/><stop offset="55%" stop-color="${c2}"/><stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="60"/></filter>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.55"/><stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <ellipse cx="920" cy="120" rx="380" ry="260" fill="#ffffff" opacity="0.16" filter="url(#blur)"/>
  <ellipse cx="180" cy="560" rx="420" ry="300" fill="#000000" opacity="0.22" filter="url(#blur)"/>
  <circle cx="860" cy="480" r="190" fill="url(#glow)" opacity="0.75"/>
  <g fill="none" stroke="#ffffff" stroke-opacity="0.20">
    <circle cx="240" cy="180" r="120" stroke-width="1.5"/>
    <circle cx="240" cy="180" r="84" stroke-width="1.5"/>
    <circle cx="1020" cy="250" r="46" stroke-width="1.5"/>
    <path d="M0 520 Q 300 430 600 520 T 1200 520" stroke-width="2"/>
    <path d="M0 560 Q 300 470 600 560 T 1200 560" stroke-width="1.2"/>
  </g>
  <g opacity="0.28" fill="#ffffff">
    <circle cx="420" cy="120" r="6"/><circle cx="520" cy="330" r="4"/><circle cx="180" cy="380" r="5"/>
    <circle cx="760" cy="90" r="4"/><circle cx="1120" cy="540" r="6"/><circle cx="640" cy="620" r="4"/>
    <circle cx="330" cy="640" r="3"/><circle cx="980" cy="140" r="3"/>
  </g>
  <text x="64" y="612" font-family="Georgia, 'Times New Roman', serif" font-size="34" fill="#ffffff" opacity="0.85" letter-spacing="6">${safeLabel}</text>
</svg>`;
}

function avatarSVG(colors, initials) {
  const [c1, c2] = colors;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="240" height="240" fill="url(#g)"/>
  <circle cx="190" cy="40" r="90" fill="#ffffff" opacity="0.14"/>
  <circle cx="30" cy="210" r="80" fill="#000000" opacity="0.14"/>
  <text x="120" y="152" font-family="'Segoe UI', Arial, sans-serif" font-size="84" font-weight="700"
        fill="#ffffff" text-anchor="middle" opacity="0.92">${initials}</text>
</svg>`;
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */
const categories = [
  { name: 'Music', slug: 'music', icon: 'music', color: '#7c5cff', gradient: 'linear-gradient(135deg,#7c5cff,#c86dd7)', colors: ['#4f2ec9', '#7c5cff', '#c86dd7'], description: 'Concerts, festivals, DJ sets and live sessions' },
  { name: 'Tech', slug: 'tech', icon: 'cpu', color: '#00d4ff', gradient: 'linear-gradient(135deg,#00d4ff,#3f7ef7)', colors: ['#0a2a5e', '#00a8e8', '#3f7ef7'], description: 'Hackathons, demos, AI nights and dev meetups' },
  { name: 'Arts & Culture', slug: 'arts', icon: 'palette', color: '#ff5c8a', gradient: 'linear-gradient(135deg,#ff5c8a,#ff9d6c)', colors: ['#8e2149', '#ff5c8a', '#ff9d6c'], description: 'Galleries, theatre, film screenings and poetry' },
  { name: 'Food & Drink', slug: 'food', icon: 'utensils', color: '#ffa94d', gradient: 'linear-gradient(135deg,#ff922b,#ffd43b)', colors: ['#b3540a', '#ff922b', '#ffd43b'], description: 'Tastings, pop-ups, supper clubs and markets' },
  { name: 'Sports & Fitness', slug: 'sports', icon: 'dumbbell', color: '#38d9a9', gradient: 'linear-gradient(135deg,#12b886,#38d9a9)', colors: ['#0b6b4f', '#12b886', '#63e6be'], description: 'Runs, tournaments, yoga flows and watch parties' },
  { name: 'Business', slug: 'business', icon: 'briefcase', color: '#4dabf7', gradient: 'linear-gradient(135deg,#3b5bdb,#4dabf7)', colors: ['#22317a', '#3b5bdb', '#74c0fc'], description: 'Networking, startup pitches and leadership summits' },
  { name: 'Wellness', slug: 'wellness', icon: 'heart', color: '#f783ac', gradient: 'linear-gradient(135deg,#e64980,#f783ac)', colors: ['#8c2a55', '#e64980', '#fcc2d7'], description: 'Mindfulness, retreats, breathwork and sound baths' },
  { name: 'Community', slug: 'community', icon: 'users', color: '#69db7c', gradient: 'linear-gradient(135deg,#2f9e44,#69db7c)', colors: ['#1d5c2c', '#2f9e44', '#b2f2bb'], description: 'Meetups, volunteer days, markets and causes' },
];

const catId = {};
{
  const insert = db.prepare('INSERT INTO categories (name, slug, description, icon, color, gradient) VALUES (?, ?, ?, ?, ?, ?)');
  for (const c of categories) {
    const info = insert.run(c.name, c.slug, c.description, c.icon, c.color, c.gradient);
    catId[c.slug] = info.lastInsertRowid;
  }
}
console.log(`✔ ${categories.length} categories`);

/* ------------------------------------------------------------------ */
/* Users                                                               */
/* ------------------------------------------------------------------ */
const people = [
  { name: 'Amara Okafor', username: 'amara', email: 'amara@eventtracker.app', bio: 'Community builder & festival curator. Bringing people together one event at a time.', location: 'Nairobi, KE', colors: ['#7c5cff', '#00d4ff'] },
  { name: 'Daniel Reyes', username: 'daniel', email: 'daniel@eventtracker.app', bio: 'Indie music promoter. Vinyl collector. Sound engineer by night.', location: 'London, UK', colors: ['#ff5c8a', '#ff9d6c'] },
  { name: 'Mei Lin', username: 'mei', email: 'mei@eventtracker.app', bio: 'AI researcher and hackathon organizer. I love demos with lasers.', location: 'Singapore, SG', colors: ['#00d4ff', '#3f7ef7'] },
  { name: 'Sofia Bianchi', username: 'sofia', email: 'sofia@eventtracker.app', bio: 'Chef & supper-club host. Pasta is a personality trait.', location: 'Milan, IT', colors: ['#ff922b', '#ffd43b'] },
  { name: 'Kwame Mensah', username: 'kwame', email: 'kwame@eventtracker.app', bio: 'Marathon runner, coach, and sunrise yoga evangelist.', location: 'Accra, GH', colors: ['#12b886', '#63e6be'] },
  { name: 'Elena Petrova', username: 'elena', email: 'elena@eventtracker.app', bio: 'Gallery director. Contemporary art, strong coffee, longer conversations.', location: 'Berlin, DE', colors: ['#e64980', '#fcc2d7'] },
  { name: 'James Carter', username: 'james', email: 'james@eventtracker.app', bio: 'Startup founder. Networking is my cardio.', location: 'San Francisco, US', colors: ['#3b5bdb', '#74c0fc'] },
  { name: 'Zara Hassan', username: 'zara', email: 'zara@eventtracker.app', bio: 'Mindfulness teacher & sound-healing facilitator. Breathe in, glow out.', location: 'Dubai, AE', colors: ['#9c36b5', '#e599f7'] },
];
const passwordHash = bcrypt.hashSync('password123', 10);
const userId = {};
{
  const insert = db.prepare('INSERT INTO users (name, username, email, password_hash, bio, location, avatar_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  people.forEach((p, i) => {
    const initials = p.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    const file = `avatar-${p.username}.svg`;
    fs.writeFileSync(path.join(AVATARS, file), avatarSVG(p.colors, initials));
    const joined = new Date(Date.now() - (120 + i * 47) * 86400000).toISOString().slice(0, 19).replace('T', ' ');
    const info = insert.run(p.name, p.username, p.email, passwordHash, p.bio, p.location, `/uploads/avatars/${file}`, joined);
    userId[p.username] = info.lastInsertRowid;
  });
}
console.log(`✔ ${people.length} users   (demo password: password123)`);

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */
function at(dayOffset, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

const events = [
  {
    title: 'Neon Nights: Open-Air Electronic Festival', tagline: 'Three stages under the stars',
    host: 'daniel', category: 'music', featured: 1, price: 45, capacity: 2000, city: 'London', country: 'UK',
    venue: 'Victoria Park', starts: at(5, 16), ends: at(6, 2), tags: 'festival,electronic,dj,open-air',
    description: 'Neon Nights returns for its fifth year with three stages, twenty DJs and a laser installation that turns the park into a living canvas. Expect deep house at sunset, techno after midnight, and a food village that stays open until the last beat.\n\nBring a jacket, comfortable shoes, and your best people. VIP tickets include a raised viewing deck and a private bar.',
  },
  {
    title: 'AI Builders Hackathon — Agents Edition', tagline: '48 hours. One prompt. Infinite agents.',
    host: 'mei', category: 'tech', featured: 1, price: 0, capacity: 240, city: 'Singapore', country: 'SG',
    venue: 'Launchpad Marina', starts: at(3, 9), ends: at(4, 18), tags: 'hackathon,ai,agents,builders',
    description: 'A weekend-long build sprint for engineers, designers and founders working on agentic products. Teams of up to five, mentorship from labs engineers, and a demo night with $25k in credits and prizes.\n\nMeals, coffee and questionable amounts of snacks provided. Bring a laptop and one wild idea.',
  },
  {
    title: 'Sunrise Run & Rooftop Yoga', tagline: '5K with a view',
    host: 'kwame', category: 'sports', featured: 0, price: 10, capacity: 80, city: 'Accra', country: 'GH',
    venue: 'Osu Waterfront', starts: at(2, 6), ends: at(2, 8), tags: 'running,yoga,sunrise,wellness',
    description: 'Start the weekend with a gentle 5K along the waterfront, followed by a 45-minute rooftop yoga flow as the sun comes up. All paces welcome — we run together and finish together.\n\nYour ticket includes a cold-press juice and a mat if you need one.',
  },
  {
    title: 'Anatomy of Taste: Seven-Course Supper Club', tagline: 'A dinner told in chapters',
    host: 'sofia', category: 'food', featured: 1, price: 85, capacity: 32, city: 'Milan', country: 'IT',
    venue: 'Casa Verde', starts: at(7, 19, 30), ends: at(7, 23), tags: 'supper-club,tasting,chefs-table',
    description: 'An intimate seven-course tasting menu exploring the tension between memory and invention. Each course arrives with a short story and a paired natural wine.\n\nSeats are limited to 32 guests at one shared table. Dietary requirements can be accommodated with 72 hours notice.',
  },
  {
    title: 'Modern Voices: Contemporary Art After Dark', tagline: 'The gallery stays open late',
    host: 'elena', category: 'arts', featured: 1, price: 18, capacity: 300, city: 'Berlin', country: 'DE',
    venue: 'Halle Neue Meister', starts: at(9, 18), ends: at(9, 23), tags: 'art,gallery,exhibition,live-music',
    description: 'A late-night opening for our autumn exhibition featuring twelve emerging artists working at the edge of sculpture, light and sound. Live ambient sets, an artist talk at 20:30, and a bar that takes its negronis as seriously as its art.\n\nTicket includes exhibition entry all month.',
  },
  {
    title: 'Founders & Friends: Rooftop Networking Mixer', tagline: 'Raise a glass, not a pitch deck',
    host: 'james', category: 'business', featured: 0, price: 15, capacity: 150, city: 'San Francisco', country: 'US',
    venue: 'Skyline Loft', starts: at(4, 18), ends: at(4, 21), tags: 'networking,startups,founders',
    description: 'The friendliest room in the city for founders, operators and investors. No keynotes, no badges — just great conversations, a skyline view, and an intro wall that actually works.\n\nFirst drink on us. Come alone, leave with three new collaborators.',
  },
  {
    title: 'Sound Bath & Breathwork Journey', tagline: 'Ninety minutes of deep rest',
    host: 'zara', category: 'wellness', featured: 0, price: 25, capacity: 60, city: 'Dubai', country: 'AE',
    venue: 'The Glow Studio', starts: at(6, 19), ends: at(6, 20, 30), tags: 'sound-bath,breathwork,mindfulness',
    description: 'Lie down, tune out, and let a symphony of crystal bowls and chimes reset your nervous system. The session opens with twenty minutes of guided breathwork and closes with warm tea and quiet conversation.\n\nWear something comfortable. Mats, bolsters and blankets are provided.',
  },
  {
    title: 'Community Mural Day', tagline: 'Paint the block together',
    host: 'amara', category: 'community', featured: 0, price: 0, capacity: 120, city: 'Nairobi', country: 'KE',
    venue: 'Riverbank Community Centre', starts: at(11, 10), ends: at(11, 16), tags: 'volunteer,mural,art,community',
    description: 'Join local artists and neighbours to paint a 30-metre mural celebrating the neighbourhood’s history. No experience needed — there is a job for every pair of hands, from sketching to filling to lunch duty.\n\nPaint, brushes, gloves and lunch provided. Wear clothes you do not love.',
  },
  {
    title: 'Jazz Under the Trees', tagline: 'An evening of standards and originals',
    host: 'daniel', category: 'music', featured: 0, price: 22, capacity: 180, city: 'London', country: 'UK',
    venue: 'Hampstead Bandstand', starts: at(13, 19), ends: at(13, 22), tags: 'jazz,live,acoustic',
    description: 'A quartet, a bandstand, and the best acoustic natural reverb in the city. The set moves from Coltrane standards to originals written this summer — bring a blanket and settle in as the light fades.\n\nHot chocolate and mulled cider at the kiosk.',
  },
  {
    title: 'Designing for Trust: Product Salon', tagline: 'Small room, big questions',
    host: 'mei', category: 'tech', featured: 0, price: 12, capacity: 60, city: 'Singapore', country: 'SG',
    venue: 'Studio 88', starts: at(8, 18, 30), ends: at(8, 21), tags: 'design,product,salon',
    description: 'An off-record salon for product designers and engineers working on trust, safety and AI interfaces. Short talks, longer discussions, Chatham House rules.\n\nApply to attend — we keep the room small on purpose.',
  },
  {
    title: 'Natural Wine & Vinyl Night', tagline: 'Low-intervention pours, high-fidelity grooves',
    host: 'sofia', category: 'food', featured: 0, price: 30, capacity: 70, city: 'Milan', country: 'IT',
    venue: 'Enoteca Solare', starts: at(10, 20), ends: at(10, 23, 30), tags: 'wine,music,vinyl',
    description: 'Five natural wines, five records, one very good room. Each pour is introduced by the winemaker (on record, she is in Paris), and guests are invited to bring their own vinyl for the final hour.\n\nTicket includes all five tastings and a cheese board.',
  },
  {
    title: 'Women in Leadership Summit', tagline: 'Strategy, courage, and the next chapter',
    host: 'james', category: 'business', featured: 1, price: 120, capacity: 400, city: 'San Francisco', country: 'US',
    venue: 'Moscone West', starts: at(16, 9), ends: at(16, 17), tags: 'leadership,conference,networking',
    description: 'A one-day summit for women shaping the future of technology, finance and public life. Keynotes, tactical workshops, and structured networking that respects your time.\n\nIncludes lunch, a coaching circle signup, and the after-hours reception.',
  },
  {
    title: 'Poetry & Espresso: Open Mic', tagline: 'Three minutes, one microphone',
    host: 'elena', category: 'arts', featured: 0, price: 5, capacity: 50, city: 'Berlin', country: 'DE',
    venue: 'Café Lumen', starts: at(12, 19), ends: at(12, 22), tags: 'poetry,open-mic,literature',
    description: 'A warm, unhurried open mic for poets, storytellers and first-timers. Sign up on the night for a three-minute slot, or just come to listen — the room is famously kind.\n\nEspresso and cake included with entry.',
  },
  {
    title: 'Coastal Half-Marathon Watch Party', tagline: 'Cheer loud, brunch after',
    host: 'kwame', category: 'sports', featured: 0, price: 0, capacity: 100, city: 'Accra', country: 'GH',
    venue: 'Labadi Beach Hotel', starts: at(15, 7), ends: at(15, 12), tags: 'running,watch-party,brunch',
    description: 'We take over the best cheer point on the course with drums, signs and cold towels for every runner who passes. Afterwards: a long table brunch with fresh fruit and too many photos.\n\nFree to attend — register so we know how many chairs to steal.',
  },
  {
    title: 'Full Moon Sound Journey', tagline: 'Gongs, flutes and ocean air',
    host: 'zara', category: 'wellness', featured: 0, price: 20, capacity: 80, city: 'Dubai', country: 'AE',
    venue: 'Desert Rose Camp', starts: at(18, 20), ends: at(18, 22), tags: 'sound-healing,full-moon,meditation',
    description: 'A monthly ritual: a slow walk into the dunes, a circle around the fire, and ninety minutes of immersive sound as the moon rises. Perfect for anyone who needs to be reminded how quiet the world can be.\n\nTransport from the city is available as an add-on.',
  },
  {
    title: 'Neighbourhood Harvest Market', tagline: 'Growers, makers, and one excellent pie stall',
    host: 'amara', category: 'community', featured: 0, price: 0, capacity: 500, city: 'Nairobi', country: 'KE',
    venue: 'Karura Grounds', starts: at(17, 9), ends: at(17, 15), tags: 'market,food,local,family',
    description: 'Our seasonal market brings together forty local growers, bakers and makers. Live acoustic music all day, a kids’ craft corner, and a pie competition judged by whoever shows up first.\n\nFree entry. Bring cash and a tote bag.',
  },
  {
    title: 'Synth Lab: Modular Workshop', tagline: 'Patch cables encouraged',
    host: 'daniel', category: 'music', featured: 0, price: 35, capacity: 40, city: 'London', country: 'UK',
    venue: 'Dalston Sound Rooms', starts: at(20, 18), ends: at(20, 21), tags: 'synths,workshop,electronic',
    description: 'A hands-on introduction to modular synthesis. We start with the physics of oscillators and end with everyone patching a generative sequence on a wall-sized system. No experience necessary.\n\nIncludes a printed patch-book to take home.',
  },
  {
    title: 'Frontend Futures Meetup', tagline: 'The web platform is the product',
    host: 'mei', category: 'tech', featured: 0, price: 0, capacity: 120, city: 'Singapore', country: 'SG',
    venue: 'Pixel Tower, Level 12', starts: at(22, 19), ends: at(22, 21, 30), tags: 'frontend,web,meetup',
    description: 'Three talks on the state of the web platform: view transitions, local-first architectures, and design systems that survive contact with reality. Pizza and hallway track included.\n\nTalks are recorded (speakers opt in) and shared with attendees.',
  },
  {
    title: 'Midnight Kitchen: Late-Night Dumpling Party', tagline: 'Fold, steam, feast',
    host: 'sofia', category: 'food', featured: 0, price: 28, capacity: 45, city: 'Milan', country: 'IT',
    venue: 'Casa Verde', starts: at(24, 21), ends: at(24, 23, 59), tags: 'dumplings,workshop,late-night',
    description: 'A hands-on dumpling workshop for night owls. Learn three folds, master a ginger-scallion filling, and eat everything you make with a glass of something cold and sparkling.\n\nVegetarian and vegan fillings available.',
  },
  {
    title: 'Screening: Restored Classics — 35mm Night', tagline: 'Grain, glow, and no subtitles',
    host: 'elena', category: 'arts', featured: 0, price: 14, capacity: 200, city: 'Berlin', country: 'DE',
    venue: 'Kino Babylon', starts: at(26, 20), ends: at(26, 23), tags: 'film,cinema,35mm',
    description: 'A double bill of newly restored 35mm prints, introduced by a film historian and followed by a foyer discussion. The bar stays open between films; the popcorn is made the old-fashioned way.\n\nSeating is unallocated — arrive early for the best view.',
  },
];

const eventIds = [];
{
  const insert = db.prepare(`
    INSERT INTO events (title, tagline, description, category_id, host_id, venue, city, country,
                        starts_at, ends_at, price_cents, currency, capacity, image_url, tags, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?)
  `);
  events.forEach((e, i) => {
    const cat = categories.find((c) => c.slug === e.category);
    const file = `cover-${i + 1}-${e.category}.svg`;
    fs.writeFileSync(path.join(COVERS, file), coverSVG(cat.colors, cat.name));
    const info = insert.run(
      e.title, e.tagline, e.description, catId[e.category], userId[e.host],
      e.venue, e.city, e.country, e.starts, e.ends, Math.round(e.price * 100),
      e.capacity, `/uploads/covers/${file}`, e.tags, e.featured
    );
    eventIds.push(info.lastInsertRowid);
  });
}
console.log(`✔ ${events.length} events`);

/* ------------------------------------------------------------------ */
/* Social graph & engagement                                           */
/* ------------------------------------------------------------------ */
const follows = [
  ['amara', 'daniel'], ['amara', 'mei'], ['amara', 'sofia'], ['amara', 'kwame'],
  ['daniel', 'amara'], ['daniel', 'elena'], ['mei', 'amara'], ['mei', 'james'],
  ['sofia', 'amara'], ['sofia', 'elena'], ['kwame', 'amara'], ['kwame', 'zara'],
  ['elena', 'sofia'], ['elena', 'daniel'], ['james', 'mei'], ['james', 'amara'],
  ['zara', 'kwame'], ['zara', 'amara'],
];
{
  const insert = db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)');
  for (const [a, b] of follows) insert.run(userId[a], userId[b]);
}

const rsvps = [
  [0, 'daniel', 'going'], [0, 'mei', 'going'], [0, 'sofia', 'interested'], [0, 'elena', 'going'],
  [0, 'james', 'going'], [0, 'zara', 'interested'], [0, 'kwame', 'going'],
  [1, 'amara', 'going'], [1, 'james', 'going'], [1, 'sofia', 'going'], [1, 'kwame', 'interested'],
  [2, 'amara', 'going'], [2, 'zara', 'going'], [2, 'elena', 'interested'],
  [3, 'elena', 'going'], [3, 'daniel', 'going'], [3, 'amara', 'going'],
  [4, 'sofia', 'going'], [4, 'amara', 'interested'], [4, 'daniel', 'going'], [4, 'mei', 'going'],
  [5, 'mei', 'going'], [5, 'amara', 'going'],
  [6, 'kwame', 'going'], [6, 'amara', 'going'], [6, 'sofia', 'interested'],
  [7, 'elena', 'going'], [7, 'sofia', 'going'], [7, 'james', 'going'], [7, 'zara', 'going'],
  [8, 'amara', 'going'], [8, 'sofia', 'going'], [8, 'elena', 'going'],
  [9, 'daniel', 'interested'], [9, 'amara', 'going'],
  [10, 'amara', 'going'], [10, 'elena', 'going'], [10, 'zara', 'going'],
  [11, 'zara', 'going'], [11, 'elena', 'going'], [11, 'amara', 'going'], [11, 'mei', 'interested'],
  [12, 'mei', 'going'], [12, 'amara', 'interested'],
  [13, 'zara', 'going'], [13, 'kwame', 'going'],
  [14, 'daniel', 'going'], [14, 'kwame', 'going'], [14, 'james', 'going'],
  [15, 'sofia', 'going'], [15, 'amara', 'going'], [15, 'kwame', 'going'], [15, 'elena', 'interested'],
  [16, 'mei', 'going'], [16, 'james', 'going'],
  [17, 'amara', 'going'], [17, 'james', 'interested'],
  [18, 'elena', 'going'], [18, 'sofia', 'going'], [18, 'daniel', 'going'],
  [19, 'sofia', 'going'], [19, 'amara', 'going'], [19, 'zara', 'going'],
];
{
  const insert = db.prepare("INSERT OR IGNORE INTO rsvps (event_id, user_id, status) VALUES (?, ?, ?)");
  for (const [idx, who, status] of rsvps) insert.run(eventIds[idx], userId[who], status);
}

{
  const insert = db.prepare('INSERT OR IGNORE INTO saves (event_id, user_id) VALUES (?, ?)');
  insert.run(eventIds[0], userId.amara); insert.run(eventIds[4], userId.amara);
  insert.run(eventIds[11], userId.zara); insert.run(eventIds[1], userId.james);
  insert.run(eventIds[8], userId.mei); insert.run(eventIds[3], userId.elena);
}

const comments = [
  [0, 'mei', 'The lineup is unreal. Who else is going for the sunrise set?'],
  [0, 'elena', 'Went last year — the light installation alone is worth the ticket.'],
  [0, 'kwame', 'Bringing the running crew. See you at stage two!'],
  [1, 'amara', 'Signed up with my team. Are hardware hacks allowed this year?'],
  [1, 'james', 'Mentoring on Saturday afternoon — come say hi.'],
  [2, 'zara', 'Perfect way to start a Saturday. The rooftop view is magic.'],
  [3, 'daniel', 'Best meal I had all year. The third course broke my brain.'],
  [3, 'elena', 'Booked for two. Please tell me the wine pairing includes the orange one.'],
  [4, 'amara', 'This exhibition is stunning — the sound room especially.'],
  [4, 'sofia', 'Adding to my calendar. Meet at the bar after the artist talk?'],
  [5, 'mei', 'The intro wall at the last one actually worked. Made two hires from it.'],
  [7, 'elena', 'Volunteered last season — genuinely the best day of the year.'],
  [7, 'sofia', 'Coming with my kitchen team. We will feed everyone.'],
  [8, 'amara', 'The bandstand is such a good shout. Bringing blankets.'],
  [11, 'zara', 'The coaching circles changed how I lead. Highly recommend.'],
  [14, 'kwame', 'The full moon walk is worth it for the silence alone.'],
  [15, 'amara', 'Pie competition judge here. I take this role seriously.'],
  [18, 'mei', '35mm forever. The grain is the point!'],
];
{
  const insert = db.prepare('INSERT INTO comments (event_id, user_id, body, created_at) VALUES (?, ?, ?, ?)');
  comments.forEach(([idx, who, body], i) => {
    const t = new Date(Date.now() - (i * 5 + 2) * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    insert.run(eventIds[idx], userId[who], body, t);
  });
}
console.log(`✔ follows, RSVPs, saves & comments`);

/* ------------------------------------------------------------------ */
/* Chat threads                                                        */
/* ------------------------------------------------------------------ */
function makeDm(a, b, messages) {
  const info = db.prepare("INSERT INTO conversations (type) VALUES ('dm')").run();
  const convId = info.lastInsertRowid;
  const add = db.prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)');
  add.run(convId, userId[a]); add.run(convId, userId[b]);
  const msg = db.prepare('INSERT INTO messages (conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?)');
  let hoursAgo = messages.length * 3 + 6;
  for (const [who, body] of messages) {
    const t = new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    msg.run(convId, userId[who], body, t);
    hoursAgo -= 3;
  }
  return convId;
}

function makeEventChat(eventIdx, messages) {
  const info = db.prepare("INSERT INTO conversations (type, event_id, title) VALUES ('event', ?, ?)").run(
    eventIds[eventIdx], events[eventIdx].title
  );
  const convId = info.lastInsertRowid;
  const add = db.prepare('INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?)');
  const msg = db.prepare('INSERT INTO messages (conversation_id, sender_id, body, created_at) VALUES (?, ?, ?, ?)');
  let hoursAgo = messages.length * 2 + 4;
  const seen = new Set();
  for (const [who, body] of messages) {
    if (!seen.has(who)) { add.run(convId, userId[who]); seen.add(who); }
    const t = new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    msg.run(convId, userId[who], body, t);
    hoursAgo -= 2;
  }
  return convId;
}

makeDm('amara', 'daniel', [
  ['daniel', 'Hey! Are you bringing the crew to Neon Nights on Friday?'],
  ['amara', 'Would not miss it. Twelve of us so far — can we get the group rate?'],
  ['daniel', 'Done. I will send you a code tonight. Stage two at 21:00, do not be late.'],
  ['amara', 'Perfect. Also — want to co-host the community market next month?'],
]);
makeDm('amara', 'mei', [
  ['mei', 'Thanks for the intro to the Launchpad team, they loved the market idea!'],
  ['amara', 'Amazing. Want to demo at the community day?'],
  ['mei', 'Yes! I will bring the agent demo. Thursday works for me.'],
]);
makeDm('sofia', 'elena', [
  ['elena', 'The supper club was extraordinary. Still thinking about the second course.'],
  ['sofia', 'You are sweet. Should we do a collab dinner with the gallery?'],
  ['elena', 'Yes — dinner + exhibition preview. Let us talk Friday.'],
]);
makeDm('kwame', 'zara', [
  ['zara', 'Thank you for the sunrise session, I slept better than I have in months.'],
  ['kwame', 'That is what we like to hear. Same time next week?'],
]);
makeEventChat(0, [
  ['daniel', 'Welcome everyone! Doors at 16:00 on Friday.'],
  ['mei', 'Quick question — are we allowed to bring a small backpack?'],
  ['daniel', 'Yes, small bags are fine. There is a free cloakroom by gate B.'],
  ['elena', 'Who is up for the sunrise set on stage three?'],
  ['kwame', 'In. Setting an alarm and everything.'],
  ['amara', 'Count the whole community crew in.'],
]);
makeEventChat(1, [
  ['mei', 'Hackathon kick-off is 09:00 sharp. Team formation starts at 09:30.'],
  ['james', 'Bringing the API sandboxes. Also there will be stickers.'],
  ['amara', 'Our team is looking for a designer — please find me at breakfast!'],
]);
console.log(`✔ chat conversations`);

console.log('\n🌱 Seed complete.');
console.log('   Demo accounts: amara@eventtracker.app … zara@eventtracker.app');
console.log('   Password for all: password123\n');
