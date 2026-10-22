// localStorage persistence.
//
// Everything lives under one key as versioned JSON. Every read and write is
// wrapped in try/catch: storage can be disabled, full, or contain data that
// is broken or was edited by hand. In those cases the app falls back to an
// empty state instead of crashing.

import { compactDate, isISODate, todayISO } from './dates.js';

export const STORAGE_KEY = 'detox.v1';
export const SCHEMA_VERSION = 1;

// If stored data cannot be read, the raw text is copied here before the app
// starts from an empty state, so nothing is lost silently.
const BACKUP_KEY = 'detox.v1.corrupt-backup';

export const STATUSES = ['draft', 'active', 'finished', 'abandoned'];
export const RULE_TYPES = ['avoid', 'keep'];
export const FOCUS_PROGRESS = ['yes', 'partly', 'no'];
export const THEMES = ['system', 'light', 'dark'];

let state = null;

// Problem found while loading or saving: null | 'corrupt' | 'unavailable'.
let issue = null;

export function emptyState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    activeChallengeId: null,
    challenges: [],
    settings: { theme: 'system' },
  };
}

/** Reads and validates stored data. Never throws. */
export function load() {
  issue = null;
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    issue = 'unavailable';
    state = emptyState();
    return state;
  }

  if (raw === null) {
    state = emptyState();
    return state;
  }

  try {
    state = normalizeState(migrate(JSON.parse(raw)));
  } catch (err) {
    console.warn('Detox: stored data could not be read, starting fresh.', err);
    issue = 'corrupt';
    try {
      localStorage.setItem(BACKUP_KEY, raw);
    } catch {
      // Nothing more we can do; the original key is left untouched anyway.
    }
    state = emptyState();
  }
  return state;
}

/** Current state (loads it on first use). */
export function getState() {
  return state ?? load();
}

/** Problem found while loading or saving, if any. */
export function getIssue() {
  return issue;
}

export function clearIssue() {
  issue = null;
}

/** Writes the current state. Returns false if storage is not available. */
export function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getState()));
    return true;
  } catch (err) {
    console.warn('Detox: could not save data.', err);
    issue = 'unavailable';
    return false;
  }
}

/**
 * Changes the state and saves it.
 * The mutator receives a copy; if it throws, the state stays unchanged.
 * Returns the result of save().
 */
export function update(mutator) {
  const next = structuredClone(getState());
  mutator(next);
  state = next;
  return save();
}

/** Deletes all app data from this device. */
export function resetAll() {
  state = emptyState();
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(BACKUP_KEY);
    return true;
  } catch {
    issue = 'unavailable';
    return false;
  }
}

// ---------- Selectors ----------

export function getActiveChallenge(s = getState()) {
  return s.challenges.find((c) => c.id === s.activeChallengeId && c.status === 'active') ?? null;
}

export function getDraft(s = getState()) {
  return s.challenges.find((c) => c.status === 'draft') ?? null;
}

export function getChallenge(id, s = getState()) {
  return s.challenges.find((c) => c.id === id) ?? null;
}

// ---------- Ids ----------

function randomSuffix(length = 4) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

/** New challenge id, e.g. "c_20261022_ab12". */
export function createChallengeId(date = todayISO()) {
  return `c_${compactDate(date)}_${randomSuffix()}`;
}

/** Next free rule id within a challenge: "r1", "r2", … */
export function createRuleId(rules) {
  const used = new Set(rules.map((r) => r.id));
  let n = 1;
  while (used.has(`r${n}`)) n += 1;
  return `r${n}`;
}

// ---------- Migration ----------

// Add a function here for each schema change: MIGRATIONS[1] turns a
// version 1 object into version 2, and so on.
const MIGRATIONS = {};

export function migrate(data) {
  if (!isObject(data) || !Number.isInteger(data.schemaVersion)) {
    throw new Error('Missing schemaVersion');
  }
  if (data.schemaVersion > SCHEMA_VERSION) {
    throw new Error(`Data is from a newer version (${data.schemaVersion})`);
  }
  let current = data;
  while (current.schemaVersion < SCHEMA_VERSION) {
    const step = MIGRATIONS[current.schemaVersion];
    if (!step) throw new Error(`No migration from version ${current.schemaVersion}`);
    current = step(current);
  }
  return current;
}

