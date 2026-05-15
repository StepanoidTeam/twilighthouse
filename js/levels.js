import { SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX } from './config.js';
import S from './state.js';
import { spawnBoat } from './boat.js';
import { spawnPoliceBoat } from './police.js';
import { spawnMermaid } from './mermaid.js';
import { spawnKraken } from './kraken.js';
import { showLevelBanner } from './ui.js';
import { recordAchievementEvent } from './achievements.js';

// ===== Level Definitions =====
// goal — пороги подцелей обучающих уровней. Уровень пройден, когда ВСЕ
// подцели достигли своих порогов. После туториала игра переходит в freeplay:
// уровней и целей больше нет, мобы спавнятся бесконечно по весам ниже.
const SCRIPTED_LEVELS = [
  // L1 (интерактивный туториал #1): проведи 3 лодки контрабандистов.
  {
    introKey: 'level.l1',
    goal: { delivered_boats: 3 },
  },
  // L2 (интерактивный туториал #2): потопи 1 лодку копов.
  {
    introKey: 'level.l2',
    goal: { sunk_cops: 1 },
  },
  // L3 (интерактивный туториал #3): отпугни русалок.
  {
    introKey: 'level.l3',
    goal: { repelled_mermaids: 3 },
  },
];

const FREEPLAY_SPAWN_WEIGHTS = {
  boats: 4,
  cops: 3,
  mermaids: 2,
  krakens: 1,
};

function getLevelDef(index) {
  return SCRIPTED_LEVELS[index] || null;
}

function isFreeplay() {
  return S.levelIndex >= SCRIPTED_LEVELS.length;
}

// ===== Goal helpers =====
function isGoalComplete() {
  const goal = getLevelDef(S.levelIndex)?.goal || {};
  for (const key of Object.keys(goal)) {
    if ((S.levelProgress[key] || 0) < goal[key]) return false;
  }
  return true;
}

// ===== Spawn helpers =====
const SPAWNERS = {
  boats: spawnBoat,
  cops: spawnPoliceBoat,
  mermaids: spawnMermaid,
  krakens: spawnKraken,
};

// Соответствие "тип спавна" ↔ "ключ подцели", который засчитывается
// при успешном исходе (см. notify() в boat/police/mermaid/kraken).
const KIND_TO_GOAL = {
  boats: 'delivered_boats',
  cops: 'sunk_cops',
  mermaids: 'repelled_mermaids',
  krakens: 'repelled_kraken',
};

// "Живые" мобы каждого типа на сцене — те, что ещё могут стать успехом
// или провалом, но не зафейлились/не зачлись окончательно.
const LIVE_COUNTERS = {
  boats: () => S.boats.filter((b) => !b.arrived && !b.sinking).length,
  cops: () => S.policeBoats.filter((p) => !p.arrived && !p.sinking).length,
  mermaids: () => S.mermaids.filter((m) => !m.gone).length,
  krakens: () => S.krakens.filter((k) => !k.gone).length,
};

// Сколько ещё нужно заспавнить целевых мобов данного типа,
// чтобы у игрока было достаточно "шансов" закрыть подцель.
function deficitFor(kind) {
  const goalKey = KIND_TO_GOAL[kind];
  if (!goalKey) return 0;
  const target = (S.levelGoal || {})[goalKey] || 0;
  if (!target) return 0;
  const done = (S.levelProgress || {})[goalKey] || 0;
  const live = LIVE_COUNTERS[kind] ? LIVE_COUNTERS[kind]() : 0;
  return Math.max(0, target - done - live);
}

// Решаем что спавнить: в туториале закрываем дефицит текущей цели, после
// туториала выбираем любой тип моба по freeplay-весам.
function pickSpawnKind() {
  if (isFreeplay()) return { kind: pickFreeplaySpawnKind() };

  const deficits = [];
  for (const kind of Object.keys(KIND_TO_GOAL)) {
    const d = deficitFor(kind);
    if (d > 0) deficits.push([kind, d]);
  }
  if (deficits.length) {
    const total = deficits.reduce((s, [, v]) => s + v, 0);
    let r = Math.random() * total;
    for (const [kind, v] of deficits) {
      r -= v;
      if (r <= 0) return { kind, source: 'goal' };
    }
    return { kind: deficits[deficits.length - 1][0], source: 'goal' };
  }

  const extras = Object.entries(S.levelSpawnLeft || {}).filter(
    ([, v]) => v > 0,
  );
  if (extras.length === 0) return null;
  const total = extras.reduce((s, [, v]) => s + v, 0);
  let r = Math.random() * total;
  for (const [kind, v] of extras) {
    r -= v;
    if (r <= 0) return { kind, source: 'extra' };
  }
  return { kind: extras[extras.length - 1][0], source: 'extra' };
}

function pickWeighted(weights) {
  const entries = Object.entries(weights).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  let r = Math.random() * total;
  for (const [kind, weight] of entries) {
    r -= weight;
    if (r <= 0) return kind;
  }
  return entries[entries.length - 1][0];
}

function pickFreeplaySpawnKind() {
  const weights = { ...FREEPLAY_SPAWN_WEIGHTS };
  if (LIVE_COUNTERS.krakens() > 0) weights.krakens = 0;
  return pickWeighted(weights);
}

function scheduleNextSpawn(now) {
  const jitter = Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
  S.nextSpawnTime = now + SPAWN_INTERVAL_MIN + jitter;
}

