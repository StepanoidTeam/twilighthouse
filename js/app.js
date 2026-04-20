import { analytics, logEvent } from '../firebase.init.js';

import {
  PIXI,
  C,
  SPRITE_FILES,
  BEAM_ROTATE_SPEED,
  LAMP_FULL_ANGLE,
  LAMP_MIN_ANGLE,
  LAMP_BURNOUT_TIME,
  LAMP_FLICKER_START,
  SPAWN_INTERVAL_MIN,
  SPAWN_INTERVAL_MAX,
  DARKNESS_PAD,
} from './config.js';
import { playSound } from './sound.js';
import { isConfirmKey, isBackKey } from './input.js';
import S from './state.js';

import { buildLighthouse, buildGlow } from './lighthouse.js';
import { buildRocks, updateRocks } from './rocks.js';
import { buildDarkness, updateDarkness } from './darkness.js';
import { updateCamera } from './camera.js';
import {
  buildUI,
  updateHUD,
  updateTooltips,
  repositionUI,
  showExitConfirm,
  hideExitConfirm,
} from './ui.js';
import { spawnBoat, updateBoats, drawWakes, cleanupBoats } from './boat.js';
import { spawnMermaid, updateMermaids, cleanupMermaids } from './mermaid.js';
import { spawnKraken, updateKrakens, cleanupKrakens } from './kraken.js';
import { spawnPoliceBoat, updatePoliceBoats, cleanupPolice } from './police.js';
import { buildDebug, updateDebug } from './debug.js';
import { buildMenu, showMenu, isMenuVisible, repositionMenu } from './menu.js';
import { showIntro } from './intro.js';
import { submitScore } from './leaderboard.js';
import { currentUser } from './auth.js';

const $gameContainer = document.getElementById('$gameContainer');

function playClickSound() {
  playSound('audio/button-click.mp3', 0.2);
}

// ===== Resize =====
function resize() {
  S.gameW = window.innerWidth;
  S.gameH = window.innerHeight;
  S.lhX = S.gameW / 2;
  S.lhY = S.gameH / 2;
  S.app.renderer.resize(S.gameW, S.gameH);
  const pad = DARKNESS_PAD;
  S.darkRT.resize(S.gameW + pad * 2, S.gameH + pad * 2);
}

