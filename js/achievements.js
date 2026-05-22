import { db } from '../firebase.init.js';
import { doc, getDoc, setDoc, serverTimestamp } from '../firebase.js';
import { currentUser, onAuthChange } from './auth.js';

const STORAGE_KEY_PREFIX = 'lighthouse_achievements_v2';
const LEGACY_STORAGE_KEY = 'lighthouse_achievements_v2';
const STORAGE_UPDATED_AT_PREFIX = 'lighthouse_achievements_v2_updated_at';
const LEGACY_UPDATED_AT_KEY = 'lighthouse_achievements_v2_updated_at';
const ACHIEVEMENTS_OWNER_UID_KEY = 'lighthouse_achievements_owner_uid';
const PROGRESS_COLLECTION = 'player_progress';
const SERVER_SYNC_DEBOUNCE_MS = 250;

let activeAchievementsUid = null;

export const ACHIEVEMENT_DEFS = [
  {
    id: 'first_night',
    icon: '🔦',
    titleKey: 'achievements.items.first_night.title',
    descKey: 'achievements.items.first_night.desc',
    target: 1,
    points: 5,
    rules: [{ type: 'event', event: 'run.won', step: 1 }],
  },
  {
    id: 'one_of_us',
    icon: '🚤',
    titleKey: 'achievements.items.one_of_us.title',
    descKey: 'achievements.items.one_of_us.desc',
    target: 10,
    points: 12,
    rules: [{ type: 'event', event: 'goal.delivered_boats', step: 1 }],
  },
  {
    id: 'not_today',
    icon: '🧜',
    titleKey: 'achievements.items.not_today.title',
    descKey: 'achievements.items.not_today.desc',
    target: 1,
    points: 8,
    rules: [{ type: 'event', event: 'goal.repelled_mermaids', step: 1 }],
  },
  {
    id: 'wrong_way',
    icon: '🚔',
    titleKey: 'achievements.items.wrong_way.title',
    descKey: 'achievements.items.wrong_way.desc',
    target: 1,
    points: 8,
    rules: [{ type: 'event', event: 'goal.sunk_cops', step: 1 }],
  },
  {
    id: 'it_exists',
    icon: '🦑',
    titleKey: 'achievements.items.it_exists.title',
    descKey: 'achievements.items.it_exists.desc',
    target: 1,
    points: 12,
    rules: [{ type: 'event', event: 'goal.repelled_kraken', step: 1 }],
  },
  {
    id: 'full_tank',
    icon: '💡',
    titleKey: 'achievements.items.full_tank.title',
    descKey: 'achievements.items.full_tank.desc',
    target: 10,
    points: 18,
    rules: [{ type: 'run_max', metric: 'cargo.💡' }],
  },
  {
    id: 'cargo_delivered',
    icon: '📦',
    titleKey: 'achievements.items.cargo_delivered.title',
    descKey: 'achievements.items.cargo_delivered.desc',
    target: 15,
    points: 20,
    rules: [{ type: 'run_max', metric: 'cargo.📦' }],
  },
  {
    id: 'wave_of_law',
    icon: '🚨',
    titleKey: 'achievements.items.wave_of_law.title',
    descKey: 'achievements.items.wave_of_law.desc',
    target: 25,
    points: 32,
    rules: [{ type: 'event', event: 'goal.sunk_cops', step: 1 }],
  },
  {
    id: 'siren_whisper',
    icon: '🧜',
    titleKey: 'achievements.items.siren_whisper.title',
    descKey: 'achievements.items.siren_whisper.desc',
    target: 50,
    points: 40,
    rules: [{ type: 'event', event: 'goal.repelled_mermaids', step: 1 }],
  },
  {
    id: 'path_keeper',
    icon: '🌊',
    titleKey: 'achievements.items.path_keeper.title',
    descKey: 'achievements.items.path_keeper.desc',
    target: 50,
    points: 40,
    rules: [{ type: 'event', event: 'goal.delivered_boats', step: 1 }],
  },
  {
    id: 'last_lamp',
    icon: '🕯',
    titleKey: 'achievements.items.last_lamp.title',
    descKey: 'achievements.items.last_lamp.desc',
    target: 1,
    points: 35,
    rules: [{ type: 'event', event: 'run.won_one_heart', step: 1 }],
  },
  {
    id: 'not_a_boat',
    icon: '💀',
    titleKey: 'achievements.items.not_a_boat.title',
    descKey: 'achievements.items.not_a_boat.desc',
    target: 1,
    points: 12,
    rules: [{ type: 'event', event: 'boat.sunk', step: 1 }],
  },
  {
    id: 'see_all',
    icon: '👁',
    titleKey: 'achievements.items.see_all.title',
    descKey: 'achievements.items.see_all.desc',
    target: 1000,
    points: 30,
    rules: [{ type: 'run_max', metric: 'beam.maxMultiLitStreakMs' }],
  },
];

