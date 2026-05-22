import {
  RUN_PERK_XP_BASE,
  RUN_PERK_XP_GROWTH,
  RUN_PERK_PICK_COUNT,
  RUN_XP_DELIVERED_BOATS,
  RUN_XP_REPELLED_MERMAIDS,
  RUN_XP_REPELLED_KRAKEN,
  RUN_XP_SUNK_COPS,
  PERK_LAMP_MULT_PER_STACK,
  PERK_BEAM_MULT_PER_STACK,
  PERK_COP_SPEED_MULT_PER_STACK,
  PERK_BEAM_WIDTH_DEG_PER_STACK,
  PERK_BEAM_WIDTH_MAX_STACKS,
  PERK_SIREN_EYE_MERMAID_WEIGHT,
  PERK_SIREN_EYE_SPEED_MULT,
  PERK_EXPERIENCED_KEEPER_BONUS,
  PERK_OCCULT_MERMAID_WEIGHT,
  PERK_OCCULT_KRAKEN_WEIGHT,
  OLD_MAP_REVEAL_MS,
  LAMP_BURNOUT_TIME,
  LAMP_FULL_ANGLE,
  TOOLTIP_STYLE_OK,
} from './config.js';
import { xpForStep } from './xp-curve.js';
import S from './state.js';
import { spawnTooltip, updateHUD } from './ui.js';
import { triggerOldMapReveal } from './old-map.js';
import { spawnOccultRockLamps, spawnRandomIcebergs } from './rocks.js';
import { t } from './i18n.js';

const RUN_XP_BY_GOAL = {
  delivered_boats: RUN_XP_DELIVERED_BOATS,
  repelled_mermaids: RUN_XP_REPELLED_MERMAIDS,
  repelled_kraken: RUN_XP_REPELLED_KRAKEN,
  sunk_cops: RUN_XP_SUNK_COPS,
};

export const PERK_IDS = [
  'better_oil',
  'brighter_beam',
  'slow_cops',
  'beam_width',
  'siren_eye',
  'experienced_keeper',
  'occult_lamp',
  'old_map',
  'new_icebergs',
  'repair_lighthouse',
];

export const PERK_ICONS = {
  better_oil: '🛢️',
  brighter_beam: '🔦',
  slow_cops: '🚔',
  beam_width: '📐',
  siren_eye: '👁️',
  experienced_keeper: '🧭',
  occult_lamp: '🔮',
  old_map: '🗺️',
  new_icebergs: '🧊',
  repair_lighthouse: '🔧',
};