// ---------- Validation ----------

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const str = (value) => (typeof value === 'string' ? value : '');

function normalizeRules(rules) {
  if (!Array.isArray(rules)) return [];
  const seen = new Set();
  const out = [];
  for (const r of rules) {
    if (!isObject(r) || typeof r.id !== 'string' || !r.id || seen.has(r.id)) continue;
    if (!RULE_TYPES.includes(r.type) || typeof r.text !== 'string') continue;
    seen.add(r.id);
    out.push({ id: r.id, type: r.type, text: r.text });
  }
  return out;
}

function normalizeCheckin(c, ruleIds) {
  if (!isObject(c) || !isISODate(c.date)) return null;
  const difficulty = Number.isInteger(c.difficulty) && c.difficulty >= 1 && c.difficulty <= 10
    ? c.difficulty
    : null;
  const rulesKept = {};
  if (isObject(c.rulesKept)) {
    for (const id of ruleIds) {
      if (typeof c.rulesKept[id] === 'boolean') rulesKept[id] = c.rulesKept[id];
    }
  }
  return {
    date: c.date,
    difficulty,
    rulesKept,
    focusProgress: FOCUS_PROGRESS.includes(c.focusProgress) ? c.focusProgress : null,
    note: str(c.note),
  };
}

function normalizeChallenge(c) {
  if (!isObject(c) || typeof c.id !== 'string' || !c.id) return null;
  if (!STATUSES.includes(c.status)) return null;

  const startDate = isISODate(c.startDate) ? c.startDate : null;
  const durationDays = Number.isInteger(c.durationDays) && c.durationDays > 0 ? c.durationDays : null;

  // Only a draft may be incomplete; anything else needs a start and a length.
  if (c.status !== 'draft' && (!startDate || !durationDays)) return null;

  const rules = normalizeRules(c.rules);
  const ruleIds = rules.map((r) => r.id);

  // One check-in per day; if a day appears twice, the later entry wins.
  const byDate = new Map();
  if (Array.isArray(c.checkins)) {
    for (const raw of c.checkins) {
      const checkin = normalizeCheckin(raw, ruleIds);
      if (checkin) byDate.set(checkin.date, checkin);
    }
  }
  const checkins = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));

  return {
    id: c.id,
    createdAt: str(c.createdAt),
    startDate,
    durationDays,
    why: str(c.why),
    focusGoal: str(c.focusGoal),
    rules,
    status: c.status,
    checkins,
  };
}

/**
 * Returns a clean copy of the state with invalid parts dropped.
 * Throws only if the top level is unusable.
 */
export function normalizeState(data) {
  if (!isObject(data) || data.schemaVersion !== SCHEMA_VERSION) {
    throw new Error('Invalid state');
  }

  const seen = new Set();
  const challenges = [];
  let hasDraft = false;
  for (const raw of Array.isArray(data.challenges) ? data.challenges : []) {
    const c = normalizeChallenge(raw);
    if (!c || seen.has(c.id)) continue;
    if (c.status === 'draft') {
      if (hasDraft) continue; // at most one draft
      hasDraft = true;
    }
    seen.add(c.id);
    challenges.push(c);
  }

  // The active id must point to an active challenge. If it does not, fall back
  // to the first active one (or none).
  let activeChallengeId = typeof data.activeChallengeId === 'string' ? data.activeChallengeId : null;
  if (!challenges.some((c) => c.id === activeChallengeId && c.status === 'active')) {
    activeChallengeId = challenges.find((c) => c.status === 'active')?.id ?? null;
  }

  const theme = isObject(data.settings) && THEMES.includes(data.settings.theme)
    ? data.settings.theme
    : 'system';

  return {
    schemaVersion: SCHEMA_VERSION,
    activeChallengeId,
    challenges,
    settings: { theme },
  };
}
