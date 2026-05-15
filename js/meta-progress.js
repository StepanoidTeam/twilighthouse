// ===== Meta economy: wallet, nights survived, shop unlocks (localStorage) =====
import { BOAT_CARGO_TYPES, LAMP_BURNOUT_TIME } from './config.js';

const STORAGE_KEY = 'lighthouse_meta_v1';

/** @typedef {{ wallet: Record<string, number>, nightsWon: number, unlocks: Record<string, boolean>, achievements: Record<string, number> }} MetaState */

export const UNLOCK_EXTRA_HEART = 'extraHeart';
export const UNLOCK_QUALITY_WICK = 'qualityWick';

export const ACHIEVEMENT_DEFS = [
  {
    id: 'repelled_cops',
    goalKey: 'repelled_cops',
    icon: '🚔',
    titleKey: 'achievements.items.repelled_cops.title',
    descKey: 'achievements.items.repelled_cops.desc',
    target: 500,
  },
  {
    id: 'repelled_kraken',
    goalKey: 'repelled_kraken',
    icon: '🦑',
    titleKey: 'achievements.items.repelled_kraken.title',
    descKey: 'achievements.items.repelled_kraken.desc',
    target: 100,
  },
  {
    id: 'repelled_mermaids',
    goalKey: 'mermaids_scared',
    icon: '🧜',
    titleKey: 'achievements.items.mermaids_scared.title',
    descKey: 'achievements.items.mermaids_scared.desc',
    target: 200,
  },
  {
    id: 'delivered_boats',
    goalKey: 'delivered_boats',
    icon: '📦',
    titleKey: 'achievements.items.delivered_boats.title',
    descKey: 'achievements.items.delivered_boats.desc',
    target: 300,
  },
  {
    id: 'nights_won',
    goalKey: 'nightsWon',
    icon: '🌅',
    titleKey: 'achievements.items.nights_won.title',
    descKey: 'achievements.items.nights_won.desc',
    target: 50,
  },
];

const BASE_HEARTS_MAX = 5;
const HEARTS_WITH_BONUS = 6;
const LAMP_BURNOUT_BONUS_MULT = 1.25;

let lastCommittedRunStart = null;

function emptyWallet() {
  return Object.fromEntries(BOAT_CARGO_TYPES.map((k) => [k, 0]));
}

function emptyAchievements() {
  return Object.fromEntries(ACHIEVEMENT_DEFS.map((def) => [def.goalKey, 0]));
}

/** @returns {MetaState} */
function defaultMeta() {
  return {
    wallet: emptyWallet(),
    nightsWon: 0,
    unlocks: {},
    achievements: emptyAchievements(),
  };
}

/** @returns {MetaState} */
export function loadMeta() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultMeta();
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return defaultMeta();
    const wallet = { ...emptyWallet(), ...(data.wallet || {}) };
    for (const k of BOAT_CARGO_TYPES) {
      const n = Number(wallet[k]);
      wallet[k] = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
    }
    const nightsWon = Math.max(0, Math.floor(Number(data.nightsWon)) || 0);
    const unlocks =
      data.unlocks && typeof data.unlocks === 'object'
        ? { ...data.unlocks }
        : {};
    const achievements = emptyAchievements();
    if (data.achievements && typeof data.achievements === 'object') {
      for (const def of ACHIEVEMENT_DEFS) {
        const n = Number(data.achievements[def.goalKey]);
        achievements[def.goalKey] =
          Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
      }
    }
    return { wallet, nightsWon, unlocks, achievements };
  } catch (_) {
    return defaultMeta();
  }
}

/** @param {MetaState} meta */
export function saveMeta(meta) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
  } catch (e) {
    console.warn('saveMeta failed', e);
  }
}

/**
 * @param {Record<string, number>} price
 * @param {MetaState} meta
 */
export function canAfford(price, meta) {
  for (const [emoji, need] of Object.entries(price)) {
    const n = Math.max(0, Math.floor(Number(need)) || 0);
    if (n <= 0) continue;
    if ((meta.wallet[emoji] || 0) < n) return false;
  }
  return true;
}

