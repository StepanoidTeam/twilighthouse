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
  computeWorldScale,
} from './config.js';
import { playSound, WAVES_VOLUME, MUSIC_VOLUME } from './sound.js';
import { isConfirmKey, isBackKey } from './input.js';
import S from './state.js';

import { buildLighthouse, buildGlow } from './lighthouse.js';
import { buildRocks, updateRocks } from './rocks.js';
import {
  buildDarkness,
  updateDarkness,
  rebuildDarknessGeometry,
} from './darkness.js';
import { updateCamera, snapCamera } from './camera.js';
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
import { submitScore } from './leaderboard.js';
import { currentUser } from './auth.js';
import { t, onLanguageChange } from './i18n.js';

const {
  $gameContainer,
  $bootLoader,
  $bootLoaderTitle,
  $bootLoaderText,
  $bootLoaderAsset,
  $bootLoaderBarFill,
  $bootLoaderPercent,
  $volControls,
} = globalThis;
const MUSIC_PLAYLIST = [
  'music/1-lighthouse-salt.mp3',
  'music/2-twilight-house.mp3',
  'music/3-techno-salt.mp3',
];
const BOOT_TEXTURE_ASSETS = [
  'sprites/mainmenu.PNG',
  'sprites/title-logo.png',
  'sprites/icons/lighthouse.png',
  'sprites/icons/compass.png',
  'sprites/icons/wheel.png',
  'sprites/icons/chest.png',
  'sprites/icons/map.png',
];
const BOOT_AUDIO_ASSETS = Array.from(
  new Set([
    'audio/button-click.mp3',
    'audio/menu-select.mp3',
    'audio/book.mp3',
    'audio/fail-1.mp3',
    'audio/ocean-sea-soft-waves.mp3',
    'audio/crash/horror-bone-crack.mp3',
    'audio/crash/rubble-crash.mp3',
    'audio/crash/small-rock-break.mp3',
    'audio/crash/wooden-ship-break.mp3',
    'audio/cop/police-intro-siren.mp3',
    'audio/cop/police-siren-one-loop.mp3',
    'audio/cop/radio-thats-correct.mp3',
    'audio/cop/radio-turn.mp3',
    'audio/boat/submarine_sonar-1.mp3',
    'audio/boat/submarine_sonar-2.mp3',
    'audio/boat/submarine_sonar-3.mp3',
    ...MUSIC_PLAYLIST,
  ]),
);

let musicTrackIndex = 0;
let bootLoaderState = {
  loaded: 0,
  total:
    Object.keys(SPRITE_FILES).length +
    BOOT_TEXTURE_ASSETS.length +
    BOOT_AUDIO_ASSETS.length,
  status: 'loading',
  currentAsset: null,
};

function getBootAssetLabel(asset) {
  if (!asset) {
    return bootLoaderState.status === 'ready' ? t('boot.finalizing') : '';
  }

  const kindKey = asset.kind === 'audio' ? 'boot.audio' : 'boot.texture';
  const fileName = asset.path.split('/').pop() || asset.path;
  return `${t(kindKey)} - ${fileName}`;
}

function renderBootLoaderText() {
  if ($bootLoaderTitle) $bootLoaderTitle.textContent = t('boot.title');
  if ($bootLoaderText) {
    if (bootLoaderState.status === 'failed') {
      $bootLoaderText.textContent = t('boot.failed');
    } else if (bootLoaderState.status === 'ready') {
      $bootLoaderText.textContent = t('boot.ready');
    } else if (bootLoaderState.total > 0 && bootLoaderState.loaded > 0) {
      $bootLoaderText.textContent = t('boot.progress', {
        loaded: bootLoaderState.loaded,
        total: bootLoaderState.total,
      });
    } else {
      $bootLoaderText.textContent = t('boot.loading');
    }
  }

  if ($bootLoaderAsset) {
    $bootLoaderAsset.textContent = getBootAssetLabel(
      bootLoaderState.currentAsset,
    );
  }
}

function setBootLoaderProgress(loaded, total, currentAsset = null) {
  bootLoaderState = {
    ...bootLoaderState,
    loaded,
    total,
    currentAsset,
    status: 'loading',
  };
  const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;

  renderBootLoaderText();

  if ($bootLoaderBarFill) $bootLoaderBarFill.style.width = `${percent}%`;
  if ($bootLoaderPercent) $bootLoaderPercent.textContent = `${percent}%`;
}

function hideBootLoader() {
  if (!$bootLoader) return;

  bootLoaderState = {
    ...bootLoaderState,
    loaded: bootLoaderState.total,
    status: 'ready',
    currentAsset: null,
  };
  if ($bootLoaderBarFill) $bootLoaderBarFill.style.width = '100%';
  if ($bootLoaderPercent) $bootLoaderPercent.textContent = '100%';
  renderBootLoaderText();

  requestAnimationFrame(() => {
    $bootLoader.classList.add('is-hiding');
  });

  window.setTimeout(() => {
    $bootLoader.hidden = true;
  }, 320);
}

