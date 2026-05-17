import { db } from '../firebase.init.js';
import { doc, getDoc, setDoc, serverTimestamp } from '../firebase.js';
import { currentUser, onAuthChange } from './auth.js';

const STORAGE_KEY = 'lighthouse_achievements_v2';
const STORAGE_UPDATED_AT_KEY = 'lighthouse_achievements_v2_updated_at';
const PROGRESS_COLLECTION = 'player_progress';
const SERVER_SYNC_DEBOUNCE_MS = 250;

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
    id: 'for_courage',
    icon: '🥃',
    titleKey: 'achievements.items.for_courage.title',
    descKey: 'achievements.items.for_courage.desc',
    target: 10,
    points: 20,
    rules: [{ type: 'run_max', metric: 'cargo.🥃' }],
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
  try {
    const value = Number(localStorage.getItem(STORAGE_UPDATED_AT_KEY));
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch (_) {
    return 0;
  }
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    localStorage.setItem(
      STORAGE_UPDATED_AT_KEY,
      String(Math.max(0, Math.floor(Number(updatedAtMs)) || Date.now())),
    );
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
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyAchievementProgress();

    const data = JSON.parse(raw);
    return normalizeAchievementProgress(data);
  } catch (_) {
    return emptyAchievementProgress();
  }
}

async function syncAchievementsFromServer(user) {
  if (!user || !user.uid) return;

  const localProgress = loadAchievementProgress();
  const localUpdatedAt = getLocalAchievementsUpdatedAt();

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
