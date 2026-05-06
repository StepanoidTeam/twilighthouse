import { SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX } from './config.js';
import S from './state.js';
import { spawnBoat } from './boat.js';
import { spawnPoliceBoat } from './police.js';
import { spawnMermaid } from './mermaid.js';
import { spawnKraken } from './kraken.js';
import { showLevelBanner } from './ui.js';

// ===== Level Definitions =====
// spawn — сколько мобов выпускается на этом уровне всего за раунд (бюджет).
// goal  — порог по подцелям; ключи совпадают с теми, что мобы пушат через notify().
//         Уровень считается пройденным, когда ВСЕ подцели достигли своих порогов.
const SCRIPTED_LEVELS = [
  // L1 (микро-тутор #1): "Привези 1 контрабандиста"
  {
    introKey: 'level.l1',
    spawn: { boats: 1 },
    goal: { delivered_boats: 1 },
  },
  // L2 (микро-тутор #2): "Отпугни копа"
  {
    introKey: 'level.l2',
    spawn: { boats: 1, cops: 1 },
    goal: { repelled_cops: 1 },
  },
  // L3: "3 контры безопасно"
  {
    introKey: 'level.l3',
    spawn: { boats: 3 },
    goal: { delivered_boats: 3 },
  },
  // L4: "контры + копы"
  {
    introKey: 'level.l4',
    spawn: { boats: 3, cops: 2 },
    goal: { delivered_boats: 3, repelled_cops: 2 },
  },
  // L5 (босс-уровень): "контры + копы + русалки + кракен"
  {
    introKey: 'level.l5',
    spawn: { boats: 3, cops: 5, mermaids: 3, krakens: 1 },
    goal: { delivered_boats: 3, repelled_kraken: 1 },
  },
];

// Шаг волны после скриптовой кампании. k = 1 на L6.
function makeProcedural(n) {
  const k = n - SCRIPTED_LEVELS.length;
  const boats = 3 + Math.floor(k / 2);
  return {
    introKey: 'level.proc',
    introParams: { n },
    spawn: {
      boats,
      cops: 2 + k,
      mermaids: 1 + Math.floor(k / 2),
      krakens: k % 3 === 0 ? 1 : 0,
    },
    goal: { delivered_boats: boats },
  };
}

function getLevelDef(index) {
  if (index < SCRIPTED_LEVELS.length) return SCRIPTED_LEVELS[index];
  return makeProcedural(index + 1);
}

// ===== Goal helpers =====
function isGoalComplete() {
  const goal = getLevelDef(S.levelIndex).goal || {};
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

// Выбираем тип моба пропорционально остатку в бюджете уровня —
// тогда волны естественно перемешиваются, а не идут "сначала все лодки,
// потом все копы".
function pickSpawnKind() {
  const left = S.levelSpawnLeft || {};
  const entries = Object.entries(left).filter(([, v]) => v > 0);
  if (entries.length === 0) return null;
  const total = entries.reduce((s, [, v]) => s + v, 0);
  let r = Math.random() * total;
  for (const [kind, v] of entries) {
    r -= v;
    if (r <= 0) return kind;
  }
  return entries[entries.length - 1][0];
}

function scheduleNextSpawn(now) {
  const jitter = Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
  S.nextSpawnTime = now + SPAWN_INTERVAL_MIN + jitter;
}

// ===== Public API =====
function applyLevel(index, { showBanner } = { showBanner: true }) {
  const def = getLevelDef(index);
  S.levelIndex = index;
  S.levelGoal = { ...(def.goal || {}) };
  S.levelProgress = {};
  S.levelSpawnLeft = { ...(def.spawn || {}) };
  S.levelStartedAt = performance.now();
  S.maxLevelReached = Math.max(S.maxLevelReached || 0, index + 1);

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

function init() {
  applyLevel(0, { showBanner: true });
}

function tickSpawns(now) {
  if (S.gameOver || S.gameOverPending || S.levelTransitioning) return;
  if (now < S.nextSpawnTime) return;
  const kind = pickSpawnKind();
  if (!kind) return; // бюджет исчерпан — ждём notify-завершения
  const fn = SPAWNERS[kind];
  if (fn) {
    fn();
    S.levelSpawnLeft[kind] = (S.levelSpawnLeft[kind] || 0) - 1;
  }
  scheduleNextSpawn(now);
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

function notify(goalKey) {
  if (S.gameOver || S.gameOverPending) return;
  S.levelProgress[goalKey] = (S.levelProgress[goalKey] || 0) + 1;
  const def = getLevelDef(S.levelIndex);
  // Подцель уровня — бамп прогресса в HUD произойдёт на следующем updateHUD().
  if (def.goal && def.goal[goalKey] != null) {
    if (isGoalComplete()) advance();
  }
}

function current() {
  return {
    index: S.levelIndex,
    def: getLevelDef(S.levelIndex),
    progress: S.levelProgress,
  };
}

export const levels = {
  init,
  tickSpawns,
  notify,
  advance,
  current,
  isGoalComplete,
};
