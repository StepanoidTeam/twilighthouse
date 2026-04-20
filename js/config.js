const PIXI = globalThis.PIXI;

// ===== Game Rules =====
const GAME_OVER_DELAY = 2000;
const MAX_LIVES = 10;
const MAX_CRATES = 3; // сколько ящиков колумбийского у Паттисона на старте
const WIN_SCORE = 10;
const SPAWN_MARGIN = 60;

// ===== Boat / Mob =====
const BOAT_SPEED = 0.8;
const BOAT_RADIUS = 14;
const BOAT_WIDTH = 46;
const KRAKEN_RADIUS = 72;
const KRAKEN_WIDTH = 276;
const WAKE_MAX = 30;
const ARRIVAL_RADIUS = 55;

// ===== Beam & Lamp =====
const BEAM_ROTATE_SPEED = 0.04;
const BEAM_LEN = 1400;
const LAMP_FULL_ANGLE = 0.3;
const LAMP_MIN_ANGLE = 0.08;
const LAMP_BURNOUT_TIME = 1200;
const LAMP_FLICKER_START = 0.5;
const BEACON_RADIUS = 4;
const BEACON_PULSE_SPEED = 0.003;

// ===== Darkness & Spawn =====
const DARKNESS_RADIUS = 560;
const MOB_SPAWN_RING = 680;
const DARK_ALPHA = 0.82;
const SPAWN_INTERVAL_MIN = 2500;
const SPAWN_INTERVAL_MAX = 5000;

// ===== Lighthouse =====
const BEAM_ORIGIN_OFFSET_X_DEFAULT = 0;
const BEAM_ORIGIN_OFFSET_Y_DEFAULT = -64;
const LH_GLOW_RADIUS_DEFAULT = 30;
const LIGHTHOUSE_WIDTH = 63;

// ===== Rocks =====
const ROCK_SAFE_ZONE = 120;
const ROCK_SPAWN_RADIUS = 400;

// ===== Camera =====
const CAM_OFFSET = 100;
const DARKNESS_PAD = CAM_OFFSET + 200;
const CAM_EASE = 0.04;
const CAM_BEAM_OFFSET = 160;

// ===== Overlay =====
const OVERLAY_FADE_DURATION = 600;

// ===== Sprite Sizing =====
function scaleToWidth(spr, width) {
  spr.width = width;
  spr.scale.y = spr.scale.x;
}

// ===== Animation Frames =====
const MERMAID_FRAMES = ['mermaid1', 'mermaid2', 'mermaid3', 'mermaid2'];
const MERMAID_FRAME_DURATION = 8;
const BOAT_FRAMES = ['boat1', 'boat2', 'boat3', 'boat2'];
const BOAT_FRAME_DURATION = 10;

// ===== Boat Lit Debounce =====
const LIT_DEBOUNCE = 180; // ms — минимальное время стабильного состояния перед сменой

// ===== Tooltips =====
const TOOLTIP_RISE_SPEED = 0.5;
const TOOLTIP_DURATION = 80;

// ===== Color Palette =====
const C = {
  ocean: 0x0f1b2d,
  beam1: 0x3a6888,
  beam2: 0x5888aa,
  beam3: 0x78aacc,
  beam4: 0x98ccee,
  lhLight: 0xfff8e0,
  wake: 0x2a5878,
};

// ===== Sprite Files =====
const SPRITE_FILES = {
  kraken: 'sprites/kraken2.png',
  mermaid1: 'sprites/mermaid/1.png',
  mermaid2: 'sprites/mermaid/2.png',
  mermaid3: 'sprites/mermaid/3.png',
  boat: 'sprites/boat/1.png', // todo(vmyshko): delete
  boat1: 'sprites/boat/1.png',
  boat2: 'sprites/boat/2.png',
  boat3: 'sprites/boat/3.png',
  button: 'sprites/button.png',
  buttonEnter: 'sprites/button-enter.png',
  buttonSpace: 'sprites/button-space.png',
  lighthouse: 'sprites/lighthouse.png',
  rock1: 'sprites/rock1.png',
  rock2: 'sprites/rock2.png',
  rock3: 'sprites/rock3.png',
  rock4: 'sprites/rock4.png',
  rock5: 'sprites/rock5.png',
};

const ROCK_TEX_KEYS = ['rock1', 'rock2', 'rock3', 'rock4', 'rock5'];

// ===== Cargo =====
const BOAT_CARGO_TYPES = ['💡', '🛢️', '📦'];

// ===== UI Styles =====
const UI_STYLE = {
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  fill: '#c8d8e8',
  fontSize: 22,
  fontWeight: 'bold',
  dropShadow: true,
  dropShadowColor: '#000000',
  dropShadowBlur: 6,
  dropShadowDistance: 0,
};

const TOOLTIP_STYLE_OK = new PIXI.TextStyle({
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  fontSize: 16,
  fontWeight: 'bold',
  fill: '#88eebb',
  dropShadow: true,
  dropShadowColor: '#000000',
  dropShadowBlur: 4,
  dropShadowDistance: 0,
});

const TOOLTIP_STYLE_FAIL = new PIXI.TextStyle({
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  fontSize: 16,
  fontWeight: 'bold',
  fill: '#ff6655',
  dropShadow: true,
  dropShadowColor: '#000000',
  dropShadowBlur: 4,
  dropShadowDistance: 0,
});

const CARGO_LABEL_STYLE = new PIXI.TextStyle({
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  fontSize: 14,
  fontWeight: 'bold',
  fill: '#aaffcc',
});

export {
  PIXI,
  GAME_OVER_DELAY,
  MAX_LIVES,
  MAX_CRATES,
  WIN_SCORE,
  SPAWN_MARGIN,
  BOAT_SPEED,
  BOAT_RADIUS,
  BOAT_WIDTH,
  KRAKEN_RADIUS,
  KRAKEN_WIDTH,
  WAKE_MAX,
  ARRIVAL_RADIUS,
  BEAM_ROTATE_SPEED,
  BEAM_LEN,
  LAMP_FULL_ANGLE,
  LAMP_MIN_ANGLE,
  LAMP_BURNOUT_TIME,
  LAMP_FLICKER_START,
  BEACON_RADIUS,
  BEACON_PULSE_SPEED,
  DARKNESS_RADIUS,
  MOB_SPAWN_RING,
  DARK_ALPHA,
  SPAWN_INTERVAL_MIN,
  SPAWN_INTERVAL_MAX,
  BEAM_ORIGIN_OFFSET_X_DEFAULT,
  BEAM_ORIGIN_OFFSET_Y_DEFAULT,
  LH_GLOW_RADIUS_DEFAULT,
  LIGHTHOUSE_WIDTH,
  ROCK_SAFE_ZONE,
  ROCK_SPAWN_RADIUS,
  CAM_OFFSET,
  DARKNESS_PAD,
  CAM_EASE,
  CAM_BEAM_OFFSET,
  OVERLAY_FADE_DURATION,
  MERMAID_FRAMES,
  MERMAID_FRAME_DURATION,
  BOAT_FRAMES,
  BOAT_FRAME_DURATION,
  LIT_DEBOUNCE,
  TOOLTIP_RISE_SPEED,
  TOOLTIP_DURATION,
  C,
  SPRITE_FILES,
  ROCK_TEX_KEYS,
  BOAT_CARGO_TYPES,
  UI_STYLE,
  TOOLTIP_STYLE_OK,
  TOOLTIP_STYLE_FAIL,
  CARGO_LABEL_STYLE,
  scaleToWidth,
};
