import {
  PIXI,
  MAX_LIVES,
  MAX_CRATES,
  LAMP_FULL_ANGLE,
  BOAT_CARGO_TYPES,
  BEAM_ORIGIN_OFFSET_X_DEFAULT,
  BEAM_ORIGIN_OFFSET_Y_DEFAULT,
  LH_GLOW_RADIUS_DEFAULT,
} from './config.js';

// ===== Shared Mutable Game State =====
const State = {
  // Pixi app
  app: null,

  // Viewport
  gameW: 0,
  gameH: 0,
  lhX: 0,
  lhY: 0,
  // Масштаб worldContainer (зум-аут на узких экранах, иначе 1)
  worldScale: 1,

  // Audio
  bgMusic: null,
  musicVolume: (() => {
    try {
      const v = parseFloat(localStorage.getItem('lighthouse_music_vol'));
      if (!Number.isNaN(v) && v >= 0 && v <= 1) return v;
    } catch (_) {}
    return 0.05;
  })(),
  sfxVolume: (() => {
    try {
      const v = parseFloat(localStorage.getItem('lighthouse_sfx_vol'));
      if (!Number.isNaN(v) && v >= 0 && v <= 1) return v;
    } catch (_) {}
    return 1.0;
  })(),

  // Lighthouse
  lighthouseContainer: null,
  lighthouseSprite: null,
  lhGlow: null,

  // Textures
  textures: {},

  // Darkness
  darknessGfx: null,
  wakeGfx: null,
  darkRT: null,
  darkFill: null,
  beamErase: null,
  outerDark: null,

  // Input
  keys: {},

  // Beam
  beamAngle: -Math.PI / 2,
  BEAM_HALF_ANGLE: LAMP_FULL_ANGLE,
  BEAM_ORIGIN_OFFSET_X: BEAM_ORIGIN_OFFSET_X_DEFAULT,
  BEAM_ORIGIN_OFFSET_Y: BEAM_ORIGIN_OFFSET_Y_DEFAULT,
  LH_GLOW_RADIUS: LH_GLOW_RADIUS_DEFAULT,

  // Game flow
  gameOver: false,
  gameOverPending: false,
  exitConfirm: false,

  // Run timing (survival)
  runStartTime: 0,
  runSurvivalMs: 0,
  scoreSubmitted: false,

  // Entities
  boats: [],
  mermaids: [],
  policeBoats: [],
  krakens: [],
  rocks: [],
  rockColliders: [],
  rockSprites: [],

  // Score / lives
  score: 0,
  deliveredCargo: { '💡': 0, '🛢️': 0, '📦': 0 },
  lives: MAX_LIVES,
  boatsSunk: 0,
  mermaidsArrived: 0,
  policeArrived: 0,
  krakensArrived: 0,
  // Колумбийский порошок — ящики, которые Паттисон прячет от Дефо.
  // Каждый пропущенный (освещённый) коп забирает ящик.
  // Ящиков 0 → Дефо выкидывает Паттисона со скалы.
  crates: MAX_CRATES,

  // Spawning
  nextSpawnTime: 0,

  // Lamp
  lampTimer: 0,
  lampFlicker: 1,

  // Layers
  rockLayer: null,
  boatLayer: null,
  beaconLayer: null,
  tooltipLayer: null,
  worldContainer: null,

  // Camera
  camX: 0,
  camY: 0,
  shakeTime: 0,
  shakeIntensity: 0,

  // Debug
  debugMode: false,
  debugGfx: null,
  debugText: null,

  // UI
  hudLayer: null,
  overlayLayer: null,
  txtLives: null,
  txtScore: null,
  txtMermaids: null,
  txtPolice: null,
  txtLamp: null,
  txtSunk: null,
  txtTime: null,
  txtMessage: null,
  txtRestart: null,
  btnLeft: null,
  btnRight: null,
  overlayBg: null,

  // Tooltips
  tooltips: [],

  // ===== Methods =====
  reset() {
    this.score = 0;
    this.deliveredCargo = { '💡': 0, '🛢️': 0, '📦': 0 };
    this.lives = MAX_LIVES;
    this.mermaidsArrived = 0;
    this.policeArrived = 0;
    this.krakensArrived = 0;
    this.crates = MAX_CRATES;
    this.lampTimer = 0;
    this.lampFlicker = 1;
    this.BEAM_HALF_ANGLE = LAMP_FULL_ANGLE;
    this.beamAngle = -Math.PI / 2;
    this.gameOver = false;
    this.gameOverPending = false;
    this.exitConfirm = false;
    this.boatsSunk = 0;
    this.nextSpawnTime = performance.now() + 1000;
    this.runStartTime = performance.now();
    this.runSurvivalMs = 0;
    this.scoreSubmitted = false;
  },
};

export default State;