const ACHIEVEMENT_DEF_BY_ID = new Map(
  ACHIEVEMENT_DEFS.map((def) => [def.id, def]),
);

const EVENT_RULES = (() => {
  const map = new Map();
  for (const def of ACHIEVEMENT_DEFS) {
    for (const rule of def.rules || []) {
      if (rule.type !== 'event') continue;
      const event = String(rule.event || '').trim();
      if (!event) continue;
      const step = Math.max(1, Math.floor(Number(rule.step)) || 1);
      const list = map.get(event) || [];
      list.push({ achievementId: def.id, step });
      map.set(event, list);
    }
  }
  return map;
})();

const RUN_MAX_RULES = (() => {
  const rules = [];
  for (const def of ACHIEVEMENT_DEFS) {
    for (const rule of def.rules || []) {
      if (rule.type !== 'run_max') continue;
      const metric = String(rule.metric || '').trim();
      if (!metric) continue;
      const step = Math.max(1, Math.floor(Number(rule.step)) || 1);
      rules.push({ achievementId: def.id, metric, step });
    }
  }
  return rules;
})();

const unlockListeners = new Set();
let pendingServerSyncProgress = null;
let serverSyncTimerId = null;

function achievementStorageKey(uid) {
  return `${STORAGE_KEY_PREFIX}_${uid}`;
}

function achievementUpdatedAtKey(uid) {
  return `${STORAGE_UPDATED_AT_PREFIX}_${uid}`;
}

function resetAchievementsSyncState() {
  pendingServerSyncProgress = null;
  if (serverSyncTimerId) {
    clearTimeout(serverSyncTimerId);
    serverSyncTimerId = null;
  }
}

function isAchievementProgressEmpty(progress) {
  return ACHIEVEMENT_DEFS.every(
    (def) => toNonNegativeInt(progress?.[def.id]) === 0,
  );
}

function readAchievementProgressFromKey(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return normalizeAchievementProgress(JSON.parse(raw));
  } catch (_) {
    return null;
  }
}

function getLocalAchievementsUpdatedAtForUid(uid) {
  if (!uid) return 0;
  try {
    const value = Number(localStorage.getItem(achievementUpdatedAtKey(uid)));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch (_) {
    return 0;
  }
}

function loadAchievementProgressForUid(uid) {
  if (!uid) return emptyAchievementProgress();
  const scoped = readAchievementProgressFromKey(achievementStorageKey(uid));
  if (scoped) return scoped;
  return emptyAchievementProgress();
}

function tryMigrateLegacyAchievements(uid) {
  if (!uid) return null;

  const ownerUid = localStorage.getItem(ACHIEVEMENTS_OWNER_UID_KEY);
  if (ownerUid && ownerUid !== uid) return null;

  const legacy = readAchievementProgressFromKey(LEGACY_STORAGE_KEY);
  if (!legacy || isAchievementProgressEmpty(legacy)) {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      localStorage.removeItem(LEGACY_UPDATED_AT_KEY);
    } catch (_) {}
    return null;
  }

  return legacy;
}

/** Clears shared legacy cache so the next session does not inherit another account's progress. */
export function clearAchievementsLocalCacheOnSignOut() {
  const uid = currentUser?.uid;
  if (uid) {
    const scoped = readAchievementProgressFromKey(achievementStorageKey(uid));
    const legacy = readAchievementProgressFromKey(LEGACY_STORAGE_KEY);
    if (legacy && isAchievementProgressEmpty(scoped || {})) {
      let updatedAt = 0;
      try {
        const raw = Number(localStorage.getItem(LEGACY_UPDATED_AT_KEY));
        updatedAt =
          Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : Date.now();
      } catch (_) {
        updatedAt = Date.now();
      }
      try {
        localStorage.setItem(
          achievementStorageKey(uid),
          JSON.stringify(legacy),
        );
        localStorage.setItem(achievementUpdatedAtKey(uid), String(updatedAt));
      } catch (_) {}
    }
  }

  resetAchievementsSyncState();
  activeAchievementsUid = null;
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(LEGACY_UPDATED_AT_KEY);
    localStorage.removeItem(ACHIEVEMENTS_OWNER_UID_KEY);
  } catch (_) {}
}

function toNonNegativeInt(value) {
  return Math.max(0, Math.floor(Number(value)) || 0);
}

function normalizeTarget(def) {
  return Math.max(1, toNonNegativeInt(def?.target) || 1);
}

function isUnlocked(def, progressValue) {
  return toNonNegativeInt(progressValue) >= normalizeTarget(def);
}

