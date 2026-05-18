// ===== Meta economy: wallet, nights survived, shop unlocks (localStorage) =====
import { BOAT_CARGO_TYPES, LAMP_BURNOUT_TIME } from './config.js';
import { db } from '../firebase.init.js';
import { doc, getDoc, setDoc, serverTimestamp } from '../firebase.js';
import { currentUser, onAuthChange } from './auth.js';
import {
  recordAchievementEvent,
  recordAchievementRunMetrics,
} from './achievements.js';

const STORAGE_KEY_PREFIX = 'lighthouse_meta_v1';
/** @deprecated Global key — migrated to per-uid storage; cleared on sign-out */
const LEGACY_STORAGE_KEY = 'lighthouse_meta_v1';
const META_OWNER_UID_KEY = 'lighthouse_meta_owner_uid';
const PROGRESS_COLLECTION = 'player_progress';
const SERVER_SYNC_DEBOUNCE_MS = 250;

/** @typedef {{ wallet: Record<string, number>, nightsWon: number, totalXp: number, unlocks: Record<string, boolean>, updatedAtMs: number }} MetaState */

export const UNLOCK_EXTRA_HEART = 'extraHeart';
export const UNLOCK_QUALITY_WICK = 'qualityWick';

const BASE_HEARTS_MAX = 5;
const HEARTS_WITH_BONUS = 6;
const LAMP_BURNOUT_BONUS_MULT = 1.25;

let lastCommittedRunStart = null;
let pendingServerSyncMeta = null;
let serverSyncTimerId = null;
let activeMetaUid = null;

function metaStorageKey(uid) {
  return `${STORAGE_KEY_PREFIX}_${uid}`;
}

function resetMetaSyncState() {
  pendingServerSyncMeta = null;
  if (serverSyncTimerId) {
    clearTimeout(serverSyncTimerId);
    serverSyncTimerId = null;
  }
}

function isMetaEmpty(meta) {
  if (!meta) return true;
  if (meta.nightsWon > 0 || (meta.totalXp || 0) > 0) return false;
  if (Object.keys(meta.unlocks || {}).length > 0) return false;
  return BOAT_CARGO_TYPES.every((k) => (meta.wallet[k] || 0) === 0);
}

function readMetaFromStorageKey(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return normalizeMeta(JSON.parse(raw));
  } catch (_) {
    return null;
  }
}

/** @returns {MetaState} */
function loadMetaForUid(uid) {
  if (!uid) return defaultMeta();
  const scoped = readMetaFromStorageKey(metaStorageKey(uid));
  if (scoped) return scoped;
  return defaultMeta();
}

function tryMigrateLegacyMeta(uid) {
  if (!uid) return null;

  const ownerUid = localStorage.getItem(META_OWNER_UID_KEY);
  if (ownerUid && ownerUid !== uid) return null;

  const legacy = readMetaFromStorageKey(LEGACY_STORAGE_KEY);
  if (!legacy || isMetaEmpty(legacy)) {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch (_) {}
    return null;
  }

  return legacy;
}

/** Clears shared legacy cache so the next session does not inherit another account's wallet. */
export function clearMetaLocalCacheOnSignOut() {
  const uid = currentUser?.uid;
  if (uid) {
    const scoped = readMetaFromStorageKey(metaStorageKey(uid));
    const legacy = readMetaFromStorageKey(LEGACY_STORAGE_KEY);
    if (legacy && (!scoped || isMetaEmpty(scoped))) {
      try {
        localStorage.setItem(metaStorageKey(uid), JSON.stringify(legacy));
      } catch (_) {}
    }
  }

  resetMetaSyncState();
  activeMetaUid = null;
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(META_OWNER_UID_KEY);
  } catch (_) {}
}

function emptyWallet() {
  return Object.fromEntries(BOAT_CARGO_TYPES.map((k) => [k, 0]));
}

/** @returns {MetaState} */
function defaultMeta() {
  return {
    wallet: emptyWallet(),
    nightsWon: 0,
    totalXp: 0,
    unlocks: {},
    updatedAtMs: 0,
  };
}

/** @returns {MetaState & { updatedAtMs: number }} */
function normalizeMeta(rawMeta) {
  const data = rawMeta && typeof rawMeta === 'object' ? rawMeta : {};
  const wallet = { ...emptyWallet(), ...(data.wallet || {}) };
  for (const k of BOAT_CARGO_TYPES) {
    const n = Number(wallet[k]);
    wallet[k] = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  }

  const nightsWon = Math.max(0, Math.floor(Number(data.nightsWon)) || 0);
  const totalXp = Math.max(0, Math.floor(Number(data.totalXp)) || 0);
  const unlocks =
    data.unlocks && typeof data.unlocks === 'object' ? { ...data.unlocks } : {};
  const updatedAtMs = Math.max(0, Math.floor(Number(data.updatedAtMs)) || 0);

  return {
    wallet,
    nightsWon,
    totalXp,
    unlocks,
    updatedAtMs,
  };
}

