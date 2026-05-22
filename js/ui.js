import {
  PIXI,
  BOAT_CARGO_TYPES,
  TOOLTIP_RISE_SPEED,
  TOOLTIP_DURATION,
  CARGO_LABEL_STYLE,
  LAMP_BURNOUT_TIME,
  GAME_OVER_DELAY,
  NIGHT_DURATION_MS,
} from './config.js';
import {
  getRunXpProgress,
  getRunPerkXpThreshold,
  getEffectiveLampBurnoutMs,
} from './run-perks.js';
import { SUSPICION_MAX } from './config.js';
import {
  CRASH_VOLUME,
  CRASH_SOUNDS,
  playSound,
  playRandomSound,
  MUSIC_VOLUME,
  syncLoopingAudio,
  playFailSound,
} from './sound.js';
import S from './state.js';
import { levels } from './levels.js';
import { t } from './i18n.js';
import { formatSurvivalTime } from './leaderboard.js';
import { trackGameEnd } from './analytics.js';

const {
  $btnLeft,
  $btnRight,
  $btnEsc,
  $btnResultRestart,
  $btnResultMenu,
  $volControls,
  $volSfxVal,
  $volMusicVal,
  $gameContainer,
  $resultTitle,
  $resultReason,
  $resultStats,
  $resultRestartLabel,
  $resultMenuLabel,
  $resultSplash,
  $screenGameOver,
  $achievementToastLayer,
  $exitConfirmMsg,
  $exitConfirmLabel,
  $exitSettingsLabel,
  $exitResumeLabel,
  $screenExitConfirm,
  $hudLamp,
  $hudLamps,
  $hudNight,
  $hudNightFill,
  $hudNightLabel,
  $hudNightTime,
  $levelBanner,
  $levelBannerTitle,
  $levelBannerSubtitle,
  $hudXp,
  $hudXpLabel,
  $hudXpValue,
  $hudXpFill,
  $screenPerkPick,
} = globalThis;

// ===== Tooltips =====
export function playCrashSound() {
  playRandomSound(CRASH_SOUNDS, CRASH_VOLUME);
}

export function spawnTooltip(x, y, text, style) {
  const txt = new PIXI.Text(text, style);
  txt.anchor.set(0.5);
  txt.position.set(x, y);
  S.tooltipLayer.addChild(txt);
  S.tooltips.push({ txt, age: 0 });
}

export function updateTooltips(delta) {
  for (let i = S.tooltips.length - 1; i >= 0; i--) {
    const t = S.tooltips[i];
    t.age += delta;
    t.txt.y -= TOOLTIP_RISE_SPEED * delta;
    t.txt.alpha = Math.max(0, 1 - t.age / TOOLTIP_DURATION);
    if (t.age >= TOOLTIP_DURATION) {
      S.tooltipLayer.removeChild(t.txt);
      t.txt.destroy();
      S.tooltips.splice(i, 1);
    }
  }
}

export function createCargoLabel(cargoText) {
  const container = new PIXI.Container();
  const txt = new PIXI.Text(cargoText, CARGO_LABEL_STYLE);
  txt.anchor.set(0.5, 0.5);
  const pad = 7;
  const w = txt.width + pad * 2;
  const h = txt.height + pad * 2;
  const bg = new PIXI.Graphics();
  bg.beginFill(0x071420, 0.88);
  bg.lineStyle(1.5, 0x44cc88, 1);
  bg.drawRoundedRect(-w / 2, -h / 2, w, h, 6);
  bg.endFill();
  container.addChild(bg);
  container.addChild(txt);
  container.visible = false;
  return container;
}

// ===== Overlay Fade =====
export function fadeInOverlay() {
  // no-op: game-over screen is now HTML
}

export function scheduleGameOver() {
  if (S.gameOver || S.gameOverPending) return;
  if (S.perkPickerOpen) {
    S.perkPickerOpen = false;
    if ($screenPerkPick) $screenPerkPick.hidden = true;
  }
  S.gameOverPending = true;
  setTimeout(() => {
    const config = getGameOverReasonConfig(S.lastEnemyType);
    showGameOverScreen({
      title: t('gameOver.title'),
      reasonText: config.reasonText ? config.reasonText() : '',
      splashKey: config.splashKey,
      reason: config.reason,
      statsItems: getRunStatsItems(),
    });
  }, GAME_OVER_DELAY);
}

