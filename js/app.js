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
import S from './state.js';

import { buildLighthouse, buildGlow } from './lighthouse.js';
import { buildRocks, updateRocks } from './rocks.js';
import { buildDarkness, updateDarkness } from './darkness.js';
import { updateCamera } from './camera.js';
import { buildUI, updateHUD, updateTooltips, repositionUI } from './ui.js';
import { spawnBoat, updateBoats, drawWakes, cleanupBoats } from './boat.js';
import { spawnMermaid, updateMermaids, cleanupMermaids } from './mermaid.js';
import { spawnKraken, updateKrakens, cleanupKrakens } from './kraken.js';
import { spawnPoliceBoat, updatePoliceBoats, cleanupPolice } from './police.js';
import { buildDebug, updateDebug } from './debug.js';

const $gameContainer = document.getElementById('$gameContainer');

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

    // Adjust BEAM_ORIGIN_OFFSET_Y in debug mode
    if (S.debugMode && e.code === 'ArrowUp') S.BEAM_ORIGIN_OFFSET_Y -= 2;
    if (S.debugMode && e.code === 'ArrowDown') S.BEAM_ORIGIN_OFFSET_Y += 2;
    if (S.debugMode && e.code === 'BracketLeft')
      S.BEAM_HALF_ANGLE = Math.max(0.05, S.BEAM_HALF_ANGLE - 0.02);
    if (S.debugMode && e.code === 'BracketRight') S.BEAM_HALF_ANGLE += 0.02;
    if (S.debugMode && e.code === 'Minus')
      S.LH_GLOW_RADIUS = Math.max(5, S.LH_GLOW_RADIUS - 5);
    if (S.debugMode && e.code === 'Equal') S.LH_GLOW_RADIUS += 5;

    // Restart on Enter/Space when game over
    if (S.gameOver && (e.code === 'Enter' || e.code === 'Space')) {
      restart();
    }
  });

  window.addEventListener('keyup', (e) => {
    S.keys[e.code] = false;
  });

  window.addEventListener('resize', () => {
    resize();
    S.lhGlow.position.set(S.lhX, S.lhY + S.BEAM_ORIGIN_OFFSET_Y);
    repositionUI();
  });
}

// ===== Restart =====
function restart() {
  if (S.overlayLayer.keyEnter) S.overlayLayer.keyEnter.visible = false;
  if (S.overlayLayer.txtOr) S.overlayLayer.txtOr.visible = false;
  if (S.overlayLayer.keySpace) S.overlayLayer.keySpace.visible = false;
  S.overlayLayer.visible = false;
  S.overlayLayer.alpha = 1;
  if (S.overlayLayer.splashMermaid) S.overlayLayer.splashMermaid.visible = false;
  if (S.overlayLayer.splashKraken) S.overlayLayer.splashKraken.visible = false;

  cleanupBoats();
  cleanupPolice();
  cleanupKrakens();
  cleanupMermaids();

  S.reset();
  updateHUD();
}

// ===== Game Loop =====
function gameLoop(delta) {
  if (S.gameOver) return;

  // Beam rotation via keyboard (no easing)
  if (S.keys['KeyA'] || S.keys['ArrowLeft']) S.beamAngle -= BEAM_ROTATE_SPEED * delta;
  if (S.keys['KeyD'] || S.keys['ArrowRight']) S.beamAngle += BEAM_ROTATE_SPEED * delta;

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

  bindEvents();
  updateHUD();
  S.nextSpawnTime = performance.now() + 1000;
  S.app.ticker.add(gameLoop);

  // ===== Background Music =====
  S.bgMusic = new Audio('audio/ocean-sea-soft-waves.mp3');
  S.bgMusic.loop = true;
  S.bgMusic.volume = 0.05;
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
