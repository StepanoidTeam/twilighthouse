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
import { t, pluralCategory } from './i18n.js';
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
  $exitConfirmMsg,
  $exitConfirmLabel,
  $exitResumeLabel,
  $screenExitConfirm,
  $hudLamp,
  $hudLamps,
  $hudNight,
  $hudNightFill,
  $hudNightLabel,
  $hudNightTime,
  $hudLevel,
  $levelBanner,
  $levelBannerTitle,
  $levelBannerSubtitle,
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
  level: null,
};

// ===== Level Goal HUD =====
// Чек-лист подцелей: одна строка на подцель, выполненная — с галочкой
// и зачёркнутая, текущая — с пустым чекбоксом и конкретным заданием
// ("Сопроводи 3 контрабандиста" и т.п. — глагол + существительное в нужной форме).
function formatGoalLabel(key, target) {
  const cat = pluralCategory(target);
  const label = t(`goal.${key}.${cat}`, { n: target });
  if (label && label !== `goal.${key}.${cat}`) return label;
  // Fallback: ключ без перевода — покажем хотя бы счётчик.
  return `${target}`;
}

function formatLevelHudHtml() {
  if (!S.gameSessionActive) return '';
  const idx = (S.levelIndex || 0) + 1;
  const goal = S.levelGoal || {};
  if (Object.keys(goal).length === 0) return '';
  const progress = S.levelProgress || {};
  const headKey = idx <= 3 ? 'hud.lesson.prefix' : 'hud.level.prefix';
  const head = `<div class="hud-level-head">${escapeHtml(
    t(headKey, { n: idx }),
  )}</div>`;
  const rows = [];
  for (const [key, target] of Object.entries(goal)) {
    if (!target) continue;
    const cur = Math.min(progress[key] || 0, target);
    const done = cur >= target;
    const box = done ? '✅' : '☐';
    const label = escapeHtml(formatGoalLabel(key, target));
    rows.push(
      `<div class="hud-level-row${done ? ' is-done' : ''}">` +
        `<span class="hud-level-box">${box}</span>` +
        `<span class="hud-level-label">${label}</span>` +
        `<span class="hud-level-count">${cur}/${target}</span>` +
        `</div>`,
    );
  }
  if (rows.length === 0) {
    rows.push(
      `<div class="hud-level-row"><span class="hud-level-box">☐</span>` +
        `<span class="hud-level-label">${escapeHtml(t('hud.level.idle'))}</span></div>`,
    );
  }
  return head + rows.join('');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

let levelBannerTimer = null;

const ACHIEVEMENT_TOAST_VISIBLE_MS = 3400;
const ACHIEVEMENT_TOAST_TRANSITION_MS = 280;
let achievementToastRoot = null;
let achievementToastTimer = null;
let achievementToastHideTimer = null;
let activeAchievementToast = null;
const achievementToastQueue = [];

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

function formatLampPowerHtml() {
  const slots = 5;
  const cap = Math.max(1, S.lampBurnoutMs || LAMP_BURNOUT_TIME);
  const burnout = Math.max(0, Math.min(1, S.lampTimer / cap));
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
  setIfChanged('lamps', $hudLamps, formatLampPowerHtml());
  updateNightProgress();
  if ($hudLevel) {
    const levelHtml = formatLevelHudHtml();
    if (hudCache.level !== levelHtml) {
      hudCache.level = levelHtml;
      $hudLevel.innerHTML = levelHtml;
      $hudLevel.hidden = !levelHtml;
    }
  }
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

function ensureAchievementToastRoot() {
  if (achievementToastRoot && achievementToastRoot.isConnected) {
    return achievementToastRoot;
  }
  const root = document.createElement('div');
  root.className = 'achievement-toast-layer';
  root.setAttribute('aria-live', 'polite');
  root.setAttribute('aria-atomic', 'true');
  document.body.appendChild(root);
  achievementToastRoot = root;
  return root;
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
  const toast = document.createElement('article');
  toast.className = 'achievement-toast';

  const icon = document.createElement('span');
  icon.className = 'achievement-toast-icon';
  icon.textContent = payload.icon || '🏅';

  const body = document.createElement('div');
  body.className = 'achievement-toast-body';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'achievement-toast-eyebrow';
  eyebrow.textContent = t('achievements.toast.unlocked');

  const title = document.createElement('p');
  title.className = 'achievement-toast-title';
  title.textContent = payload.titleKey ? t(payload.titleKey) : '';

  const desc = document.createElement('p');
  desc.className = 'achievement-toast-desc';
  desc.textContent = payload.descKey ? t(payload.descKey) : '';

  body.appendChild(eyebrow);
  body.appendChild(title);
  body.appendChild(desc);

  toast.appendChild(icon);
  toast.appendChild(body);

  if (payload.points > 0) {
    const points = document.createElement('span');
    points.className = 'achievement-toast-points';
    points.textContent = t('achievements.toast.points', {
      points: payload.points,
    });
    toast.appendChild(points);
  }

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

const GAME_OVER_REASONS = {
  police: {
    reasonText: () => t('gameOver.police'),
    splashKey: 'splashPolice',
    reason: 'police',
  },
  mermaid: {
    reasonText: () => t('gameOver.mermaids', { n: S.mermaidsArrived }),
    splashKey: 'splashMermaid',
    reason: 'mermaid',
  },
  kraken: {
    reasonText: () => t('gameOver.kraken'),
    splashKey: 'splashKraken',
    reason: 'kraken',
  },
  'boat-sink': {
    reasonText: () => t('gameOver.boats', { n: S.boatsSunk }),
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

async function showGameOverScreen({
  title,
  reasonText = '',
  splashKey,
  playFail = true,
  reason,
  statsItems = [],
}) {
  S.gameOver = true;
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
    $resultSplash.style.backgroundImage = `url("${SPLASH_IMAGES[splashKey]}")`;
  } else {
    $resultSplash.style.backgroundImage = '';
  }

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
    { title: t('resultStats.cargoTitle'), items: cargoItems },
    { title: t('resultStats.title'), items: runItems },
    { title: t('win.statTime'), items: timeItems },
  ].filter((section) => section.items.length > 0);

  for (const section of sections) {
    const panel = document.createElement('section');
    panel.className = 'screen-result-stats-panel';

    const title = document.createElement('h2');
    title.className = 'screen-result-stats-title';
    title.textContent = section.title;
    panel.appendChild(title);

    for (const item of section.items) {
      panel.appendChild(createResultStatRow(item));
    }

    $resultStats.appendChild(panel);
  }
  $resultStats.hidden = sections.length === 0;
}

function createResultStatRow({ icon, label, value }) {
  const stat = document.createElement('div');
  stat.className = 'screen-result-stat';
  const iconEl = document.createElement('span');
  iconEl.className = 'screen-result-stat-icon';
  iconEl.textContent = icon;
  const text = document.createElement('span');
  text.className = 'screen-result-stat-label';
  text.textContent = label;
  const valueEl = document.createElement('span');
  valueEl.className = 'screen-result-stat-value';
  valueEl.textContent = value;
  stat.appendChild(iconEl);
  stat.appendChild(text);
  stat.appendChild(valueEl);
  return stat;
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
  $exitResumeLabel.textContent = t('overlay.resume');
  $screenExitConfirm.hidden = false;
}

export function hideExitConfirm() {
  S.exitConfirm = false;
  $screenExitConfirm.hidden = true;
}