function emitAchievementUnlocked(def, progressValue) {
  const payload = {
    id: def.id,
    icon: def.icon,
    titleKey: def.titleKey,
    descKey: def.descKey,
    points: toNonNegativeInt(def.points),
    progress: toNonNegativeInt(progressValue),
    target: normalizeTarget(def),
  };

  for (const listener of unlockListeners) {
    try {
      listener(payload);
    } catch (e) {
      console.error('achievement unlock listener error', e);
    }
  }
}

function emitUniqueUnlocks(unlocks) {
  const seen = new Set();
  for (const unlock of unlocks) {
    if (!unlock || !unlock.def) continue;
    if (seen.has(unlock.def.id)) continue;
    seen.add(unlock.def.id);
    emitAchievementUnlocked(unlock.def, unlock.progress);
  }
}

function collectUnlockTransition({ def, previous, next, unlocks }) {
  if (!def || !unlocks) return;
  if (isUnlocked(def, previous) || !isUnlocked(def, next)) return;
  unlocks.push({ def, progress: next });
}

function emptyAchievementProgress() {
  return Object.fromEntries(ACHIEVEMENT_DEFS.map((def) => [def.id, 0]));
}

function getLocalAchievementsUpdatedAt() {
  return getLocalAchievementsUpdatedAtForUid(currentUser?.uid);
}

function normalizeAchievementProgress(source) {
  const fallback = emptyAchievementProgress();
  const data = source && typeof source === 'object' ? source : {};

  for (const def of ACHIEVEMENT_DEFS) {
    const value = Number(data[def.id]);
    fallback[def.id] =
      Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  }

  return fallback;
}

function areAchievementProgressEqual(left, right) {
  for (const def of ACHIEVEMENT_DEFS) {
    if (
      toNonNegativeInt(left?.[def.id]) !== toNonNegativeInt(right?.[def.id])
    ) {
      return false;
    }
  }
  return true;
}

function saveAchievementProgressLocal(progress, updatedAtMs = Date.now()) {
  const uid = currentUser?.uid;
  if (!uid) return;

  const ts = Math.max(0, Math.floor(Number(updatedAtMs)) || Date.now());
  try {
    localStorage.setItem(achievementStorageKey(uid), JSON.stringify(progress));
    localStorage.setItem(achievementUpdatedAtKey(uid), String(ts));
    localStorage.setItem(ACHIEVEMENTS_OWNER_UID_KEY, uid);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(LEGACY_UPDATED_AT_KEY);
  } catch (e) {
    console.warn('saveAchievementProgress failed', e);
  }
}

