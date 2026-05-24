const PIXI = globalThis.PIXI;

// ===== Game Rules =====
const GAME_OVER_DELAY = 2000;
const WIN_SCORE = 10;
const NIGHT_DURATION_MS = 5 * 60 * 1000;
const SPAWN_MARGIN = 60;

// ===== Boat / Mob =====
const BOAT_SPEED = 0.8;
const BOAT_RADIUS = 14;
const BOAT_WIDTH = 46;
const KRAKEN_RADIUS = 72;
const KRAKEN_WIDTH = 276;
const WAKE_MAX = 52;
/** Wake trail samples spawn this far behind the boat center along velocity */
const WAKE_SPAWN_BACK = 22;
/** Splash blobs: radius = MIN + (age/WAKE_MAX) * GROWTH */
const WAKE_DOT_R_MIN = 6;
const WAKE_DOT_R_GROWTH = 20;
/** Irregular wake: emit after this much travel (world units), randomized each time */
const WAKE_EMIT_DIST_MIN = 2.2;
const WAKE_EMIT_DIST_MAX = 9;
/** Perpendicular foam scatter (± px) */
const WAKE_SIDE_JITTER = 14;
/** Extra stagger along wake axis (± px) */
const WAKE_ALONG_JITTER = 10;
/** Stern distance varies by this factor range × WAKE_SPAWN_BACK */
const WAKE_ALONG_SCALE_MIN = 0.72;
const WAKE_ALONG_SCALE_MAX = 1.38;
const ARRIVAL_RADIUS = 55;

// ===== Keeper level (lifetime meta.totalXp) =====
const KEEPER_XP_BASE = 100;
const KEEPER_XP_GROWTH = 1.15;

// ===== Run XP & perks (single run) =====
const RUN_PERK_XP_BASE = 100;
const RUN_PERK_XP_GROWTH = 1.12;
const RUN_PERK_PICK_COUNT = 3;
const RUN_XP_DELIVERED_BOATS = 30;
const RUN_XP_REPELLED_MERMAIDS = 25;
const RUN_XP_REPELLED_KRAKEN = 40;
const RUN_XP_SUNK_COPS = 35;
const PERK_LAMP_MULT_PER_STACK = 1.15;
const PERK_BEAM_MULT_PER_STACK = 1.12;
const PERK_COP_SPEED_MULT_PER_STACK = 0.88;
const PERK_BEAM_WIDTH_DEG_PER_STACK = 10;
const PERK_BEAM_WIDTH_MAX_STACKS = 4;
const PERK_SIREN_EYE_MERMAID_WEIGHT = 0.55;
const PERK_SIREN_EYE_SPEED_MULT = 1.35;
const PERK_EXPERIENCED_KEEPER_BONUS = 0.1;
const PERK_OCCULT_MERMAID_WEIGHT = 0.2;
const PERK_OCCULT_KRAKEN_WEIGHT = 3.5;
const PERK_ELASTIC_BEAM_DEG_PER_STACK = 6;
const PERK_ELASTIC_BEAM_SHRINK_SPEED = 0.06;
const OCCULT_LAMP_SCARE_RADIUS = 50;
const OLD_MAP_REVEAL_MS = 20000;
const LAMP_OIL_RESERVE_BONUS = 20;
const SPARE_GENERATOR_START_CHARGE = 0.3;
const PERK_NEW_ICEBERGS_COUNT = 3;
const ICEBERG_SPAWN_INITIAL_DELAY_MS = 500;
const ICEBERG_SPAWN_STAGGER_MS = 420;
const ICEBERG_SURFACE_RISE = 36;
const ICEBERG_SURFACE_DURATION = 26;

// ===== Beam & Lamp =====
const BEAM_ROTATE_SPEED = 0.04;
const BEAM_LEN = 1400;
const LAMP_FULL_ANGLE = 0.3;
const LAMP_MIN_ANGLE = 0.08;
const BEAM_VISUAL_NARROW_ANGLE = Math.atan2(BOAT_RADIUS, BEAM_LEN);
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
const BEAM_ORIGIN_OFFSET_Y_DEFAULT = -100;
const LH_GLOW_RADIUS_DEFAULT = 55;
const LIGHTHOUSE_WIDTH = 120;

// ===== Rocks =====
const ROCK_SAFE_ZONE = 120;
const ROCK_SPAWN_RADIUS = 400;

// ===== Mobile Zoom =====
// Если круг ROCK_SPAWN_RADIUS (игровая зона вокруг маяка) не влезает в
// меньшую сторону экрана, уменьшаем масштаб worldContainer так, чтобы он
// влез целиком + небольшой отступ. На больших экранах scale = 1.
// HUD/кнопки остаются в физических пикселях — они живут на stage, а не в
// worldContainer.
const WORLD_FIT_MARGIN = 40;
const WORLD_FIT_DIAMETER = ROCK_SPAWN_RADIUS * 2 + WORLD_FIT_MARGIN;

function computeWorldScale(gameW, gameH) {
  const minSide = Math.min(gameW, gameH != null ? gameH : Infinity);
  if (minSide >= WORLD_FIT_DIAMETER) return 1;
  return Math.max(0.1, minSide / WORLD_FIT_DIAMETER);
}

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