function areMetaEqual(left, right) {
  if (!left || !right) return false;
  if (left.nightsWon !== right.nightsWon) return false;
  if ((left.totalXp || 0) !== (right.totalXp || 0)) return false;

  for (const k of BOAT_CARGO_TYPES) {
    if ((left.wallet[k] || 0) !== (right.wallet[k] || 0)) return false;
  }

  const leftUnlocks = Object.keys(left.unlocks || {}).sort();
  const rightUnlocks = Object.keys(right.unlocks || {}).sort();
  if (leftUnlocks.length !== rightUnlocks.length) return false;
  for (let i = 0; i < leftUnlocks.length; i += 1) {
    const key = leftUnlocks[i];
    if (key !== rightUnlocks[i]) return false;
    if (Boolean(left.unlocks[key]) !== Boolean(right.unlocks[key]))
      return false;
  }

  return true;
}

async function saveMetaToServer(meta, updatedAtMs) {
  const user = currentUser;
  if (!user || !user.uid) return;

  await setDoc(
    doc(db, PROGRESS_COLLECTION, user.uid),
    {
      uid: user.uid,
      meta,
      metaUpdatedAt: Math.max(0, Math.floor(Number(updatedAtMs)) || Date.now()),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function queueMetaServerSync(meta, updatedAtMs) {
  pendingServerSyncMeta = { meta: normalizeMeta(meta), updatedAtMs };
  if (serverSyncTimerId) return;

  serverSyncTimerId = window.setTimeout(async () => {
    serverSyncTimerId = null;
    const payload = pendingServerSyncMeta;
    pendingServerSyncMeta = null;
    if (!payload) return;

    try {
      await saveMetaToServer(payload.meta, payload.updatedAtMs);
    } catch (e) {
      console.warn('saveMetaToServer failed', e);
    }
  }, SERVER_SYNC_DEBOUNCE_MS);
}

/** @returns {MetaState} */
export function loadMeta() {
  return loadMetaForUid(currentUser?.uid);
}

/** @param {MetaState} meta */
export function saveMeta(
  meta,
  { skipServerSync = false, updatedAtMs = Date.now() } = {},
) {
  const uid = currentUser?.uid;
  if (!uid) return;

  const normalized = normalizeMeta({ ...meta, updatedAtMs });
  try {
    localStorage.setItem(metaStorageKey(uid), JSON.stringify(normalized));
    localStorage.setItem(META_OWNER_UID_KEY, uid);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (e) {
    console.warn('saveMeta failed', e);
  }

  if (!skipServerSync) {
    queueMetaServerSync(normalized, updatedAtMs);
  }
}

async function syncMetaFromServer(user) {
  if (!user || !user.uid) return;

  let localMeta = loadMetaForUid(user.uid);
  if (isMetaEmpty(localMeta)) {
    const migrated = tryMigrateLegacyMeta(user.uid);
    if (migrated) {
      saveMeta(migrated, {
        skipServerSync: true,
        updatedAtMs: migrated.updatedAtMs || Date.now(),
      });
      localMeta = migrated;
    }
  }

  let remoteMeta = null;
  let remoteUpdatedAt = 0;
  try {
    const snap = await getDoc(doc(db, PROGRESS_COLLECTION, user.uid));
    if (snap.exists()) {
      const data = snap.data() || {};
      remoteMeta = normalizeMeta(data.meta);
      const rawUpdatedAt = Number(data.metaUpdatedAt);
      remoteUpdatedAt =
        Number.isFinite(rawUpdatedAt) && rawUpdatedAt > 0
          ? Math.floor(rawUpdatedAt)
          : 0;
      remoteMeta.updatedAtMs = remoteUpdatedAt;
    }
  } catch (e) {
    console.warn('load meta from server failed', e);
    return;
  }

  const hasRemoteState = Boolean(remoteMeta);
  const remoteIsNewer =
    hasRemoteState && remoteUpdatedAt > localMeta.updatedAtMs;
  const preferRemoteWithoutTimestamps =
    hasRemoteState && localMeta.updatedAtMs <= 0 && remoteUpdatedAt <= 0;

  if (remoteIsNewer || preferRemoteWithoutTimestamps) {
    saveMeta(remoteMeta, {
      skipServerSync: true,
      updatedAtMs: remoteUpdatedAt || Date.now(),
    });
    return;
  }

  if (
    !hasRemoteState ||
    !areMetaEqual(localMeta, remoteMeta) ||
    localMeta.updatedAtMs > remoteUpdatedAt
  ) {
    try {
      await saveMetaToServer(localMeta, Date.now());
    } catch (e) {
      console.warn('initial meta sync failed', e);
    }
  }
}

onAuthChange((user) => {
  if (!user || !user.uid) return;
  if (activeMetaUid !== user.uid) {
    activeMetaUid = user.uid;
    resetMetaSyncState();
  }
  void syncMetaFromServer(user);
});

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
  const xpEarned = Math.max(0, Math.floor(S.runXpEarnedThisRun || 0));
  if (xpEarned) meta.totalXp = (meta.totalXp || 0) + xpEarned;
  recordAchievementRunMetrics({
    cargo: S.deliveredCargo,
    beam: { maxMultiLitStreakMs: S.beamMultiLitBestMs },
  });
  if (S.gameWon) {
    meta.nightsWon += 1;
    recordAchievementEvent('run.won', 1);
    if (S.heartsRemaining === 1) {
      recordAchievementEvent('run.won_one_heart', 1);
    }
  }
  saveMeta(meta);
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
