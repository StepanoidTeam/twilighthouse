// ===== Player level from lifetime XP (same scale as in-run perk threshold) =====
import { RUN_XP_THRESHOLD } from './config.js';
import { loadMeta } from './meta-progress.js';
import S from './state.js';

/**
 * Level from total lifetime XP. Level 1 = 0–99 XP, level 2 = 100–199, …
 * @param {number} totalXp
 */
export function getLevelFromXp(totalXp) {
  const xp = Math.max(0, Math.floor(Number(totalXp)) || 0);
  return Math.max(1, Math.floor(xp / RUN_XP_THRESHOLD) + 1);
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

/** Level stored on leaderboard after commitRunToMeta (meta.totalXp). */
export function getLeaderboardPlayerLevel() {
  return getLevelFromXp(loadMeta().totalXp || 0);
}
