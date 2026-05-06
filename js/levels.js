import { SPAWN_INTERVAL_MIN, SPAWN_INTERVAL_MAX } from './config.js';
import S from './state.js';
import { spawnBoat } from './boat.js';
import { spawnPoliceBoat } from './police.js';
import { spawnMermaid } from './mermaid.js';
import { spawnKraken } from './kraken.js';
import { showLevelBanner } from './ui.js';

// ===== Level Definitions =====
// goal       — пороги подцелей (см. словарь GOAL_TO_KIND). Уровень
//              пройден, когда ВСЕ подцели достигли своих порогов.
//              Мобы целевого типа спавнятся АВТОМАТИЧЕСКИ до тех пор,
//              пока их сумма "сделано + сейчас в воздухе" < target,
//              чтобы провалившиеся (затонувшие, прорвавшиеся к маяку)
//              не блокировали прохождение.
// extraSpawn — фоновый бюджет (атмосфера/нон-цель). Тратится на спавне
//              как обычный счётчик и не пополняется при провале.
const SCRIPTED_LEVELS = [
  // L1 (микро-тутор #1): "Привези 1 контрабандиста"
  {
    introKey: 'level.l1',
    goal: { delivered_boats: 1 },
  },
  // L2 (микро-тутор #2): "Отпугни копа" + 1 фоновая лодка для контекста
  {
    introKey: 'level.l2',
    goal: { repelled_cops: 1 },
    extraSpawn: { boats: 1 },
  },
  // L3: "3 контры безопасно"
  {
    introKey: 'level.l3',
    goal: { delivered_boats: 3 },
  },
  // L4: "контры + копы"
  {
    introKey: 'level.l4',
    goal: { delivered_boats: 3, repelled_cops: 2 },
  },
  // L5 (босс): отгони кракена + проведи 3 лодки. Копы и русалки — атмосферный шум.
  {
    introKey: 'level.l5',
    goal: { delivered_boats: 3, repelled_kraken: 1 },
    extraSpawn: { cops: 5, mermaids: 3 },
  },
];

// Шаг волны после скриптовой кампании. k = 1 на L6.
function makeProcedural(n) {
  const k = n - SCRIPTED_LEVELS.length;
  const boats = 3 + Math.floor(k / 2);
  const cops = 1 + Math.floor(k / 2);
  return {
    introKey: 'level.proc',
    introParams: { n },
    goal: {
      delivered_boats: boats,
      repelled_cops: cops,
      ...(k % 3 === 0 ? { repelled_kraken: 1 } : {}),
    },
    extraSpawn: {
      mermaids: 1 + Math.floor(k / 2),
    },
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

// Соответствие "тип спавна" ↔ "ключ подцели", который засчитывается
// при успешном исходе (см. notify() в boat/police/mermaid/kraken).
const KIND_TO_GOAL = {
  boats: 'delivered_boats',
  cops: 'repelled_cops',
  mermaids: 'mermaids_scared',
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

// Решаем что спавнить:
//   1) Сначала закрываем дефицит по любой невыполненной подцели —
//      чтобы провалившиеся мобы не блокировали прогресс.
//   2) Если все цели "обеспечены живыми мобами" — тратим ambient-бюджет
//      (extraSpawn) на атмосферу.
function pickSpawnKind() {
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

function init() {
  applyLevel(0, { showBanner: true });
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
