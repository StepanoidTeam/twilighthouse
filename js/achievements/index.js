const STORAGE_KEY = 'lighthouse_achievements_v2';

export const ACHIEVEMENT_DEFS = [
  {
    id: 'first_night',
    icon: '🔦',
    titleKey: 'achievements.items.first_night.title',
    descKey: 'achievements.items.first_night.desc',
    target: 1,
    points: 10,
    rules: [{ type: 'event', event: 'run.won', step: 1 }],
  },
  {
    id: 'one_of_us',
    icon: '🚤',
    titleKey: 'achievements.items.one_of_us.title',
    descKey: 'achievements.items.one_of_us.desc',
    target: 10,
    points: 15,
    rules: [{ type: 'event', event: 'goal.delivered_boats', step: 1 }],
  },
  {
    id: 'not_today',
    icon: '🧜',
    titleKey: 'achievements.items.not_today.title',
    descKey: 'achievements.items.not_today.desc',
    target: 1,
    points: 10,
    rules: [{ type: 'event', event: 'goal.repelled_mermaids', step: 1 }],
  },
  {
    id: 'wrong_way',
    icon: '🚔',
    titleKey: 'achievements.items.wrong_way.title',
    descKey: 'achievements.items.wrong_way.desc',
    target: 1,
    points: 10,
    rules: [{ type: 'event', event: 'goal.sunk_cops', step: 1 }],
  },
  {
    id: 'it_exists',
    icon: '🐙',
    titleKey: 'achievements.items.it_exists.title',
    descKey: 'achievements.items.it_exists.desc',
    target: 1,
    points: 20,
    rules: [{ type: 'event', event: 'goal.repelled_kraken', step: 1 }],
  },
  {
    id: 'full_tank',
    icon: '💡',
    titleKey: 'achievements.items.full_tank.title',
    descKey: 'achievements.items.full_tank.desc',
    target: 10,
    points: 15,
    rules: [{ type: 'run_max', metric: 'cargo.💡' }],
  },
  {
    id: 'cargo_delivered',
    icon: '📦',
    titleKey: 'achievements.items.cargo_delivered.title',
    descKey: 'achievements.items.cargo_delivered.desc',
    target: 15,
    points: 15,
    rules: [{ type: 'run_max', metric: 'cargo.📦' }],
  },
  {
    id: 'for_courage',
    icon: '🥃',
    titleKey: 'achievements.items.for_courage.title',
    descKey: 'achievements.items.for_courage.desc',
    target: 10,
    points: 15,
    rules: [{ type: 'run_max', metric: 'cargo.🥃' }],
  },
  {
    id: 'wave_of_law',
    icon: '🚨',
    titleKey: 'achievements.items.wave_of_law.title',
    descKey: 'achievements.items.wave_of_law.desc',
    target: 25,
    points: 30,
    rules: [{ type: 'event', event: 'goal.sunk_cops', step: 1 }],
  },
  {
    id: 'siren_whisper',
    icon: '🧜',
    titleKey: 'achievements.items.siren_whisper.title',
    descKey: 'achievements.items.siren_whisper.desc',
    target: 50,
    points: 30,
    rules: [{ type: 'event', event: 'goal.repelled_mermaids', step: 1 }],
  },
  {
    id: 'path_keeper',
    icon: '🌊',
    titleKey: 'achievements.items.path_keeper.title',
    descKey: 'achievements.items.path_keeper.desc',
    target: 50,
    points: 30,
    rules: [{ type: 'event', event: 'goal.delivered_boats', step: 1 }],
  },
  {
    id: 'last_lamp',
    icon: '🕯',
    titleKey: 'achievements.items.last_lamp.title',
    descKey: 'achievements.items.last_lamp.desc',
    target: 1,
    points: 25,
    rules: [{ type: 'event', event: 'run.won_one_heart', step: 1 }],
  },
  {
    id: 'not_a_boat',
    icon: '💀',
    titleKey: 'achievements.items.not_a_boat.title',
    descKey: 'achievements.items.not_a_boat.desc',
    target: 1,
    points: 15,
    rules: [{ type: 'event', event: 'boat.sunk', step: 1 }],
  },
  {
    id: 'see_all',
    icon: '👁',
    titleKey: 'achievements.items.see_all.title',
    descKey: 'achievements.items.see_all.desc',
    target: 1000,
    points: 25,
    rules: [{ type: 'run_max', metric: 'beam.maxMultiLitStreakMs' }],
  },
];

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

function toNonNegativeInt(value) {
  return Math.max(0, Math.floor(Number(value)) || 0);
}

function emptyAchievementProgress() {
  return Object.fromEntries(ACHIEVEMENT_DEFS.map((def) => [def.id, 0]));
}

function saveAchievementProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (e) {
    console.warn('saveAchievementProgress failed', e);
  }
}

export function loadAchievementProgress() {
  const fallback = emptyAchievementProgress();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return fallback;

    for (const def of ACHIEVEMENT_DEFS) {
      const value = Number(data[def.id]);
      fallback[def.id] =
        Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
    }

    return fallback;
  } catch (_) {
    return fallback;
  }
}

export function setAchievementProgress(achievementId, value) {
  if (!achievementId) return;

  const progress = loadAchievementProgress();
  if (!Object.prototype.hasOwnProperty.call(progress, achievementId)) {
    progress[achievementId] = 0;
  }
  progress[achievementId] = toNonNegativeInt(value);
  saveAchievementProgress(progress);
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

  for (const rule of rules) {
    const key = rule.achievementId;
    const step = Math.max(1, Math.floor(Number(rule.step)) || 1);
    const previous = toNonNegativeInt(progress[key]);
    const next = previous + baseStep * step;
    if (next !== previous) {
      progress[key] = next;
      changed = true;
    }
  }

  if (changed) saveAchievementProgress(progress);
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

  for (const rule of RUN_MAX_RULES) {
    const runValue = readRunMetric(metrics, rule.metric) * rule.step;
    const current = toNonNegativeInt(progress[rule.achievementId]);
    if (runValue > current) {
      progress[rule.achievementId] = runValue;
      changed = true;
    }
  }

  if (changed) saveAchievementProgress(progress);
}
