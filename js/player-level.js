// ===== Player level from lifetime XP (geometric curve) =====
import { KEEPER_XP_BASE, KEEPER_XP_GROWTH } from './config.js';
import { loadMeta } from './meta-progress.js';
import { levelFromTotalXp, progressInLevel } from './xp-curve.js';
import S from './state.js';

/**
 * Level from total lifetime XP. Level 1 at 0 XP; each step costs more (geometric).
 * @param {number} totalXp
 */
export function getLevelFromXp(totalXp) {
  return levelFromTotalXp(totalXp, KEEPER_XP_BASE, KEEPER_XP_GROWTH);
}

/** @param {number} [totalXp] defaults to effective total */
export function getKeeperXpProgress(totalXp = getEffectiveTotalXp()) {
  return progressInLevel(totalXp, KEEPER_XP_BASE, KEEPER_XP_GROWTH);
}

/** Meta XP + XP earned this run (not yet committed to meta). */
export function getEffectiveTotalXp() {
  const metaXp = loadMeta().totalXp || 0;
  const runEarned = Math.max(0, Math.floor(S.runXpEarnedThisRun || 0));
  return metaXp + runEarned;
}

export function getCurrentPlayerLevel() {
  return getLevelFromXp(getEffectiveTotalXp());
}

/** Level from committed meta XP (leaderboard, after commitRunToMeta). */
export function getLeaderboardPlayerLevel() {
  return getLevelFromXp(loadMeta().totalXp || 0);
}