function showBootLoaderError() {
  if (!$bootLoader) return;

  bootLoaderState = {
    ...bootLoaderState,
    status: 'failed',
    currentAsset: null,
  };
  renderBootLoaderText();
  if ($bootLoaderPercent) $bootLoaderPercent.textContent = 'ERR';
}

function preloadAudioAsset(path) {
  return new Promise((resolve) => {
    const audio = new Audio();
    let settled = false;
    const timeoutId = window.setTimeout(handleDone, 4000);

    function cleanup() {
      window.clearTimeout(timeoutId);
      audio.removeEventListener('canplaythrough', handleReady);
      audio.removeEventListener('loadeddata', handleReady);
      audio.removeEventListener('error', handleDone);
    }

    function handleDone() {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    }

    function handleReady() {
      handleDone();
    }

    audio.preload = 'auto';
    audio.addEventListener('canplaythrough', handleReady, { once: true });
    audio.addEventListener('loadeddata', handleReady, { once: true });
    audio.addEventListener('error', handleDone, { once: true });
    audio.src = path;
    audio.load();
  });
}

function playClickSound() {
  playSound('audio/button-click.mp3', 0.2);
}

function stopWavesSound({ resetPlayback = false } = {}) {
  if (S.wavesSound) {
    S.wavesSound.pause();
    if (resetPlayback) S.wavesSound.currentTime = 0;
  }
}

function startWavesSound({ restartPlayback = false } = {}) {
  if (S.wavesSound) {
    if (restartPlayback) S.wavesSound.currentTime = 0;
    S.wavesSound.play().catch(() => {});
  }
}

function startMenuMusic({ restartPlayback = false } = {}) {
  if (S.musicSound) {
    if (restartPlayback) {
      musicTrackIndex = 0;
      if (S.musicSound.src !== MUSIC_PLAYLIST[0]) {
        S.musicSound.src = MUSIC_PLAYLIST[0];
      }
      S.musicSound.currentTime = 0;
    }
    S.musicSound.play().catch(() => {});
    console.log('🎵 Music track:', MUSIC_PLAYLIST[musicTrackIndex]);
  }
}

function clearTransientVisuals() {
  if (S.wakeGfx) S.wakeGfx.clear();
}

function prepareFreshRun() {
  clearGame();
  S.reset();
  S.gameSessionActive = true;
  updateHUD();
  clearTransientVisuals();
  S.nextSpawnTime = performance.now() + 1000;
  snapCamera();
  updateDarkness();
  $gameContainer.hidden = false;
  if (S.btnEsc) S.btnEsc.visible = true;
  if ($volControls) $volControls.hidden = false;
  startWavesSound();
  startMenuMusic();
}

// ===== Resize =====
// S.lhX/S.lhY — фиксированные МИРОВЫЕ координаты маяка, задаются один раз
// в init(). При ресайзе их НЕ трогаем: камера сама держит маяк в центре
// экрана через формулу `gameW/2 - scale * lhX` в updateCamera().
// Если меньшая сторона вьюпорта меньше, чем круг ROCK_SPAWN_RADIUS (игровая
// зона), включается зум-аут worldContainer через computeWorldScale().
function resize() {
  S.gameW = window.innerWidth;
  S.gameH = window.innerHeight;
  S.worldScale = computeWorldScale(S.gameW, S.gameH);
  if (S.worldContainer) S.worldContainer.scale.set(S.worldScale);
  S.app.renderer.resize(S.gameW, S.gameH);
  rebuildDarknessGeometry();
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
    // Мгновенно снапаем камеру: gameLoop может стоять (меню / game over),
    // и без этого маяк остаётся в старых мировых координатах за экраном.
    snapCamera();
    repositionUI();
    repositionMenu();
  });
}

// ===== Clear overlay and entities =====
function clearGame() {
  $screenGameOver.hidden = true;
  $screenExitConfirm.hidden = true;
  S.overlayLayer.visible = false;

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
  clearTransientVisuals();
  startWavesSound();
  startMenuMusic();
  $gameContainer.hidden = true;
  if (S.btnEsc) S.btnEsc.visible = false;
  if ($volControls) $volControls.hidden = true;
  showMenu();
}

// ===== Restart game (play again) =====
function restartGame() {
  prepareFreshRun();
}

// ===== Start Game (called from menu) =====
function startGame() {
  prepareFreshRun();
}

// ===== Submit Score =====
async function trySubmitScore() {
  if (S.scoreSubmitted) return;
  S.scoreSubmitted = true;
  if (!S.gameWon) return;
  const survivalMs = S.runSurvivalMs || performance.now() - S.runStartTime;
  if (!currentUser) {
    console.log(
      `🏁 Run: ${Math.round(survivalMs / 1000)}s (not signed in — score not saved)`,
    );
    return;
  }
  try {
    const res = await submitScore(survivalMs);
    if (res && res.written) {
      console.log(`🏆 New best saved: ${Math.round(res.best / 1000)}s`);
    } else if (res) {
      console.log(
        `🏁 Run: ${Math.round(survivalMs / 1000)}s (best remains ${Math.round(res.best / 1000)}s)`,
      );
    }
  } catch (e) {
    console.warn('submitScore failed', e);
  }
}