// ===== Public API =====
function applyLevel(index, { showBanner } = { showBanner: true }) {
  const def = getLevelDef(index);
  if (!def) {
    enterFreeplay({ showBanner });
    return;
  }
  S.levelIndex = index;
  S.levelGoal = { ...(def.goal || {}) };
  S.levelProgress = {};
  // Только ambient-бюджет; целевые мобы спавнятся через deficitFor().
  S.levelSpawnLeft = { ...(def.extraSpawn || {}) };
  S.levelStartedAt = performance.now();
  S.maxLevelReached = Math.max(S.maxLevelReached || 0, index + 1);
  // Счётчик разбитых лодок — лимит проигрыша (6) считается ПО УРОВНЮ:
  // обнуляем при каждой смене, чтобы прошлые крушения не утаскивали
  // в game over посреди новой задачи.
  S.boatsSunk = 0;

  // Дать игроку секунду-полторы прочитать баннер, прежде чем посыпется
  // новая волна моба.
  S.nextSpawnTime = performance.now() + 1500;

  if (showBanner) {
    showLevelBanner({
      titleKey: `${def.introKey}.title`,
      subtitleKey: `${def.introKey}.sub`,
      params: { ...(def.introParams || {}), n: index + 1 },
    });
  }

  console.log(
    `🎯 Level ${index + 1} started — budget:`,
    S.levelSpawnLeft,
    'goal:',
    def.goal,
  );
}

function showLevelIntro(index = S.levelIndex) {
  const def = getLevelDef(index);
  if (!def || !S.gameSessionActive || S.levelIndex !== index) return;
  showLevelBanner({
    titleKey: `${def.introKey}.title`,
    subtitleKey: `${def.introKey}.sub`,
    params: { ...(def.introParams || {}), n: index + 1 },
  });
}

function enterFreeplay({ showBanner } = { showBanner: true }) {
  S.levelIndex = SCRIPTED_LEVELS.length;
  S.levelGoal = {};
  S.levelProgress = {};
  S.levelSpawnLeft = {};
  S.levelStartedAt = performance.now();
  S.maxLevelReached = Math.max(S.maxLevelReached || 0, SCRIPTED_LEVELS.length);
  S.boatsSunk = 0;
  S.nextSpawnTime = performance.now() + 1500;
  if (showBanner) {
    showLevelBanner({
      titleKey: 'level.freeplay.title',
      subtitleKey: 'level.freeplay.sub',
    });
  }
  console.log('🌊 Freeplay started — spawn weights:', FREEPLAY_SPAWN_WEIGHTS);
}

function init({ showBanner = true, bannerDelayMs = 0 } = {}) {
  applyLevel(0, { showBanner: showBanner && bannerDelayMs <= 0 });
  if (showBanner && bannerDelayMs > 0) {
    S.nextSpawnTime += bannerDelayMs;
    window.setTimeout(() => showLevelIntro(0), bannerDelayMs);
  }
}

function tickSpawns(now) {
  if (S.gameOver || S.gameOverPending || S.levelTransitioning) return;
  if (now < S.nextSpawnTime) return;
  const pick = pickSpawnKind();
  if (!pick) return; // ни целей с дефицитом, ни ambient-бюджета — ждём
  const fn = SPAWNERS[pick.kind];
  if (fn) {
    fn();
    // Декрементим только ambient-бюджет; целевые "пополняются сами".
    if (pick.source === 'extra') {
      S.levelSpawnLeft[pick.kind] = (S.levelSpawnLeft[pick.kind] || 0) - 1;
    }
  }
  scheduleNextSpawn(now);
}

function refillGoalDeficit(kind, { onlyLevelIndex = null } = {}) {
  if (S.gameOver || S.gameOverPending || S.levelTransitioning) return false;
  if (onlyLevelIndex != null && S.levelIndex !== onlyLevelIndex) return false;
  if (deficitFor(kind) <= 0) return false;

  const fn = SPAWNERS[kind];
  if (!fn) return false;

  fn();
  scheduleNextSpawn(performance.now());
  return true;
}

function advance() {
  if (S.levelTransitioning) return;
  S.levelTransitioning = true;
  // На случай, если notify придёт повторно во время короткого перехода.
  setTimeout(() => {
    S.levelTransitioning = false;
  }, 0);
  applyLevel(S.levelIndex + 1, { showBanner: true });
}

function recordRunStat(goalKey) {
  if (!S.runStats) return;
  switch (goalKey) {
    case 'delivered_boats':
      S.runStats.deliveredBoats++;
      break;
    case 'sunk_cops':
      S.runStats.sunkCops++;
      break;
    case 'repelled_mermaids':
      S.runStats.repelledMermaids++;
      break;
    case 'repelled_kraken':
      S.runStats.repelledKraken++;
      break;
  }
}

function notify(goalKey) {
  if (S.gameOver || S.gameOverPending) return;
  recordAchievementEvent(`goal.${goalKey}`, 1);
  recordRunStat(goalKey);
  const def = getLevelDef(S.levelIndex);
  if (!def || !def.goal || def.goal[goalKey] == null) return;
  S.levelProgress[goalKey] = (S.levelProgress[goalKey] || 0) + 1;
  // Подцель уровня — бамп прогресса в HUD произойдёт на следующем updateHUD().
  if (isGoalComplete()) advance();
}

function current() {
  return {
    index: S.levelIndex,
    def: getLevelDef(S.levelIndex),
    progress: S.levelProgress,
    freeplay: isFreeplay(),
  };
}

export const levels = {
  init,
  tickSpawns,
  notify,
  refillGoalDeficit,
  advance,
  current,
  isGoalComplete,
  isFreeplay,
};