async function saveAchievementProgressToServer(progress, updatedAtMs) {
  const user = currentUser;
  if (!user || !user.uid) return;

  await setDoc(
    doc(db, PROGRESS_COLLECTION, user.uid),
    {
      uid: user.uid,
      achievements: progress,
      achievementsUpdatedAt: Math.max(
        0,
        Math.floor(Number(updatedAtMs)) || Date.now(),
      ),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

function queueAchievementServerSync(progress) {
  pendingServerSyncProgress = { ...progress };
  if (serverSyncTimerId) return;

  serverSyncTimerId = window.setTimeout(async () => {
    serverSyncTimerId = null;
    const payload = pendingServerSyncProgress;
    pendingServerSyncProgress = null;
    if (!payload) return;

    const updatedAtMs = getLocalAchievementsUpdatedAt() || Date.now();
    try {
      await saveAchievementProgressToServer(payload, updatedAtMs);
    } catch (e) {
      console.warn('saveAchievementProgressToServer failed', e);
    }
  }, SERVER_SYNC_DEBOUNCE_MS);
}

function saveAchievementProgress(progress, { skipServerSync = false } = {}) {
  saveAchievementProgressLocal(progress, Date.now());
  if (!skipServerSync) {
    queueAchievementServerSync(progress);
  }
}

export function loadAchievementProgress() {
  return loadAchievementProgressForUid(currentUser?.uid);
}

async function syncAchievementsFromServer(user) {
  if (!user || !user.uid) return;

  let localProgress = loadAchievementProgressForUid(user.uid);
  let localUpdatedAt = getLocalAchievementsUpdatedAtForUid(user.uid);

  if (isAchievementProgressEmpty(localProgress)) {
    const migrated = tryMigrateLegacyAchievements(user.uid);
    if (migrated) {
      let migratedUpdatedAt = 0;
      try {
        const raw = Number(localStorage.getItem(LEGACY_UPDATED_AT_KEY));
        migratedUpdatedAt =
          Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : Date.now();
      } catch (_) {
        migratedUpdatedAt = Date.now();
      }
      saveAchievementProgressLocal(migrated, migratedUpdatedAt);
      localProgress = migrated;
      localUpdatedAt = migratedUpdatedAt;
    }
  }

  let serverProgress = null;
  let serverUpdatedAt = 0;
  try {
    const snap = await getDoc(doc(db, PROGRESS_COLLECTION, user.uid));
    if (snap.exists()) {
      const data = snap.data() || {};
      serverProgress = normalizeAchievementProgress(data.achievements);
      const rawUpdatedAt = Number(data.achievementsUpdatedAt);
      serverUpdatedAt =
        Number.isFinite(rawUpdatedAt) && rawUpdatedAt > 0
          ? Math.floor(rawUpdatedAt)
          : 0;
    }
  } catch (e) {
    console.warn('load achievements from server failed', e);
    return;
  }

  const hasServerState = Boolean(serverProgress);
  const serverIsNewer = hasServerState && serverUpdatedAt > localUpdatedAt;
  const preferServerWithoutTimestamps =
    hasServerState && localUpdatedAt <= 0 && serverUpdatedAt <= 0;

  if (serverIsNewer || preferServerWithoutTimestamps) {
    saveAchievementProgressLocal(serverProgress, serverUpdatedAt);
    return;
  }

  if (
    !hasServerState ||
    !areAchievementProgressEqual(localProgress, serverProgress) ||
    localUpdatedAt > serverUpdatedAt
  ) {
    try {
      await saveAchievementProgressToServer(localProgress, Date.now());
    } catch (e) {
      console.warn('initial achievements sync failed', e);
    }
  }
}

onAuthChange((user) => {
  if (!user || !user.uid) return;
  if (activeAchievementsUid !== user.uid) {
    activeAchievementsUid = user.uid;
    resetAchievementsSyncState();
  }
  void syncAchievementsFromServer(user);
});

export function setAchievementProgress(achievementId, value) {
  if (!achievementId) return;

  const progress = loadAchievementProgress();
  const def = ACHIEVEMENT_DEF_BY_ID.get(achievementId) || null;
  const previous = toNonNegativeInt(progress[achievementId]);
  const next = toNonNegativeInt(value);

  if (!Object.prototype.hasOwnProperty.call(progress, achievementId)) {
    progress[achievementId] = 0;
  }
  progress[achievementId] = next;
  saveAchievementProgress(progress);

  const unlocks = [];
  collectUnlockTransition({ def, previous, next, unlocks });
  emitUniqueUnlocks(unlocks);
}

export function resetAllAchievementProgress() {
  saveAchievementProgress(emptyAchievementProgress());
}

export function recordAchievementEvent(event, amount = 1) {
  const eventId = String(event || '').trim();
  if (!eventId) return;

  const baseStep = toNonNegativeInt(amount);
  if (!baseStep) return;

  const rules = EVENT_RULES.get(eventId);
  if (!rules || rules.length === 0) return;

  const progress = loadAchievementProgress();
  let changed = false;
  const unlocks = [];

  for (const rule of rules) {
    const key = rule.achievementId;
    const def = ACHIEVEMENT_DEF_BY_ID.get(key) || null;
    const step = Math.max(1, Math.floor(Number(rule.step)) || 1);
    const previous = toNonNegativeInt(progress[key]);
    const next = previous + baseStep * step;
    if (next !== previous) {
      progress[key] = next;
      changed = true;
      collectUnlockTransition({ def, previous, next, unlocks });
    }
  }

  if (changed) {
    saveAchievementProgress(progress);
    emitUniqueUnlocks(unlocks);
  }
}

function readRunMetric(metrics, metricPath) {
  const parts = String(metricPath || '')
    .split('.')
    .filter(Boolean);
  if (parts.length === 0) return 0;

  let cursor = metrics;
  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object') return 0;
    cursor = cursor[part];
  }

  return toNonNegativeInt(cursor);
}

export function recordAchievementRunMetrics(metrics) {
  if (!metrics || typeof metrics !== 'object') return;
  if (RUN_MAX_RULES.length === 0) return;

  const progress = loadAchievementProgress();
  let changed = false;
  const unlocks = [];

  for (const rule of RUN_MAX_RULES) {
    const def = ACHIEVEMENT_DEF_BY_ID.get(rule.achievementId) || null;
    const runValue = readRunMetric(metrics, rule.metric) * rule.step;
    const current = toNonNegativeInt(progress[rule.achievementId]);
    if (runValue > current) {
      progress[rule.achievementId] = runValue;
      changed = true;
      collectUnlockTransition({
        def,
        previous: current,
        next: runValue,
        unlocks,
      });
    }
  }

  if (changed) {
    saveAchievementProgress(progress);
    emitUniqueUnlocks(unlocks);
  }
}

export function onAchievementUnlocked(listener) {
  if (typeof listener !== 'function') return () => {};
  unlockListeners.add(listener);
  return () => unlockListeners.delete(listener);
}
