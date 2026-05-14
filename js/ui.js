import {
  PIXI,
  TOOLTIP_RISE_SPEED,
  TOOLTIP_DURATION,
  CARGO_LABEL_STYLE,
  LAMP_BURNOUT_TIME,
  GAME_OVER_DELAY,
  NIGHT_DURATION_MS,
  BOAT_CARGO_TYPES,
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
    // Determine which game over screen to show based on lastEnemyType
    switch (S.lastEnemyType) {
      case 'police':
        showGameOverScreen({
          title: t('gameOver.title'),
          reasonText: t('gameOver.police'),
          splashKey: 'splashPolice',
          reason: 'police',
          statsItems: getRunStatsItems(),
        });
        break;
      case 'mermaid':
        showGameOverScreen({
          title: t('gameOver.title'),
          reasonText: t('gameOver.mermaids', { n: S.mermaidsArrived }),
          splashKey: 'splashMermaid',
          reason: 'mermaid',
          statsItems: getRunStatsItems(),
        });
        break;
      case 'kraken':
        showGameOverScreen({
          title: t('gameOver.title'),
          reasonText: t('gameOver.kraken'),
          splashKey: 'splashKraken',
          reason: 'kraken',
          statsItems: getRunStatsItems(),
        });
        break;
      case 'boat-sink':
        showGameOverScreen({
          title: t('gameOver.title'),
          reasonText: t('gameOver.boats', { n: S.boatsSunk }),
          splashKey: 'splashIceberg',
          reason: 'boats_sunk',
          statsItems: getRunStatsItems(),
        });
        break;
      default:
        showGameOverScreen({
          title: t('gameOver.title'),
          splashKey: 'splashIceberg',
          reason: 'unknown',
          statsItems: getRunStatsItems(),
        });
    }
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
  splashPattinson: 'sprites/wasted/pattinson.png',
  splashPeremoha: 'sprites/wasted/peremoha.png',
};

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
  const cargoStats = BOAT_CARGO_TYPES.map((type) => ({
    icon: type,
    label: t(`cargo.${type}`),
    value: S.deliveredCargo[type] || 0,
  }));
  return [
    ...cargoStats,
    {
      icon: '⏰',
      label: t('win.statTime'),
      value: formatSurvivalTime(S.runSurvivalMs),
    },
  ];
}

function renderResultStats(items) {
  if (!$resultStats) return;
  $resultStats.replaceChildren();
  for (const { icon, label, value } of items) {
    const stat = document.createElement('div');
    stat.className = 'screen-result-stat';
    const iconEl = document.createElement('span');
    iconEl.className = 'screen-result-stat-icon';
    iconEl.textContent = icon;
    const text = document.createElement('span');
    text.textContent = `${label}: ${value}`;
    stat.appendChild(iconEl);
    stat.appendChild(text);
    $resultStats.appendChild(stat);
  }
  $resultStats.hidden = items.length === 0;
}

export function showBoatGameOver() {
  return showGameOverScreen({
    title: t('gameOver.title'),
    reasonText: t('gameOver.boats', { n: S.boatsSunk }),
    splashKey: 'splashIceberg',
    reason: 'boats_sunk',
    statsItems: getRunStatsItems(),
  });
}

export function showPoliceGameOver() {
  return showGameOverScreen({
    title: t('gameOver.title'),
    reasonText: t('gameOver.police'),
    splashKey: 'splashPolice',
    reason: 'police',
    statsItems: getRunStatsItems(),
  });
}

export function showPattinsonGameOver() {
  return showGameOverScreen({
    title: t('gameOver.title'),
    reasonText: t('gameOver.pattinson'),
    splashKey: 'splashPattinson',
    reason: 'pattinson',
    statsItems: getRunStatsItems(),
  });
}

export function showMermaidGameOver() {
  return showGameOverScreen({
    title: t('gameOver.title'),
    reasonText: t('gameOver.mermaids', { n: S.mermaidsArrived }),
    splashKey: 'splashMermaid',
    reason: 'mermaid',
    statsItems: getRunStatsItems(),
  });
}

export function showKrakenGameOver() {
  return showGameOverScreen({
    title: t('gameOver.title'),
    reasonText: t('gameOver.kraken'),
    splashKey: 'splashKraken',
    reason: 'kraken',
    statsItems: getRunStatsItems(),
  });
}

export async function showWin() {
  await showGameOverScreen({
    title: t('win.nightMessage'),
    splashKey: 'splashPeremoha',
    playFail: false,
    reason: 'win',
    statsItems: getRunStatsItems(),
  });
  $resultRestartLabel.textContent = t('menu.leaderboard');
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
