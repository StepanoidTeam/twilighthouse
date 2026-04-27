import {
  PIXI,
  UI_STYLE,
  TOOLTIP_RISE_SPEED,
  TOOLTIP_DURATION,
  BOAT_CARGO_TYPES,
  CARGO_LABEL_STYLE,
  WIN_SCORE,
  LAMP_BURNOUT_TIME,
  GAME_OVER_DELAY,
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
  $resultMsg,
  $resultRestartLabel,
  $resultMenuLabel,
  $resultSplash,
  $screenGameOver,
  $exitConfirmMsg,
  $exitConfirmLabel,
  $exitResumeLabel,
  $screenExitConfirm,
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

export function scheduleGameOver(fn) {
  if (S.gameOver || S.gameOverPending) return;
  S.gameOverPending = true;
  setTimeout(fn, GAME_OVER_DELAY);
}

// ===== HUD =====
export function updateHUD() {
  const cargoStr = BOAT_CARGO_TYPES.map((t) =>
    S.deliveredCargo[t] > 0 ? `${t}${S.deliveredCargo[t]}` : null,
  )
    .filter(Boolean)
    .join(' ');
  S.txtScore.text = cargoStr || '📦×0';
  S.txtLives.text = '❤️'.repeat(Math.max(0, S.lives));
  S.txtMermaids.text = `🧜 ${S.mermaidsArrived}/3`;
  // Ящики колумбийского, которые прячет Паттисон.
  // Каждый освещённый коп = -1 ящик. Ноль — Дефо выкидывает Паттисона.
  S.txtPolice.text = `❄️${'📦'.repeat(Math.max(0, S.crates))}`;
  const bulbs = Math.max(
    0,
    Math.round((1 - S.lampTimer / LAMP_BURNOUT_TIME) * 5),
  );
  S.txtLamp.text = bulbs > 0 ? '💡'.repeat(bulbs) : '🔦';
  S.txtSunk.text = `⛵💥 ${S.boatsSunk}/6`;
  if (S.txtTime) {
    S.txtTime.text = `⏱ ${formatSurvivalTime(S.runSurvivalMs)}`;
  }
}

// ===== Build HUD =====
export function buildHUD() {
  S.hudLayer = new PIXI.Container();

  S.txtLives = new PIXI.Text('❤️❤️❤️', new PIXI.TextStyle(UI_STYLE));
  S.txtLives.anchor.set(1, 0);
  S.hudLayer.addChild(S.txtLives);

  S.txtScore = new PIXI.Text('📦×0', new PIXI.TextStyle(UI_STYLE));
  S.txtScore.anchor.set(1, 0);
  S.hudLayer.addChild(S.txtScore);

  S.txtMermaids = new PIXI.Text('🧜 0/3', new PIXI.TextStyle(UI_STYLE));
  S.txtMermaids.anchor.set(1, 0);
  S.hudLayer.addChild(S.txtMermaids);

  S.txtPolice = new PIXI.Text('❄️📦📦📦', new PIXI.TextStyle(UI_STYLE));
  S.txtPolice.anchor.set(1, 0);
  S.hudLayer.addChild(S.txtPolice);

  S.txtLamp = new PIXI.Text('💡💡💡💡💡', new PIXI.TextStyle(UI_STYLE));
  S.txtLamp.anchor.set(1, 0);
  S.hudLayer.addChild(S.txtLamp);

  S.txtSunk = new PIXI.Text('⛵💥 0/6', new PIXI.TextStyle(UI_STYLE));
  S.txtSunk.anchor.set(1, 0);
  S.hudLayer.addChild(S.txtSunk);

  S.txtTime = new PIXI.Text('⏱ 0:00', new PIXI.TextStyle(UI_STYLE));
  S.txtTime.anchor.set(1, 0);
  S.hudLayer.addChild(S.txtTime);

  S.app.stage.addChild(S.hudLayer);
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
  const HUD_RIGHT = S.gameW - 12;
  const HUD_LINE = 28;
  S.txtLives.position.set(HUD_RIGHT, 12);
  S.txtScore.position.set(HUD_RIGHT, 12 + HUD_LINE);
  S.txtMermaids.position.set(HUD_RIGHT, 12 + HUD_LINE * 2);
  S.txtPolice.position.set(HUD_RIGHT, 12 + HUD_LINE * 3);
  S.txtLamp.position.set(HUD_RIGHT, 12 + HUD_LINE * 4);
  S.txtSunk.position.set(HUD_RIGHT, 12 + HUD_LINE * 5);
  if (S.txtTime) S.txtTime.position.set(HUD_RIGHT, 12 + HUD_LINE * 6);
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
  message,
  splashKey,
  playFail = true,
  reason,
}) {
  S.gameOver = true;
  if (playFail) playFailSound();

  if (reason) trackGameEnd(reason, S);

  $gameContainer.hidden = true;

  $resultMsg.textContent = message;
  $resultRestartLabel.textContent = t('overlay.restart');
  $resultMenuLabel.textContent = t('overlay.toMenu');
  if ($btnResultRestart) $btnResultRestart.hidden = false;
  if ($btnResultMenu) $btnResultMenu.hidden = false;

  if (splashKey && SPLASH_IMAGES[splashKey]) {
    $resultSplash.style.backgroundImage = `url("${SPLASH_IMAGES[splashKey]}")`;
  } else {
    $resultSplash.style.backgroundImage = '';
  }

  $screenGameOver.hidden = false;
}

export function showBoatGameOver() {
  return showGameOverScreen({
    message: t('gameOver.boats', { n: S.boatsSunk }),
    splashKey: 'splashIceberg',
    reason: 'boats_sunk',
  });
}

export function showPoliceGameOver() {
  return showGameOverScreen({
    message: t('gameOver.police'),
    splashKey: 'splashPolice',
    reason: 'police',
  });
}

export function showPattinsonGameOver() {
  return showGameOverScreen({
    message: t('gameOver.pattinson'),
    splashKey: 'splashPattinson',
    reason: 'pattinson',
  });
}

export function showMermaidGameOver() {
  return showGameOverScreen({
    message: t('gameOver.mermaids', { n: S.mermaidsArrived }),
    splashKey: 'splashMermaid',
    reason: 'mermaid',
  });
}

export function showKrakenGameOver() {
  return showGameOverScreen({
    message: t('gameOver.kraken'),
    splashKey: 'splashKraken',
    reason: 'kraken',
  });
}

export function showGameOver() {
  S.gameOver = true;
  playFailSound();
  trackGameEnd('lives_lost', S);



  $gameContainer.hidden = true;
  $resultMsg.textContent = t('gameOver.score', {
    score: S.score,
    total: WIN_SCORE,
  });
  $resultRestartLabel.textContent = t('overlay.restart');
  $resultMenuLabel.textContent = t('overlay.toMenu');
  $resultSplash.style.backgroundImage = '';
  $screenGameOver.hidden = false;
}

export async function showWin() {
  const finalTime = formatSurvivalTime(S.runSurvivalMs);
  await showGameOverScreen({
    message: t('win.messageTime', {
      total: WIN_SCORE,
      time: finalTime,
    }),
    splashKey: 'splashPeremoha',
    playFail: false,
    reason: 'win',
  });
  $resultRestartLabel.textContent = t('menu.leaderboard');
  $resultMenuLabel.textContent = t('menu.leaderboard');
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
