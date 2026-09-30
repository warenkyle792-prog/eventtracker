/** Date / price formatting helpers. */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function parseDate(value) {
  if (!value) return null;
  // SQLite datetime('now') is UTC "YYYY-MM-DD HH:MM:SS" — treat bare values as local
  const str = String(value).includes('T') ? value : String(value).replace(' ', 'T');
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(value, opts = {}) {
  const d = parseDate(value);
  if (!d) return '';
  const base = `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
  if (opts.year) return `${base}, ${d.getFullYear()}`;
  return base;
}

export function formatShortDate(value) {
  const d = parseDate(value);
  if (!d) return '';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function formatTime(value) {
  const d = parseDate(value);
  if (!d) return '';
  let h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function formatDateTime(value) {
  return `${formatDate(value)} · ${formatTime(value)}`;
}

export function timeAgo(value) {
  const d = parseDate(value);
  if (!d) return '';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  return formatShortDate(value);
}

export function relativeDay(value) {
  const d = parseDate(value);
  if (!d) return '';
  const now = new Date();
  const dayMs = 86400000;
  const a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((a - b) / dayMs);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1 && days < 7) return `In ${days} days`;
  if (days < -1 && days > -7) return `${Math.abs(days)} days ago`;
  return formatDate(value);
}

export function formatPrice(cents, currency = 'USD') {
  if (!cents) return 'Free';
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : `${currency} `;
  const value = cents / 100;
  return `${symbol}${Number.isInteger(value) ? value : value.toFixed(2)}`;
}

export function monthDay(value) {
  const d = parseDate(value);
  if (!d) return { mon: '', day: '' };
  return { mon: MONTHS[d.getMonth()].toUpperCase(), day: d.getDate() };
}

export function initials(name = '') {
  return name.split(' ').map((w) => w[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();
}

export function timeLabel(value) {
  const d = parseDate(value);
  if (!d) return '';
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return formatTime(value);
  const diff = (now - d) / 1000;
  if (diff < 7 * 86400) return timeAgo(value);
  return formatShortDate(value);
}