// ===== HUD =====
// Пишем в DOM только при смене значения — иначе на каждом тике дёргаем
// textContent впустую (лишние реплейс-ноды + layout).
const hudCache = {
  lamp: null,
  lamps: null,
  nightLabel: null,
  nightTime: null,
  nightRatio: null,
  suspicion: null,
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

let levelBannerTimer = null;

const ACHIEVEMENT_TOAST_VISIBLE_MS = 4600;
const ACHIEVEMENT_TOAST_TRANSITION_MS = 280;
const RESULT_REVEAL_DELAY_MS = 3000;
let achievementToastRoot = null;
let achievementToastTimer = null;
let achievementToastHideTimer = null;
let activeAchievementToast = null;
const achievementToastQueue = [];
let resultRevealTimer = null;
let resultRevealPending = false;
let resultRevealPointerHandler = null;
const $resultContent = $screenGameOver?.querySelector('.screen-result-content');

function setIfChanged(key, $el, value) {
  if (hudCache[key] === value) return;
  hudCache[key] = value;
  // For lamp/hearts we need HTML (spans with classes), otherwise plain text
  if (key === 'lamp' || key === 'lamps') {
    $el.innerHTML = value;
  } else {
    $el.textContent = value;
  }
}

function formatSuspicionHtml() {
  const value = Math.max(0, Math.min(SUSPICION_MAX, S.policeSuspicion || 0));
  if (value <= 0) return '';
  const pct = Math.round((value / SUSPICION_MAX) * 100);
  return `<span class="hud-suspicion" title="${escapeHtml(t('hud.suspicion'))}">👁️ ${pct}%</span>`;
}

function updateSuspicionHud() {
  if (!$hudLamps) return;
  const suspicionHtml = formatSuspicionHtml();
  const lampHtml = formatLampPowerHtml();
  const combined = suspicionHtml
    ? `${lampHtml} ${suspicionHtml}`
    : lampHtml;
  setIfChanged('lamps', $hudLamps, combined);
  if (hudCache.suspicion !== suspicionHtml) {
    hudCache.suspicion = suspicionHtml;
  }
}

function formatLampPowerHtml() {
  const slots = 5;
  const cap = getEffectiveLampBurnoutMs();
  const burnout =
    S.lampTimer < 0 ? 0 : Math.max(0, Math.min(1, S.lampTimer / cap));
  const lit = Math.max(1, Math.ceil((1 - burnout) * slots));
  const spent = slots - lit;
  const atMinimum = burnout >= 1;
  let out = '';
  for (let i = 0; i < slots; i++) {
    if (i < spent) {
      out += `<span class="hud-lamp-power hud-lamp-power--spent">💡</span>`;
    } else if (atMinimum && i === slots - 1) {
      out += `<span class="hud-lamp-power hud-lamp-power--minimum">🔦</span>`;
    } else {
      out += `<span class="hud-lamp-power">💡</span>`;
    }
  }
  return out;
}

function updateRunXpProgress() {
  if (!$hudXp || !$hudXpFill || !$hudXpValue) return;
  if (!S.gameSessionActive) {
    $hudXp.hidden = true;
    return;
  }
  $hudXp.hidden = false;

  const threshold = getRunPerkXpThreshold();
  const ratio = getRunXpProgress();
  const ratioValue = ratio.toFixed(4);
  const percent = Math.floor(ratio * 100);
  const current = Math.min(S.runXp || 0, threshold);
  const valueText = `${current}/${threshold}`;
  const currentRunLevel = levels.isFreeplay()
    ? 1
    : Math.max(1, Math.floor(S.levelIndex || 0) + 1);
  const label = t('hud.level.prefix', { n: currentRunLevel });

  if (hudCache.xpLabel !== label && $hudXpLabel) {
    hudCache.xpLabel = label;
    $hudXpLabel.textContent = label;
  }
  if (hudCache.xpValue !== valueText) {
    hudCache.xpValue = valueText;
    $hudXpValue.textContent = valueText;
    $hudXp.setAttribute('aria-valuenow', String(percent));
    $hudXp.setAttribute('aria-label', `${label}: ${valueText}`);
  }
  if (hudCache.xpRatio !== ratioValue) {
    hudCache.xpRatio = ratioValue;
    $hudXpFill.style.transform = `scaleX(${ratioValue})`;
  }
}

function updateNightProgress() {
  if (!$hudNight || !$hudNightFill || !$hudNightTime) return;

  const showNightHud = levels.isFreeplay();
  $hudNight.hidden = !showNightHud;
  if (!showNightHud) return;

  const ratio = Math.max(0, Math.min(1, S.runSurvivalMs / NIGHT_DURATION_MS));
  const ratioValue = ratio.toFixed(4);
  const percent = Math.floor(ratio * 100);
  const timeText = formatSurvivalTime(S.runSurvivalMs);
  const label = t('hud.night');

  if (hudCache.nightLabel !== label && $hudNightLabel) {
    hudCache.nightLabel = label;
    $hudNightLabel.textContent = label;
  }
  if (hudCache.nightTime !== timeText) {
    hudCache.nightTime = timeText;
    $hudNightTime.textContent = timeText;
    $hudNight.setAttribute('aria-valuenow', String(percent));
    $hudNight.setAttribute('aria-label', `${label}: ${timeText}`);
  }
  if (hudCache.nightRatio !== ratioValue) {
    hudCache.nightRatio = ratioValue;
    $hudNightFill.style.transform = `scaleX(${ratioValue})`;
  }
}

export function updateHUD() {
  // Display hearts instead of lamp burnout timer
  setIfChanged('lamp', $hudLamp, S.getHeartDisplay());
  updateSuspicionHud();
  updateRunXpProgress();
  updateNightProgress();
}

// ===== Level Banner =====
// Транзиентный оверлей по центру: появляется на старте уровня,
// держится ~1.4с (видимо), затем плавно угасает. Не блокирует ввод.
export function showLevelBanner({ titleKey, subtitleKey, params } = {}) {
  if (!$levelBanner || !$levelBannerTitle || !$levelBannerSubtitle) return;
  $levelBannerTitle.textContent = titleKey ? t(titleKey, params) : '';
  $levelBannerSubtitle.textContent = subtitleKey ? t(subtitleKey, params) : '';
  $levelBanner.hidden = false;
  // Force reflow before adding class so the transition fires reliably.
  void $levelBanner.offsetWidth;
  $levelBanner.classList.add('is-visible');
  if (levelBannerTimer) {
    clearTimeout(levelBannerTimer);
    levelBannerTimer = null;
  }
  levelBannerTimer = window.setTimeout(() => {
    if (!$levelBanner) return;
    $levelBanner.classList.remove('is-visible');
    levelBannerTimer = window.setTimeout(() => {
      if ($levelBanner) $levelBanner.hidden = true;
      levelBannerTimer = null;
    }, 600);
  }, 4200);
}

export function hideLevelBanner() {
  if (!$levelBanner) return;
  if (levelBannerTimer) {
    clearTimeout(levelBannerTimer);
    levelBannerTimer = null;
  }
  $levelBanner.classList.remove('is-visible');
  $levelBanner.hidden = true;
}

function clearResultRevealTimer() {
  if (!resultRevealTimer) return;
  clearTimeout(resultRevealTimer);
  resultRevealTimer = null;
}

function detachResultRevealPointerHandler() {
  if (!$screenGameOver || !resultRevealPointerHandler) return;
  $screenGameOver.removeEventListener(
    'pointerdown',
    resultRevealPointerHandler,
  );
  resultRevealPointerHandler = null;
}

function revealResultContentNow() {
  if (!resultRevealPending) return false;

  resultRevealPending = false;
  clearResultRevealTimer();
  detachResultRevealPointerHandler();

  if ($screenGameOver) {
    $screenGameOver.classList.remove('is-reveal-pending');
    $screenGameOver.classList.add('is-result-visible');
  }

  return true;
}

function scheduleResultReveal() {
  if (!$screenGameOver) return;

  if (!$resultContent) {
    $screenGameOver.classList.remove('is-reveal-pending');
    $screenGameOver.classList.add('is-result-visible');
    return;
  }

  resultRevealPending = true;
  $screenGameOver.classList.add('is-reveal-pending');
  $screenGameOver.classList.remove('is-result-visible');

  resultRevealPointerHandler = () => {
    revealResultContentNow();
  };
  $screenGameOver.addEventListener('pointerdown', resultRevealPointerHandler);

  resultRevealTimer = window.setTimeout(() => {
    resultRevealTimer = null;
    revealResultContentNow();
  }, RESULT_REVEAL_DELAY_MS);
}

export function fastForwardResultReveal() {
  return revealResultContentNow();
}

export function resetResultRevealState() {
  resultRevealPending = false;
  clearResultRevealTimer();
  detachResultRevealPointerHandler();
  if ($screenGameOver) {
    $screenGameOver.classList.remove('is-reveal-pending');
    $screenGameOver.classList.remove('is-result-visible');
  }
}

function ensureAchievementToastRoot() {
  if (achievementToastRoot && achievementToastRoot.isConnected) {
    return achievementToastRoot;
  }

  if ($achievementToastLayer) {
    achievementToastRoot = $achievementToastLayer;
    return achievementToastRoot;
  }

  return null;
}

function cloneTemplateFirstElement(id) {
  const template = document.getElementById(id);
  const first = template?.content?.firstElementChild;
  return first ? first.cloneNode(true) : null;
}

function createAchievementToastElement(payload) {
  const toast = cloneTemplateFirstElement('$achievementToastTemplate');
  if (!(toast instanceof HTMLElement)) return null;

  const icon = toast.querySelector('.achievement-toast-icon');
  const eyebrow = toast.querySelector('.achievement-toast-eyebrow');
  const title = toast.querySelector('.achievement-toast-title');
  const desc = toast.querySelector('.achievement-toast-desc');
  const points = toast.querySelector('.achievement-toast-points');

  if (icon) icon.textContent = payload.icon || '🏅';
  if (eyebrow) eyebrow.textContent = t('achievements.toast.unlocked');
  if (title) title.textContent = payload.titleKey ? t(payload.titleKey) : '';
  if (desc) desc.textContent = payload.descKey ? t(payload.descKey) : '';

  if (points) {
    if (payload.points > 0) {
      points.hidden = false;
      points.textContent = t('achievements.toast.points', {
        points: payload.points,
      });
    } else {
      points.hidden = true;
      points.textContent = '';
    }
  }

  return toast;
}

function hideActiveAchievementToast() {
  if (!activeAchievementToast) return;
  const toast = activeAchievementToast;
  activeAchievementToast = null;
  toast.classList.remove('is-visible');
  if (achievementToastHideTimer) clearTimeout(achievementToastHideTimer);
  achievementToastHideTimer = window.setTimeout(() => {
    if (toast.parentNode) toast.parentNode.removeChild(toast);
    achievementToastHideTimer = null;
    showNextAchievementToast();
  }, ACHIEVEMENT_TOAST_TRANSITION_MS);
}

function showNextAchievementToast() {
  if (activeAchievementToast || achievementToastQueue.length === 0) return;

  const payload = achievementToastQueue.shift();
  if (!payload) return;

  const root = ensureAchievementToastRoot();
  if (!(root instanceof HTMLElement)) return;

  const toast = createAchievementToastElement(payload);
  if (!(toast instanceof HTMLElement)) return;

  root.appendChild(toast);
  activeAchievementToast = toast;
  requestAnimationFrame(() => {
    if (toast === activeAchievementToast) toast.classList.add('is-visible');
  });

  if (achievementToastTimer) clearTimeout(achievementToastTimer);
  achievementToastTimer = window.setTimeout(() => {
    achievementToastTimer = null;
    hideActiveAchievementToast();
  }, ACHIEVEMENT_TOAST_VISIBLE_MS);
}

export function queueAchievementUnlockToast(payload) {
  if (!payload || !payload.id || !payload.titleKey) return;
  achievementToastQueue.push({
    id: payload.id,
    icon: payload.icon,
    titleKey: payload.titleKey,
    descKey: payload.descKey,
    points: Number(payload.points) || 0,
  });
  showNextAchievementToast();
}

// ===== Build HUD =====
export function buildHUD() {
  // HUD now lives in HTML (#$hud). Nothing to build in PIXI.
}

// ===== Build Buttons =====
function bindTurnButton(button, keyCode) {
  button.interactive = true;
  button.buttonMode = true;
  button.cursor = 'pointer';
  button.hitArea = new PIXI.Circle(0, 0, 44);

  const press = () => {
    S.keys[keyCode] = true;
  };
  const release = () => {
    S.keys[keyCode] = false;
  };

  button.on('pointerdown', press);
  button.on('pointerup', release);
  button.on('pointerupoutside', release);
  button.on('pointercancel', release);
  button.on('pointerout', release);
}

export function buildButtons() {
  // ===== Left / Right turn buttons (HTML) =====
  function bindHtmlTurnButton($btn, keyCode) {
    const press = () => {
      S.keys[keyCode] = true;
    };
    const release = () => {
      S.keys[keyCode] = false;
    };
    $btn.addEventListener('pointerdown', press);
    $btn.addEventListener('pointerup', release);
    $btn.addEventListener('pointercancel', release);
    $btn.addEventListener('pointerleave', release);
  }

  bindHtmlTurnButton($btnLeft, 'ArrowLeft');
  bindHtmlTurnButton($btnRight, 'ArrowRight');

  // ===== Volume controls (HTML, top-left of screen) =====
  const STEP = 0.1;

  function applyVol(target, v) {
    if (target === 'sfx') {
      S.sfxVolume = v;
      if (S.wavesSound) void syncLoopingAudio(S.wavesSound, 0.05 * v);
      try {
        localStorage.setItem('lighthouse_sfx_vol', String(v));
      } catch (_) {}
      $volSfxVal.textContent = `${Math.round(v * 100)}%`;
    } else {
      S.musicVolume = v;
      if (S.musicSound) void syncLoopingAudio(S.musicSound, MUSIC_VOLUME * v);
      try {
        localStorage.setItem('lighthouse_music_vol', String(v));
      } catch (_) {}
      $volMusicVal.textContent = `${Math.round(v * 100)}%`;
    }
  }

  // Init displayed values
  $volSfxVal.textContent = `${Math.round((S.sfxVolume ?? 0.5) * 100)}%`;
  $volMusicVal.textContent = `${Math.round((S.musicVolume ?? 0.5) * 100)}%`;

  $volControls.addEventListener('pointerdown', (e) => {
    const $btn = e.target.closest('.vol-btn');
    if (!$btn) return;
    const target = $btn.dataset.target;
    const dir = Number($btn.dataset.dir);
    const cur =
      target === 'sfx' ? (S.sfxVolume ?? 0.5) : (S.musicVolume ?? 0.5);
    const v = Math.min(
      1,
      Math.max(0, Math.round((cur + dir * STEP) * 10) / 10),
    );
    applyVol(target, v);
  });
}

function buildVolumeBtn(label) {}
function buildVolumeControls() {}
export function buildOverlay() {
  // Minimal PIXI stub — game-over/exit-confirm screens are HTML
  S.overlayLayer = new PIXI.Container();
  S.overlayLayer.visible = false;
  S.overlayBg = new PIXI.Graphics();
  S.overlayLayer.addChild(S.overlayBg);
  S.app.stage.addChild(S.overlayLayer);
}

function positionSplashSprite() {}

export function repositionUI() {
  // HUD positioning is handled by CSS (fixed top-right).
  if (!$screenGameOver?.hidden) {
    void updateResultSplashPan(currentResultSplashImage);
  }
}

export function buildUI() {
  buildHUD();
  buildButtons();
  buildOverlay();
  repositionUI();
}

// ===== HTML Game Over / Win screen =====
const SPLASH_IMAGES = {
  splashIceberg: 'sprites/wasted/iceberg.png',
  splashMermaid: 'sprites/wasted/mermaid.png',
  splashKraken: 'sprites/wasted/kraken.png',
  splashPolice: 'sprites/wasted/police.png',
  splashPeremoha: 'sprites/wasted/peremoha.png',
};
const RESULT_BG_PAN_CLASS = 'is-panning';
const resultSplashImageMetrics = new Map();
let activeSplashPanRequest = 0;
let currentResultSplashImage = '';

const GAME_OVER_REASONS = {
  police: {
    reasonText: () => t('gameOver.police'),
    splashKey: 'splashPolice',
    reason: 'police',
  },
  mermaid: {
    reasonText: () => t('gameOver.mermaids'),
    splashKey: 'splashMermaid',
    reason: 'mermaid',
  },
  kraken: {
    reasonText: () => t('gameOver.kraken'),
    splashKey: 'splashKraken',
    reason: 'kraken',
  },
  'boat-sink': {
    reasonText: () => t('gameOver.boats'),
    splashKey: 'splashIceberg',
    reason: 'boats_sunk',
  },
  unknown: {
    splashKey: 'splashIceberg',
    reason: 'unknown',
  },
};

function getGameOverReasonConfig(enemyType) {
  return GAME_OVER_REASONS[enemyType] || GAME_OVER_REASONS.unknown;
}

function getImageMetrics(src) {
  if (!src) return Promise.resolve(null);
  if (resultSplashImageMetrics.has(src)) {
    return Promise.resolve(resultSplashImageMetrics.get(src));
  }

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const metrics = {
        width: image.naturalWidth || image.width || 0,
        height: image.naturalHeight || image.height || 0,
      };
      resultSplashImageMetrics.set(src, metrics);
      resolve(metrics);
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function shouldPanResultSplash(metrics) {
  if (!metrics?.width || !metrics?.height) return false;
  const viewportWidth = window.innerWidth || 0;
  const viewportHeight = window.innerHeight || 0;
  if (!viewportWidth || !viewportHeight) return false;

  return metrics.width / metrics.height > viewportWidth / viewportHeight;
}

async function updateResultSplashPan(src) {
  if (!$resultSplash) return;

  const requestId = ++activeSplashPanRequest;
  $resultSplash.classList.remove(RESULT_BG_PAN_CLASS);
  $resultSplash.style.backgroundPosition = 'center center';

  if (!src) return;

  const metrics = await getImageMetrics(src);
  if (requestId !== activeSplashPanRequest) return;
  if (!shouldPanResultSplash(metrics)) return;

  $resultSplash.style.backgroundPosition = 'right center';
  void $resultSplash.offsetWidth;
  if (requestId !== activeSplashPanRequest) return;
  $resultSplash.classList.add(RESULT_BG_PAN_CLASS);
}

async function showGameOverScreen({
  title,
  reasonText = '',
  splashKey,
  playFail = true,
  reason,
  statsItems = [],
}) {
  S.gameOver = true;
  resetResultRevealState();
  if (playFail) playFailSound();

  if (reason) trackGameEnd(reason, S);

  $gameContainer.hidden = true;

  $resultTitle.textContent = title;
  $resultReason.textContent = reasonText;
  $resultReason.hidden = !reasonText;
  $resultRestartLabel.textContent = t('overlay.restart');
  $resultMenuLabel.textContent = t('overlay.toMenu');
  if ($btnResultRestart) $btnResultRestart.hidden = false;
  if ($btnResultMenu) $btnResultMenu.hidden = false;

  renderResultStats(statsItems);

  if (splashKey && SPLASH_IMAGES[splashKey]) {
    currentResultSplashImage = SPLASH_IMAGES[splashKey];
    $resultSplash.style.backgroundImage = `url("${currentResultSplashImage}")`;
    void updateResultSplashPan(currentResultSplashImage);
  } else {
    currentResultSplashImage = '';
    $resultSplash.style.backgroundImage = '';
    void updateResultSplashPan('');
  }

  scheduleResultReveal();
  $screenGameOver.hidden = false;
}

function getRunStatsItems() {
  const stats = S.runStats || {};
  return [
    {
      icon: '🛥️',
      label: t('resultStats.deliveredBoats'),
      value: stats.deliveredBoats || S.score || 0,
    },
    {
      icon: '💀',
      label: t('resultStats.smugglersSunk'),
      value: stats.smugglersSunk || 0,
    },
    {
      icon: '🚔',
      label: t('resultStats.sunkCops'),
      value: stats.sunkCops || 0,
    },
    {
      icon: '🧜',
      label: t('resultStats.repelledMermaids'),
      value: stats.repelledMermaids || 0,
    },
    {
      icon: '🦑',
      label: t('resultStats.repelledKraken'),
      value: stats.repelledKraken || 0,
    },
    {
      icon: '🚨',
      label: t('resultStats.copsArrived'),
      value: stats.copsArrived || S.policeArrived || 0,
    },
    {
      icon: '💀',
      label: t('resultStats.mermaidsArrived'),
      value: stats.mermaidsArrived || S.mermaidsArrived || 0,
    },
    {
      icon: '🦑',
      label: t('resultStats.krakensArrived'),
      value: stats.krakensArrived || S.krakensArrived || 0,
    },
    {
      section: 'time',
      icon: '⭐',
      label: t('resultStats.playerLevel'),
      value: levels.isFreeplay()
        ? 1
        : Math.max(1, Math.floor(S.levelIndex || 0) + 1),
    },
    {
      section: 'time',
      icon: '⏰',
      label: t('win.statTime'),
      value: formatSurvivalTime(S.runSurvivalMs),
    },
  ];
}

function getCollectedCargoItems() {
  const deliveredCargo = S.deliveredCargo || {};
  return BOAT_CARGO_TYPES.map((type) => ({
    icon: type,
    label: t(`cargo.${type}`),
    value: Math.max(0, Math.floor(deliveredCargo[type] || 0)),
  }));
}

function renderResultStats(items) {
  if (!$resultStats) return;
  $resultStats.replaceChildren();

  const cargoItems = getCollectedCargoItems();
  const timeItems = items.filter((item) => item.section === 'time');
  const runItems = items.filter((item) => item.section !== 'time');
  const sections = [
    { key: 'time', title: t('win.statTime'), items: timeItems },
    { key: 'cargo', title: t('resultStats.cargoTitle'), items: cargoItems },
    { key: 'review', title: t('resultStats.title'), items: runItems },
  ].filter((section) => section.items.length > 0);

  let renderedPanels = 0;
  for (const section of sections) {
    const panel = createResultStatsPanel(section.title, section.key);
    if (!(panel instanceof HTMLElement)) continue;

    for (const item of section.items) {
      const row = createResultStatRow(item);
      if (row) panel.appendChild(row);
    }

    $resultStats.appendChild(panel);
    renderedPanels += 1;
  }
  $resultStats.hidden = renderedPanels === 0;
}

function createResultStatRow({ icon, label, value }) {
  const stat = cloneTemplateFirstElement('$resultStatsRowTemplate');
  if (!(stat instanceof HTMLElement)) return null;

  const iconEl = stat.querySelector('.screen-result-stat-icon');
  const text = stat.querySelector('.screen-result-stat-label');
  const valueEl = stat.querySelector('.screen-result-stat-value');

  if (iconEl) iconEl.textContent = icon;
  if (text) text.textContent = label;
  if (valueEl) valueEl.textContent = String(value);

  return stat;
}

function createResultStatsPanel(titleText, sectionKey) {
  const panel = cloneTemplateFirstElement('$resultStatsPanelTemplate');
  if (!(panel instanceof HTMLElement)) return null;

  if (sectionKey) {
    panel.classList.add(`screen-result-stats-panel--${sectionKey}`);
  }

  const title = panel.querySelector('.screen-result-stats-title');
  if (title) title.textContent = titleText;

  return panel;
}

export async function showWin() {
  await showGameOverScreen({
    title: t('win.title'),
    reasonText: t('win.nightSubtitle'),
    splashKey: 'splashPeremoha',
    playFail: false,
    reason: 'win',
    statsItems: getRunStatsItems(),
  });
  $resultRestartLabel.textContent = t('overlay.continue');
  $resultMenuLabel.textContent = t('overlay.toMenu');
}

// ===== Exit Confirmation =====
export function showExitConfirm() {
  S.exitConfirm = true;
  $exitConfirmMsg.textContent = t('exit.confirm');
  $exitConfirmLabel.textContent = t('overlay.exit');
  $exitSettingsLabel.textContent = t('exit.settings');
  $exitResumeLabel.textContent = t('overlay.resume');
  $screenExitConfirm.hidden = false;
}

export function hideExitConfirm() {
  S.exitConfirm = false;
  $screenExitConfirm.hidden = true;
}