// ===== Mob Animation =====
function tickAnim(mob, delta, frames, duration, textures) {
  mob.frameTick += delta;
  if (mob.frameTick >= duration) {
    mob.frameTick -= duration;
    mob.frameIndex = (mob.frameIndex + 1) % frames.length;
    mob.spr.texture = textures[frames[mob.frameIndex]];
  }
}

// ===== Animation Frames =====
const MERMAID_FRAMES = ['mermaid1', 'mermaid2', 'mermaid3', 'mermaid2'];
const MERMAID_FRAME_DURATION = 8;
const BOAT_FRAMES = ['boat1', 'boat2', 'boat3', 'boat2'];
const BOAT_FRAME_DURATION = 10;
const KRAKEN_CHASE_FRAMES = [
  'krakenChase1',
  'krakenChase2',
  'krakenChase3',
  'krakenChase2',
];
const KRAKEN_RETREAT_FRAMES = [
  'krakenRetreat1',
  'krakenRetreat2',
  'krakenRetreat3',
];
const KRAKEN_FRAME_DURATION = 15;

// ===== Boat Lit Debounce =====
const LIT_DEBOUNCE = 100; // ms — минимальное время стабильного состояния перед сменой
const BOAT_ROCK_IMMUNITY_COOLDOWN_MS = 1000;

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
  krakenChase1: 'sprites/kraken/chase/1.png',
  krakenChase2: 'sprites/kraken/chase/2.png',
  krakenChase3: 'sprites/kraken/chase/3.png',
  krakenRetreat1: 'sprites/kraken/retreat/1.png',
  krakenRetreat2: 'sprites/kraken/retreat/2.png',
  krakenRetreat3: 'sprites/kraken/retreat/3.png',
  mermaid1: 'sprites/mermaid/1.png',
  mermaid2: 'sprites/mermaid/2.png',
  mermaid3: 'sprites/mermaid/3.png',
  boat: 'sprites/boat/1.png', // todo(vmyshko): delete
  boat1: 'sprites/boat/1.png',
  boat2: 'sprites/boat/2.png',
  boat3: 'sprites/boat/3.png',
  button: 'sprites/button.png',
  lighthouse: 'sprites/lighthouse3.png',
  rock1: 'sprites/icerock/rock1.png',
  rock2: 'sprites/icerock/rock2.png',
  rock3: 'sprites/icerock/rock3.png',
  rock4: 'sprites/icerock/rock4.png',
  rock5: 'sprites/icerock/rock5.png',
};

const ROCK_TEX_KEYS = ['rock1', 'rock2', 'rock3', 'rock4', 'rock5'];

// ===== Cargo =====
const BOAT_CARGO_TYPES = ['💡', '📦', '⚙️', '🧨', '🥃', '🛢️'];

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
  WIN_SCORE,
  NIGHT_DURATION_MS,
  SPAWN_MARGIN,
  BOAT_SPEED,
  BOAT_RADIUS,
  BOAT_WIDTH,
  KRAKEN_RADIUS,
  KRAKEN_WIDTH,
  WAKE_MAX,
  WAKE_SPAWN_BACK,
  WAKE_DOT_R_MIN,
  WAKE_DOT_R_GROWTH,
  WAKE_EMIT_DIST_MIN,
  WAKE_EMIT_DIST_MAX,
  WAKE_SIDE_JITTER,
  WAKE_ALONG_JITTER,
  WAKE_ALONG_SCALE_MIN,
  WAKE_ALONG_SCALE_MAX,
  ARRIVAL_RADIUS,
  KEEPER_XP_BASE,
  KEEPER_XP_GROWTH,
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
  PERK_ELASTIC_BEAM_DEG_PER_STACK,
  PERK_ELASTIC_BEAM_SHRINK_SPEED,
  OCCULT_LAMP_SCARE_RADIUS,
  OLD_MAP_REVEAL_MS,
  LAMP_OIL_RESERVE_BONUS,
  SPARE_GENERATOR_START_CHARGE,
  PERK_NEW_ICEBERGS_COUNT,
  ICEBERG_SPAWN_INITIAL_DELAY_MS,
  ICEBERG_SPAWN_STAGGER_MS,
  ICEBERG_SURFACE_RISE,
  ICEBERG_SURFACE_DURATION,
  BEAM_ROTATE_SPEED,
  BEAM_LEN,
  LAMP_FULL_ANGLE,
  LAMP_MIN_ANGLE,
  BEAM_VISUAL_NARROW_ANGLE,
  LAMP_BURNOUT_TIME,
  LAMP_FLICKER_START,
  BEACON_RADIUS,
  BEACON_PULSE_SPEED,
  DARKNESS_RADIUS,
  MOB_SPAWN_RING,
  DARK_ALPHA,
  SPAWN_INTERVAL_MIN,
  SPAWN_INTERVAL_MAX,
  WORLD_FIT_DIAMETER,
  computeWorldScale,
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
  KRAKEN_CHASE_FRAMES,
  KRAKEN_RETREAT_FRAMES,
  KRAKEN_FRAME_DURATION,
  LIT_DEBOUNCE,
  BOAT_ROCK_IMMUNITY_COOLDOWN_MS,
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
  tickAnim,
};
