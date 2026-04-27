import {
  analytics,
  logEvent,
  setUserId,
  setUserProperties,
} from '../firebase.init.js';

/**
 * Тонкая обёртка над Firebase Analytics. Если аналитика не поддерживается
 * в текущем окружении (приватный режим, отключённый ITP и т.д.), вызовы
 * молча игнорируются — ловить ошибки в каждой точке логирования не нужно.
 */
export function track(eventName, params = {}) {
  if (!analytics) return;
  try {
    logEvent(analytics, eventName, params);
  } catch (e) {
    console.warn(`analytics ${eventName} failed`, e);
  }
}

/**
 * Снимок параметров игры для game_end / level_end. Берётся в момент
 * показа экрана game over — потопленные корабли и т.п. уже учтены.
 * survival_ms берём из state, чтобы цифра совпадала с HUD.
 */
function buildRunSnapshot(state) {
  const survivalMs = Math.round(state.runSurvivalMs || 0);
  return {
    survival_ms: survivalMs,
    survival_seconds: Math.round(survivalMs / 1000),
    score: state.score | 0,
    boats_sunk: state.boatsSunk | 0,
    mermaids_arrived: state.mermaidsArrived | 0,
    crates_remaining: state.crates | 0,
  };
}

/**
 * Логирует завершение раунда. reason — одно из:
 *   'win' | 'boats_sunk' | 'pattinson' | 'police' | 'mermaid' | 'kraken'
 * Дополнительно отправляем GA4-рекомендуемое событие level_end,
 * чтобы успехи/провалы было удобно смотреть в стандартных отчётах.
 */
export function trackGameEnd(reason, state) {
  const snapshot = buildRunSnapshot(state);
  const isWin = reason === 'win';
  const result = isWin ? 'win' : 'loss';

  track('game_end', {
    game_name: 'lighthouse',
    result,
    reason,
    ...snapshot,
  });

  track('level_end', {
    level_name: 'lighthouse',
    success: isWin,
    reason,
    ...snapshot,
  });
}

export function trackGameStart(extra = {}) {
  track('game_start', { game_name: 'lighthouse', ...extra });
}

/**
 * Привязывает Firebase-юзера к GA: его uid становится user_id в User Explorer,
 * а тип аккаунта (anonymous/registered) — user property для сегментации.
 * Передайте null, чтобы сбросить (например, при реальном логауте).
 */
let lastUserIdSet = undefined;
export function setAnalyticsUser(user) {
  if (!analytics) return;
  const uid = user ? user.uid : null;

  if (uid !== lastUserIdSet) {
    try {
      setUserId(analytics, uid);
      lastUserIdSet = uid;
    } catch (e) {
      console.warn('analytics setUserId failed', e);
    }
  }

  if (!user) return;
  try {
    setUserProperties(analytics, {
      auth_state: user.isAnonymous ? 'anonymous' : 'registered',
    });
  } catch (e) {
    console.warn('analytics setUserProperties failed', e);
  }
}