// ===== Input =====
function bindEvents() {
  window.addEventListener('keydown', (e) => {
    // Ignore keys while typing in an input (e.g. auth modal)
    const ae = document.activeElement;
    if (
      ae &&
      (ae.tagName === 'INPUT' ||
        ae.tagName === 'TEXTAREA' ||
        ae.isContentEditable)
    ) {
      return;
    }

    S.keys[e.code] = true;

    // Toggle debug mode
    if (e.code === 'F1') {
      e.preventDefault();
      S.debugMode = !S.debugMode;
      S.debugGfx.visible = S.debugMode;
      S.debugText.visible = S.debugMode;
      S.darknessGfx.visible = !S.debugMode;
      console.log(`🔧 Debug mode: ${S.debugMode}`);
    }

    // Exit confirmation screen
    if (S.exitConfirm && !isMenuVisible()) {
      if (isConfirmKey(e.code)) {
        // Confirm exit → go to menu
        playClickSound();
        hideExitConfirm();
        if (S.btnEsc) S.btnEsc.visible = false;
        // Defer to avoid menu keydown handler catching the same event
        requestAnimationFrame(() => exitToMenu());
        return;
      }
      if (isBackKey(e.code)) {
        // Cancel → resume game
        playClickSound();
        hideExitConfirm();
        return;
      }
      return;
    }

    // Escape or Q → show exit confirmation (during gameplay)
    if (
      isBackKey(e.code) &&
      !S.gameOver &&
      !S.exitConfirm &&
      !isMenuVisible()
    ) {
      playClickSound();
      showExitConfirm();
      return;
    }

    // Game over screen
    if (S.gameOver && !isMenuVisible()) {
      if (isConfirmKey(e.code)) {
        // Restart game
        playClickSound();
        restartGame();
        return;
      }
      if (isBackKey(e.code)) {
        // Exit to menu
        playClickSound();
        requestAnimationFrame(() => exitToMenu());
        return;
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    S.keys[e.code] = false;
  });

  window.addEventListener('resize', () => {
    resize();
    S.lhGlow.position.set(S.lhX, S.lhY + S.BEAM_ORIGIN_OFFSET_Y);
    repositionUI();
    repositionMenu();
  });
}

// ===== Clear overlay and entities =====
function clearGame() {
  if (S.overlayLayer.btnActionLeft)
    S.overlayLayer.btnActionLeft.visible = false;
  if (S.overlayLayer.btnActionRight)
    S.overlayLayer.btnActionRight.visible = false;
  S.overlayLayer.visible = false;
  S.overlayLayer.alpha = 1;
  S.overlayBg.visible = true;
  if (S.overlayLayer.splashMermaid)
    S.overlayLayer.splashMermaid.visible = false;
  if (S.overlayLayer.splashKraken) S.overlayLayer.splashKraken.visible = false;
  if (S.overlayLayer.splashPolice) S.overlayLayer.splashPolice.visible = false;

  cleanupBoats();
  cleanupPolice();
  cleanupKrakens();
  cleanupMermaids();
}

// ===== Exit to menu =====
function exitToMenu() {
  clearGame();
  S.reset();
  updateHUD();
  if (S.btnEsc) S.btnEsc.visible = false;
  showMenu();
}

// ===== Restart game (play again) =====
function restartGame() {
  clearGame();
  S.reset();
  updateHUD();
  S.nextSpawnTime = performance.now() + 1000;
  if (S.btnEsc) S.btnEsc.visible = true;
  if (S.btnLeft) S.btnLeft.visible = true;
  if (S.btnRight) S.btnRight.visible = true;
}

// ===== Start Game (called from menu) =====
function startGame() {
  S.reset();
  updateHUD();
  S.nextSpawnTime = performance.now() + 1000;
  if (S.btnEsc) S.btnEsc.visible = true;
}

// ===== Submit Score =====
async function trySubmitScore() {
  if (S.scoreSubmitted) return;
  S.scoreSubmitted = true;
  const survivalMs = S.runSurvivalMs || performance.now() - S.runStartTime;
  if (!currentUser) {
    console.log(`🏁 Run: ${Math.round(survivalMs / 1000)}s (not signed in — score not saved)`);
    return;
  }
  try {
    const res = await submitScore(survivalMs);
    if (res && res.written) {
      console.log(`🏆 New best saved: ${Math.round(res.best / 1000)}s`);
    } else if (res) {
      console.log(`🏁 Run: ${Math.round(survivalMs / 1000)}s (best remains ${Math.round(res.best / 1000)}s)`);
    }
  } catch (e) {
    console.warn('submitScore failed', e);
  }
}

// ===== Game Loop =====
function gameLoop(delta) {
  // Detect a fresh game-over transition: freeze survival time and submit once
  if (S.gameOver) {
    if (!S.scoreSubmitted) {
      S.runSurvivalMs = performance.now() - S.runStartTime;
      trySubmitScore();
    }
    return;
  }
  if (isMenuVisible()) return;
  if (S.exitConfirm) return;

  // Beam rotation via keyboard (no easing)
  if (S.keys['KeyA'] || S.keys['ArrowLeft'])
    S.beamAngle -= BEAM_ROTATE_SPEED * delta;
  if (S.keys['KeyD'] || S.keys['ArrowRight'])
    S.beamAngle += BEAM_ROTATE_SPEED * delta;

  // Animate rocks (ice floes)
  updateRocks();

  // Camera
  updateCamera(delta);

  // Lamp burnout — flicker and narrow over time
  S.lampTimer = Math.min(S.lampTimer + delta, LAMP_BURNOUT_TIME);
  const burnout = S.lampTimer / LAMP_BURNOUT_TIME;
  S.BEAM_HALF_ANGLE =
    LAMP_FULL_ANGLE - (LAMP_FULL_ANGLE - LAMP_MIN_ANGLE) * burnout;

  if (burnout > LAMP_FLICKER_START) {
    const flickerIntensity =
      (burnout - LAMP_FLICKER_START) / (1 - LAMP_FLICKER_START);
    const flick =
      Math.sin(Date.now() * 0.02) *
      Math.sin(Date.now() * 0.037) *
      Math.sin(Date.now() * 0.007);
    S.lampFlicker = 1 - flickerIntensity * 0.7 * Math.max(0, flick);
  } else {
    S.lampFlicker = 1;
  }
  S.lhGlow.alpha = S.lampFlicker;
  updateHUD();

  // Spawn mobs
  const now = performance.now();
  if (now > S.nextSpawnTime) {
    // Spawn: 40% boat, 20% mermaid, 30% police, 10% kraken
    const roll = Math.random();
    if (roll < 0.4) {
      spawnBoat();
    } else if (roll < 0.6) {
      spawnMermaid();
    } else if (roll < 0.9) {
      spawnPoliceBoat();
    } else {
      if (S.krakens.length < 1) spawnKraken();
    }
    S.nextSpawnTime =
      now +
      SPAWN_INTERVAL_MIN +
      Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
  }

  updateBoats(delta);
  updateMermaids(delta);
  updateKrakens(delta);
  updatePoliceBoats(delta);
  drawWakes();
  updateDarkness();
  updateTooltips(delta);
  if (S.debugMode) updateDebug();
}

// ===== Load Textures =====
async function loadTextures() {
  for (const [name, path] of Object.entries(SPRITE_FILES)) {
    S.textures[name] = await PIXI.Assets.load(path);
  }
}

// ===== Init =====
async function init() {
  S.gameW = window.innerWidth;
  S.gameH = window.innerHeight;
  S.lhX = S.gameW / 2;
  S.lhY = S.gameH / 2;
  S.app = new PIXI.Application({
    width: S.gameW,
    height: S.gameH,
    backgroundColor: C.ocean,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  $gameContainer.appendChild(S.app.view);
  S.app.stage.interactive = true;
  await loadTextures();

  // World container holds all game elements (camera moves this)
  S.worldContainer = new PIXI.Container();
  S.app.stage.addChild(S.worldContainer);

  // Layer order: wake → rocks → boats → lighthouse → darkness → beacons → glow
  S.wakeGfx = new PIXI.Graphics();
  S.worldContainer.addChild(S.wakeGfx);

  S.rockLayer = new PIXI.Container();
  buildRocks(S.rockLayer);
  S.worldContainer.addChild(S.rockLayer);

  S.boatLayer = new PIXI.Container();
  S.worldContainer.addChild(S.boatLayer);

  buildLighthouse(S.worldContainer);

  buildDarkness(S.worldContainer);

  S.beaconLayer = new PIXI.Container();
  S.worldContainer.addChild(S.beaconLayer);

  S.tooltipLayer = new PIXI.Container();
  S.worldContainer.addChild(S.tooltipLayer);

  // Debug overlay (in world space)
  buildDebug();
  S.worldContainer.addChild(S.debugGfx);
  S.app.stage.addChild(S.debugText);

  buildGlow();

  buildUI();
  S.btnEsc.visible = false; // hidden until game starts

  // Wire Escape button click to show menu
  S.btnEsc.on('pointerdown', () => {
    if (!S.gameOver && !S.exitConfirm && !isMenuVisible()) {
      playClickSound();
      showExitConfirm();
    }
  });

  // Wire overlay action buttons
  const $btnL = S.overlayLayer.btnActionLeft;
  const $btnR = S.overlayLayer.btnActionRight;

  $btnL.interactive = true;
  $btnL.buttonMode = true;
  $btnL.cursor = 'pointer';
  // Cover icon + label text under it ("Restart"/"Exit")
  $btnL.hitArea = new PIXI.Rectangle(-52, -44, 104, 112);
  $btnL.on('pointerdown', () => {
    if (S.exitConfirm) {
      playClickSound();
      hideExitConfirm();
      if (S.btnEsc) S.btnEsc.visible = false;
      requestAnimationFrame(() => exitToMenu());
    } else if (S.gameOver) {
      playClickSound();
      restartGame();
    }
  });

  $btnR.interactive = true;
  $btnR.buttonMode = true;
  $btnR.cursor = 'pointer';
  // Cover icon + label text under it ("Menu"/"Resume")
  $btnR.hitArea = new PIXI.Rectangle(-52, -44, 104, 112);
  $btnR.on('pointerdown', () => {
    if (S.exitConfirm) {
      playClickSound();
      hideExitConfirm();
    } else if (S.gameOver) {
      playClickSound();
      requestAnimationFrame(() => exitToMenu());
    }
  });

  bindEvents();
  updateHUD();
  S.nextSpawnTime = performance.now() + 1000;
  S.app.ticker.add(gameLoop);

  // Intro comics (4 pages) shown before the main menu
  await showIntro(S.app);

  // Build menu (on top of everything) and show it
  await buildMenu(S.app, startGame);

  // ===== Background Music =====
  S.bgMusic = new Audio('audio/ocean-sea-soft-waves.mp3');
  S.bgMusic.loop = true;
  S.bgMusic.volume = S.musicVolume != null ? S.musicVolume : 0.05;
  const startMusic = () => {
    S.bgMusic.play().catch(() => {});
    window.removeEventListener('pointerdown', startMusic);
    window.removeEventListener('keydown', startMusic);
  };
  window.addEventListener('pointerdown', startMusic);
  window.addEventListener('keydown', startMusic);

  if (analytics) {
    logEvent(analytics, 'game_start', {
      game_name: 'lighthouse',
      viewport_w: S.gameW,
      viewport_h: S.gameH,
    });
  }

  console.log('🔦 Lighthouse game initialized');

  // ===== Beam Controls (Sliders) =====
  const $sliderOffsetX = document.getElementById('sliderOffsetX');
  const $valOffsetX = document.getElementById('valOffsetX');
  const $sliderOffsetY = document.getElementById('sliderOffsetY');
  const $valOffsetY = document.getElementById('valOffsetY');
  if ($sliderOffsetX && $valOffsetX) {
    $sliderOffsetX.addEventListener('input', (e) => {
      S.BEAM_ORIGIN_OFFSET_X = parseInt($sliderOffsetX.value, 10);
      $valOffsetX.textContent = $sliderOffsetX.value;
    });
  }
  if ($sliderOffsetY && $valOffsetY) {
    $sliderOffsetY.addEventListener('input', (e) => {
      S.BEAM_ORIGIN_OFFSET_Y = parseInt($sliderOffsetY.value, 10);
      $valOffsetY.textContent = $sliderOffsetY.value;
    });
  }
}

init();