export const PERK_MAX_STACKS = {
  better_oil: Infinity,
  brighter_beam: Infinity,
  slow_cops: Infinity,
  beam_width: PERK_BEAM_WIDTH_MAX_STACKS,
  siren_eye: Infinity,
  experienced_keeper: Infinity,
  occult_lamp: 1,
  old_map: Infinity,
  new_icebergs: Infinity,
  repair_lighthouse: 3,
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

function getPendingRunLevelUps() {
  let pending = 0;
  let remainingXp = Math.max(0, S.runXp || 0);
  let totalPerks = getTotalPerksPicked();

  while (
    remainingXp >=
    xpForStep(totalPerks + pending, RUN_PERK_XP_BASE, RUN_PERK_XP_GROWTH)
  ) {
    remainingXp -= xpForStep(
      totalPerks + pending,
      RUN_PERK_XP_BASE,
      RUN_PERK_XP_GROWTH,
    );
    pending++;
  }

  return pending;
}

export function getRunLevel() {
  return 1 + getTotalPerksPicked() + getPendingRunLevelUps();
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
  const base = S.lampBurnoutMs || LAMP_BURNOUT_TIME;
  const reserveBonus = (S.lampOilReserve || 0) * 60;
  return Math.max(
    1,
    Math.round((base + reserveBonus) * (S.runLampMult || 1)),
  );
}

export function getPerkStack(perkId) {
  return Math.max(0, Math.floor(S.runPerkStacks?.[perkId] || 0));
}

export function getPerkBlockReason(perkId) {
  if (
    perkId === 'repair_lighthouse' &&
    (S.heartsRemaining || 0) >= (S.heartsMax || 0)
  ) {
    return 'fullHealth';
  }
  const max = PERK_MAX_STACKS[perkId];
  if (max != null && getPerkStack(perkId) >= max) return 'maxed';
  return null;
}

export function canPickPerk(perkId) {
  return getPerkBlockReason(perkId) == null;
}

export function hasPickablePerks() {
  return PERK_IDS.some((id) => canPickPerk(id));
}

/** Random subset shown in the picker (normal mode only). */
export function rollPerkPickerOffer() {
  const pickable = PERK_IDS.filter((id) => canPickPerk(id));
  const shuffled = [...pickable];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const count = Math.min(RUN_PERK_PICK_COUNT, shuffled.length);
  S.perkPickerOffer = shuffled.slice(0, count);
}

/** Perk ids rendered in the picker (all in debug, offer otherwise). */
export function getPerkPickerVisibleIds() {
  const visibleIds = S.debugMode ? PERK_IDS : (S.perkPickerOffer || []);
  return visibleIds.filter((id) => canPickPerk(id));
}

export function canSelectPerkInPicker(perkId) {
  if (!canPickPerk(perkId)) return false;
  if (S.debugMode) return true;
  return (S.perkPickerOffer || []).includes(perkId);
}

/** Max half-angle cap from beam_width perk (+10° full cone per stack). */
export function getMaxBeamHalfAngle() {
  const stacks = getPerkStack('beam_width');
  const extraHalfRad = ((stacks * PERK_BEAM_WIDTH_DEG_PER_STACK) / 2) * (Math.PI / 180);
  return LAMP_FULL_ANGLE + extraHalfRad;
}

export function getMermaidSpawnWeightMult() {
  let mult = 1;
  const sirenStacks = getPerkStack('siren_eye');
  if (sirenStacks > 0) {
    mult *= Math.pow(PERK_SIREN_EYE_MERMAID_WEIGHT, sirenStacks);
  }
  if (getPerkStack('occult_lamp') > 0) {
    mult *= PERK_OCCULT_MERMAID_WEIGHT;
  }
  return mult;
}

export function getKrakenSpawnWeightMult() {
  if (getPerkStack('occult_lamp') > 0) return PERK_OCCULT_KRAKEN_WEIGHT;
  return 1;
}

export function getMermaidSpeedMult() {
  const stacks = getPerkStack('siren_eye');
  if (stacks <= 0) return 1;
  return Math.pow(PERK_SIREN_EYE_SPEED_MULT, stacks);
}

export function isOccultLampActive() {
  return getPerkStack('occult_lamp') > 0;
}

export function getResourceBonusMult() {
  const stacks = getPerkStack('experienced_keeper');
  if (stacks <= 0) return 1;
  return 1 + PERK_EXPERIENCED_KEEPER_BONUS * stacks;
}

export function isOldMapActive() {
  return (S.oldMapRevealUntil || 0) > performance.now();
}

function recomputeMultipliers() {
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

function onPerkApplied(perkId) {
  if (perkId === 'old_map') {
    triggerOldMapReveal(OLD_MAP_REVEAL_MS);
  }
  if (perkId === 'occult_lamp') {
    spawnOccultRockLamps();
  }
  if (perkId === 'new_icebergs') {
    spawnRandomIcebergs();
  }
  if (perkId === 'repair_lighthouse') {
    S.heartsRemaining = Math.min(S.heartsMax, (S.heartsRemaining || 0) + 1);
    spawnTooltip(S.lhX, S.lhY - 60, t('perk.repair_lighthouse.healed'), TOOLTIP_STYLE_OK);
    updateHUD();
  }
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
  state.perkPickerOffer = [];
  state.oldMapRevealUntil = 0;
}

export function checkRunXpLevelUp() {
  if (S.gameOver || S.gameOverPending || S.perkPickerOpen) return;
  if ((S.runXp || 0) >= getRunPerkXpThreshold() && hasPickablePerks()) {
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
  if (S.perkPickerOpen) {
    if (!canSelectPerkInPicker(perkId)) return;
  } else if (!canPickPerk(perkId)) {
    return;
  }
  const threshold = getRunPerkXpThreshold();
  if (!S.runPerkStacks) S.runPerkStacks = {};
  S.runPerkStacks[perkId] = getPerkStack(perkId) + 1;
  recomputeMultipliers();
  onPerkApplied(perkId);
  S.runXp = Math.max(0, (S.runXp || 0) - threshold);
  updateHUD();
}
