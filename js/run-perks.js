import {
  RUN_PERK_XP_BASE,
  RUN_PERK_XP_GROWTH,
  RUN_XP_DELIVERED_BOATS,
  RUN_XP_REPELLED_MERMAIDS,
  RUN_XP_REPELLED_KRAKEN,
  RUN_XP_SUNK_COPS,
  PERK_LAMP_MULT_PER_STACK,
  PERK_BEAM_MULT_PER_STACK,
  PERK_COP_SPEED_MULT_PER_STACK,
  LAMP_BURNOUT_TIME,
  TOOLTIP_STYLE_OK,
} from './config.js';
import { xpForStep } from './xp-curve.js';
import S from './state.js';
import { spawnTooltip, updateHUD } from './ui.js';
import { t } from './i18n.js';

const RUN_XP_BY_GOAL = {
  delivered_boats: RUN_XP_DELIVERED_BOATS,
  repelled_mermaids: RUN_XP_REPELLED_MERMAIDS,
  repelled_kraken: RUN_XP_REPELLED_KRAKEN,
  sunk_cops: RUN_XP_SUNK_COPS,
};

export const PERK_IDS = ['better_oil', 'brighter_beam', 'slow_cops'];

export const PERK_ICONS = {
  better_oil: '🛢️',
  brighter_beam: '🔦',
  slow_cops: '🚔',
};

let perkPickerOpener = null;

/** @param {() => void} fn */
export function setPerkPickerOpener(fn) {
  perkPickerOpener = fn;
}

export function getRunXp() {
  return S.runXp || 0;
}

export function getTotalPerksPicked() {
  return PERK_IDS.reduce((n, id) => n + getPerkStack(id), 0);
}

/** XP required for the next perk pick (grows with perks already taken). */
export function getRunPerkXpThreshold() {
  return xpForStep(
    getTotalPerksPicked(),
    RUN_PERK_XP_BASE,
    RUN_PERK_XP_GROWTH,
  );
}

/** @returns {number} 0–1 progress toward next perk */
export function getRunXpProgress() {
  const threshold = getRunPerkXpThreshold();
  return Math.max(0, Math.min(1, (S.runXp || 0) / threshold));
}

export function getEffectiveLampBurnoutMs() {
  return Math.max(
    1,
    Math.round((S.lampBurnoutMs || LAMP_BURNOUT_TIME) * (S.runLampMult || 1)),
  );
}

export function getPerkStack(perkId) {
  return Math.max(0, Math.floor(S.runPerkStacks?.[perkId] || 0));
}

function recomputeMultipliers() {
  const stacks = S.runPerkStacks || {};
  S.runLampMult = Math.pow(
    PERK_LAMP_MULT_PER_STACK,
    getPerkStack('better_oil'),
  );
  S.runBeamMult = Math.pow(
    PERK_BEAM_MULT_PER_STACK,
    getPerkStack('brighter_beam'),
  );
  S.runPoliceSpeedMult = Math.pow(
    PERK_COP_SPEED_MULT_PER_STACK,
    getPerkStack('slow_cops'),
  );
}

/** @param {import('./state.js').default} state */
export function resetRunPerks(state = S) {
  state.runXp = 0;
  state.runXpEarnedThisRun = 0;
  state.runPerkStacks = {};
  state.runLampMult = 1;
  state.runBeamMult = 1;
  state.runPoliceSpeedMult = 1;
  state.perkPickerOpen = false;
}

export function checkRunXpLevelUp() {
  if (S.gameOver || S.gameOverPending || S.perkPickerOpen) return;
  if ((S.runXp || 0) >= getRunPerkXpThreshold()) {
    perkPickerOpener?.();
  }
}

/**
 * @param {string} goalKey
 */
export function grantXpForGoal(goalKey) {
  if (S.gameOver || S.gameOverPending || S.perkPickerOpen) return;
  const amount = RUN_XP_BY_GOAL[goalKey];
  if (!amount) return;

  S.runXp = (S.runXp || 0) + amount;
  S.runXpEarnedThisRun = (S.runXpEarnedThisRun || 0) + amount;
  spawnTooltip(
    S.lhX,
    S.lhY - 50,
    t('perk.xpGain', { n: amount }),
    TOOLTIP_STYLE_OK,
  );
  updateHUD();
  checkRunXpLevelUp();
}

/**
 * @param {string} perkId
 */
export function applyPerk(perkId) {
  if (!PERK_IDS.includes(perkId)) return;
  const threshold = getRunPerkXpThreshold();
  if (!S.runPerkStacks) S.runPerkStacks = {};
  S.runPerkStacks[perkId] = getPerkStack(perkId) + 1;
  recomputeMultipliers();
  S.runXp = Math.max(0, (S.runXp || 0) - threshold);
  updateHUD();
}
