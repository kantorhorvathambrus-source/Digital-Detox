// Local date handling.
//
// Every calendar date in the app is a "YYYY-MM-DD" string in the user's LOCAL
// time zone. Never use toISOString() for dates: it converts to UTC, so a
// check-in made at 00:30 in Budapest would land on the previous day.

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const pad = (n) => String(n).padStart(2, '0');

/** Date object → "YYYY-MM-DD" (local). */
export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Today's local date as "YYYY-MM-DD". */
export function todayISO(now = new Date()) {
  return toISODate(now);
}

/** Current local date-time as "YYYY-MM-DDTHH:MM:SS" (no time zone suffix). */
export function nowLocalISO(now = new Date()) {
  return `${toISODate(now)}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

/** True if the value is a real calendar date in "YYYY-MM-DD" form. */
export function isISODate(value) {
  if (typeof value !== 'string') return false;
  const m = ISO_DATE_RE.exec(value);
  if (!m) return false;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  return toISODate(date) === value;
}

/**
 * "YYYY-MM-DD" → Date at local noon. Noon keeps the date stable across
 * daylight-saving changes when days are added or subtracted.
 */
export function parseISODate(iso) {
  const m = ISO_DATE_RE.exec(iso);
  if (!m) throw new Error(`Invalid date: ${iso}`);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
}

/** Adds (or subtracts, if negative) whole days. */
export function addDays(iso, days) {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Number of days from `from` to `to` (to − from). Same day → 0. */
export function diffDays(from, to) {
  const a = parseISODate(from);
  const b = parseISODate(to);
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / MS_PER_DAY);
}

/** 1-based day number of `today` within a challenge starting on `startDate`. */
export function dayNumber(startDate, today = todayISO()) {
  return diffDays(startDate, today) + 1;
}

/** Last day of a challenge (inclusive). */
export function endDate(startDate, durationDays) {
  return addDays(startDate, durationDays - 1);
}

/** "YYYY-MM-DD" → "YYYYMMDD" (used in ids). */
export function compactDate(iso) {
  return iso.replaceAll('-', '');
}

/** Human-readable Hungarian date, e.g. "október 23., csütörtök". */
export function formatDate(iso, options = { month: 'long', day: 'numeric', weekday: 'long' }) {
  return new Intl.DateTimeFormat('hu-HU', options).format(parseISODate(iso));
}

/** Milliseconds until the next local midnight (plus a small safety margin). */
export function msUntilNextMidnight(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
  return next.getTime() - now.getTime();
}