// ===== Game Loop =====
function gameLoop(delta) {
  if (!S.gameSessionActive) return;

  // Detect a fresh game-over transition: freeze survival time and submit once
  if (S.gameOver) {
    if (!S.scoreSubmitted) {
      S.runSurvivalMs = performance.now() - S.runStartTime;
      updateHUD();
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
  const entries = Object.entries(SPRITE_FILES);
  const total = bootLoaderState.total;
  let loaded = 0;

  for (const [index, [name, path]] of entries.entries()) {
    setBootLoaderProgress(loaded, total, { kind: 'texture', path });
    S.textures[name] = await PIXI.Assets.load(path);
    loaded = index + 1;
    setBootLoaderProgress(loaded, total, { kind: 'texture', path });
  }

  for (const path of BOOT_TEXTURE_ASSETS) {
    setBootLoaderProgress(loaded, total, { kind: 'texture', path });
    await PIXI.Assets.load(path);
    loaded += 1;
    setBootLoaderProgress(loaded, total, { kind: 'texture', path });
  }

  for (const path of BOOT_AUDIO_ASSETS) {
    setBootLoaderProgress(loaded, total, { kind: 'audio', path });
    await preloadAudioAsset(path);
    loaded += 1;
    setBootLoaderProgress(loaded, total, { kind: 'audio', path });
  }
}

// ===== Init =====
async function init() {
  renderBootLoaderText();

  S.gameW = window.innerWidth;
  S.gameH = window.innerHeight;
  S.worldScale = computeWorldScale(S.gameW, S.gameH);
  // lhX/lhY — мировые координаты маяка, фиксируются один раз.
  // Делим на worldScale, чтобы логическое "поле мира" всегда было достаточно
  // широким для DARKNESS_RADIUS независимо от физической ширины вьюпорта.
  S.lhX = S.gameW / (2 * S.worldScale);
  S.lhY = S.gameH / (2 * S.worldScale);
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
  S.worldContainer.scale.set(S.worldScale);
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
  if ($volControls) $volControls.hidden = true;

  // Wire Escape button click to show menu
  S.btnEsc.on('pointerdown', () => {
    if (!S.gameOver && !S.exitConfirm && !isMenuVisible()) {
      playClickSound();
      showExitConfirm();
    }
  });

  // Wire game-over / exit-confirm HTML buttons
  $btnResultRestart.addEventListener('pointerdown', () => {
    playClickSound();
    restartGame();
  });
  $btnResultMenu.addEventListener('pointerdown', () => {
    playClickSound();
    requestAnimationFrame(() => exitToMenu());
  });
  $btnExitConfirm.addEventListener('pointerdown', () => {
    playClickSound();
    hideExitConfirm();
    if (S.btnEsc) S.btnEsc.visible = false;

    requestAnimationFrame(() => exitToMenu());
  });
  $btnExitResume.addEventListener('pointerdown', () => {
    playClickSound();
    hideExitConfirm();
  });

  bindEvents();
  updateHUD();
  S.nextSpawnTime = performance.now() + 1000;
  // Снап камеры до старта тикера: иначе worldContainer в (0,0),
  // а маяк — в (lhX, lhY), и на узких экранах он оказывается за краем.
  snapCamera();
  S.app.ticker.add(gameLoop);

  // Build menu (on top of everything) and show it
  await buildMenu(S.app, startGame);

  S.gameSessionActive = false;
  hideBootLoader();

  // ===== Waves Sound =====
  const wavesAudio = new Audio('audio/ocean-sea-soft-waves.mp3');
  wavesAudio.loop = true;
  wavesAudio.volume = Math.max(
    0,
    Math.min(1, WAVES_VOLUME * (S.sfxVolume != null ? S.sfxVolume : 0.5)),
  );
  S.wavesSound = wavesAudio;

  // ===== Music playlist =====
  const musicAudio = new Audio(MUSIC_PLAYLIST[0]);
  musicAudio.volume = Math.max(
    0,
    Math.min(1, MUSIC_VOLUME * (S.musicVolume != null ? S.musicVolume : 0.5)),
  );
  musicAudio.addEventListener('ended', () => {
    musicTrackIndex = (musicTrackIndex + 1) % MUSIC_PLAYLIST.length;
    musicAudio.src = MUSIC_PLAYLIST[musicTrackIndex];
    musicAudio.play().catch(() => {});
    console.log('🎵 Music track:', MUSIC_PLAYLIST[musicTrackIndex]);
  });
  S.musicSound = musicAudio;
  startWavesSound({ restartPlayback: true });
  startMenuMusic({ restartPlayback: true });

  if (analytics) {
    logEvent(analytics, 'game_start', {
      game_name: 'lighthouse',
      viewport_w: S.gameW,
      viewport_h: S.gameH,
    });
  }

  console.log('🔦 Lighthouse game initialized');
}

renderBootLoaderText();
onLanguageChange(renderBootLoaderText);

init().catch((e) => {
  console.error('init failed', e);
  showBootLoaderError();
});
