// ===== Geometric XP curve: xpForStep(n) = floor(BASE * GROWTH^n) =====

/**
 * @param {number} stepIndex 0-based step (first level-up / first perk)
 * @param {number} base
 * @param {number} growth
 */
export function xpForStep(stepIndex, base, growth) {
  const step = Math.max(0, Math.floor(Number(stepIndex)) || 0);
  const b = Math.max(1, Number(base) || 1);
  const g = Math.max(1, Number(growth) || 1);
  return Math.max(1, Math.floor(b * Math.pow(g, step)));
}

/**
 * @param {number} totalXp
 * @param {number} base
 * @param {number} growth
 */
export function levelFromTotalXp(totalXp, base, growth) {
  let xp = Math.max(0, Math.floor(Number(totalXp)) || 0);
  let level = 1;
  let step = 0;
  while (xp >= xpForStep(step, base, growth)) {
    xp -= xpForStep(step, base, growth);
    level += 1;
    step += 1;
  }
  return level;
}

/**
 * @param {number} totalXp
 * @param {number} base
 * @param {number} growth
 * @returns {{ level: number, xpIntoLevel: number, xpToNext: number, ratio: number }}
 */
export function progressInLevel(totalXp, base, growth) {
  let xp = Math.max(0, Math.floor(Number(totalXp)) || 0);
  let level = 1;
  let step = 0;
  while (xp >= xpForStep(step, base, growth)) {
    xp -= xpForStep(step, base, growth);
    level += 1;
    step += 1;
  }
  const xpToNext = xpForStep(step, base, growth);
  const ratio =
    xpToNext > 0 ? Math.max(0, Math.min(1, xp / xpToNext)) : 0;
  return { level, xpIntoLevel: xp, xpToNext, ratio };
}