export const SHOP_ITEMS = [
  {
    id: 'extra_heart',
    unlockKey: UNLOCK_EXTRA_HEART,
    once: true,
    price: { '📦': 4, '⚙️': 6, '🥃': 2 },
  },
  {
    id: 'quality_wick',
    unlockKey: UNLOCK_QUALITY_WICK,
    once: true,
    price: { '💡': 5, '🛢️': 5, '🧨': 2 },
  },
];

/**
 * @param {Record<string, number>} price
 * @param {MetaState} meta
 */
function subtractPrice(price, meta) {
  for (const [emoji, need] of Object.entries(price)) {
    const n = Math.max(0, Math.floor(Number(need)) || 0);
    if (n <= 0) continue;
    meta.wallet[emoji] = Math.max(0, (meta.wallet[emoji] || 0) - n);
  }
}

/** @param {import('./state.js').default} S */
export function commitRunToMeta(S) {
  if (!S.gameSessionActive) return;
  const runId = S.runStartTime;
  if (lastCommittedRunStart === runId) return;
  lastCommittedRunStart = runId;

  const meta = loadMeta();
  for (const type of BOAT_CARGO_TYPES) {
    const add = Math.max(0, Math.floor(S.deliveredCargo[type] || 0));
    if (add) meta.wallet[type] = (meta.wallet[type] || 0) + add;
  }
  if (S.gameWon) {
    meta.nightsWon += 1;
    if (!meta.achievements) meta.achievements = emptyAchievements();
    meta.achievements['nightsWon'] = (meta.achievements['nightsWon'] || 0) + 1;
  }
  saveMeta(meta);
}

/**
 * @param {string} goalKey
 * @param {number} [amount=1]
 */
export function recordAchievementProgress(goalKey, amount = 1) {
  if (!goalKey) return;
  const step = Math.max(0, Math.floor(Number(amount)) || 0);
  if (!step) return;

  const meta = loadMeta();
  if (!meta.achievements || typeof meta.achievements !== 'object') {
    meta.achievements = emptyAchievements();
  }
  if (!Object.prototype.hasOwnProperty.call(meta.achievements, goalKey)) {
    meta.achievements[goalKey] = 0;
  }
  meta.achievements[goalKey] += step;
  saveMeta(meta);
}

/**
 * @returns {Record<string, number>}
 */
export function loadAchievementProgress() {
  const meta = loadMeta();
  return { ...emptyAchievements(), ...(meta.achievements || {}) };
}

/**
 * @param {string} itemId
 * @returns {{ ok: true } | { ok: false, reason: 'owned' | 'cantAfford' | 'unknown' }}
 */
export function tryBuy(itemId) {
  const def = SHOP_ITEMS.find((x) => x.id === itemId);
  if (!def) return { ok: false, reason: 'unknown' };

  const meta = loadMeta();
  if (def.once && meta.unlocks[def.unlockKey]) {
    return { ok: false, reason: 'owned' };
  }
  if (!canAfford(def.price, meta)) {
    return { ok: false, reason: 'cantAfford' };
  }

  subtractPrice(def.price, meta);
  meta.unlocks[def.unlockKey] = true;
  saveMeta(meta);
  return { ok: true };
}

/**
 * @param {import('./state.js').default} S
 */
export function applyMetaToRunState(S) {
  const meta = loadMeta();
  S.heartsMax = meta.unlocks[UNLOCK_EXTRA_HEART]
    ? HEARTS_WITH_BONUS
    : BASE_HEARTS_MAX;
  S.lampBurnoutMs = meta.unlocks[UNLOCK_QUALITY_WICK]
    ? Math.round(LAMP_BURNOUT_TIME * LAMP_BURNOUT_BONUS_MULT)
    : LAMP_BURNOUT_TIME;
  S.heartsRemaining = S.heartsMax;
}
