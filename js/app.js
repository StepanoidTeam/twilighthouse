// import * as PIXI from "../../pixi/pixi.js";
// https://cdn.jsdelivr.net/npm/pixi.js@8.12.0/dist/pixi.mjs
// ===== Game Over by Boats (Iceberg) =====
async function showBoatGameOver() {
  // Показать спрайты-кнопки
  if (overlayLayer.keyEnter && overlayLayer.keySpace) {
    overlayLayer.keyEnter.visible = true;
    overlayLayer.keySpace.visible = true;
  }
  gameOver = true;
  txtMessage.text = '💀 Game Over — 3 boats sunk!';
  overlayLayer.visible = true;
  playFailSound();
  // Сделать текст поверх splash
  txtMessage.style = new PIXI.TextStyle({
    ...UI_STYLE,
    fontSize: 38,
    fontWeight: 'bold',
    fill: '#fff',
    stroke: '#000',
    strokeThickness: 6,
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 8,
    dropShadowDistance: 0,
    align: 'center',
  });
  txtMessage.position.set(gameW / 2, gameH / 2 - 60);
  txtMessage.visible = true;
  txtRestart.style = new PIXI.TextStyle({
    ...UI_STYLE,
    fontSize: 22,
    fontWeight: 'normal',
    fill: '#fff',
    stroke: '#000',
    strokeThickness: 4,
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 6,
    dropShadowDistance: 0,
    align: 'center',
  });
  txtRestart.position.set(gameW / 2, gameH / 2 + 60);
  txtRestart.visible = true;
  // Загрузить splash-iceberg.png, если не загружен
  if (!textures.splashIceberg) {
    textures.splashIceberg = await PIXI.Assets.load(
      'sprites/splash-iceberg.png',
    );
  }
  overlayLayer.splashIceberg.texture = textures.splashIceberg;
  overlayLayer.splashIceberg.visible = true;
  repositionUI();
  // Скрыть splashMermaid если был
  if (overlayLayer.splashMermaid) overlayLayer.splashMermaid.visible = false;
}

// ===== Game Over by Police =====
function showPoliceGameOver() {
  if (overlayLayer.keyEnter && overlayLayer.keySpace) {
    overlayLayer.keyEnter.visible = true;
    overlayLayer.keySpace.visible = true;
  }
  gameOver = true;
  txtMessage.text = '🚔 Арест! Полиция захватила маяк!';
  overlayLayer.visible = true;
  playFailSound();
  txtMessage.style = new PIXI.TextStyle({
    ...UI_STYLE,
    fontSize: 38,
    fontWeight: 'bold',
    fill: '#fff',
    stroke: '#000',
    strokeThickness: 6,
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 8,
    dropShadowDistance: 0,
    align: 'center',
  });
  txtMessage.position.set(gameW / 2, gameH / 2 - 40);
  txtMessage.visible = true;
  txtRestart.style = new PIXI.TextStyle({
    ...UI_STYLE,
    fontSize: 22,
    fontWeight: 'normal',
    fill: '#fff',
    stroke: '#000',
    strokeThickness: 4,
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 6,
    dropShadowDistance: 0,
    align: 'center',
  });
  txtRestart.position.set(gameW / 2, gameH / 2 + 60);
  txtRestart.visible = true;
}
import { analytics, logEvent } from '../firebase.init.js';

const PIXI = globalThis.PIXI;
const $gameContainer = document.getElementById('$gameContainer');

if (!PIXI) {
  throw new Error('PIXI not loaded — include pixi.min.js before app.js.');
}

// ===== Lighthouse Demo Game =====
// Player controls the lighthouse beam. Boats approach from all sides.
// Illuminate boats to guide them safely — if they hit rocks, they sink.

// ===== Constants =====
const BOAT_SPEED = 0.8;
const BOAT_RADIUS = 14;
const BEAM_ROTATE_SPEED = 0.04;
const WAKE_MAX = 30;
const ROCK_SAFE_ZONE = 120;
const ROCK_SPAWN_RADIUS = 400; // max distance from lighthouse where rocks can spawn
const ARRIVAL_RADIUS = 55;
const MAX_LIVES = 10;
const WIN_SCORE = 10;
const SPAWN_MARGIN = 60;
const SPAWN_INTERVAL_MIN = 2500;
const SPAWN_INTERVAL_MAX = 5000;
const BOAT_SCALE = 0.18;
const BEACON_RADIUS = 4;
const BEACON_PULSE_SPEED = 0.003;
let BEAM_HALF_ANGLE = 0.3;
const BEAM_LEN = 1400;
const DARK_ALPHA = 0.82;
let LH_GLOW_RADIUS = 55;
let BEAM_ORIGIN_OFFSET_X = 0;
let BEAM_ORIGIN_OFFSET_Y = -64;
const CAM_OFFSET = 100;
const CAM_EASE = 0.04;
const CAM_BEAM_OFFSET = 160; // how far camera shifts toward beam direction

// Lamp burnout
const LAMP_FULL_ANGLE = 0.3;
const LAMP_MIN_ANGLE = 0.08;
const LAMP_BURNOUT_TIME = 1200;
const LAMP_FLICKER_START = 0.5;

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

// ===== Sprite Files (from sprites/ folder) =====
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

// Ping-pong frame sequence: 1→2→3→2→1→...
const MERMAID_FRAMES = ['mermaid1', 'mermaid2', 'mermaid3', 'mermaid2'];
const MERMAID_FRAME_DURATION = 8; // ticks per frame at 60fps

const BOAT_FRAMES = ['boat1', 'boat2', 'boat3', 'boat2'];
const BOAT_FRAME_DURATION = 10; // ticks per frame at 60fps

// ===== Game State =====
let app;
let gameW, gameH, lhX, lhY;
let bgMusic;
let lighthouseContainer, lighthouseSprite;
let textures = {};
let darknessGfx, wakeGfx, lhGlow;
let darkRT, darkFill, beamErase;
let keys = {};
let beamAngle = -Math.PI / 2;
let gameOver = false;
let boats = [];
let mermaids = [];
let policeBoats = [];
let krakens = [];
let rocks = [];
let rockColliders = [];
let rockSprites = [];
let score = 0;
let lives = MAX_LIVES;
let boatsSunk = 0;
let mermaidsArrived = 0;
let policeArrived = 0;
let krakensArrived = 0;
let nextSpawnTime = 0;
let lampTimer = 0;
let lampFlicker = 1;
let rockLayer, boatLayer, beaconLayer, tooltipLayer, worldContainer;
let camX = 0,
  camY = 0;
// Camera shake state
let shakeTime = 0;
let shakeIntensity = 0;

// ===== Debug =====
let debugMode = false;
let debugGfx, debugText;

// ===== UI State =====
let hudLayer, overlayLayer;
let txtLives, txtScore, txtMermaids, txtPolice, txtLamp, txtMessage, txtRestart;
let btnLeft, btnRight;
let overlayBg;

// ===== Tooltips =====
const tooltips = [];
const TOOLTIP_RISE_SPEED = 0.5;
const TOOLTIP_DURATION = 80;

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

function spawnTooltip(x, y, text, style) {
  const txt = new PIXI.Text(text, style);
  txt.anchor.set(0.5);
  txt.position.set(x, y);
  tooltipLayer.addChild(txt);
  tooltips.push({ txt, age: 0 });
}

function updateTooltips(delta) {
  for (let i = tooltips.length - 1; i >= 0; i--) {
    const t = tooltips[i];
    t.age += delta;
    t.txt.y -= TOOLTIP_RISE_SPEED * delta;
    t.txt.alpha = Math.max(0, 1 - t.age / TOOLTIP_DURATION);
    if (t.age >= TOOLTIP_DURATION) {
      tooltipLayer.removeChild(t.txt);
      t.txt.destroy();
      tooltips.splice(i, 1);
    }
  }
}

// ===== Debug =====
function updateDebug() {
  const ox = lhX + BEAM_ORIGIN_OFFSET_X;
  const oy = lhY + BEAM_ORIGIN_OFFSET_Y;
  const bLen = 300;

  debugGfx.clear();

  // Crosshair at lighthouse center (lhX, lhY)
  debugGfx.lineStyle(1, 0x888888, 0.5);
  debugGfx.moveTo(lhX - 20, lhY);
  debugGfx.lineTo(lhX + 20, lhY);
  debugGfx.moveTo(lhX, lhY - 20);
  debugGfx.lineTo(lhX, lhY + 20);

  // Beam origin point
  debugGfx.lineStyle(0);
  debugGfx.beginFill(0x00ff00, 1);
  debugGfx.drawCircle(ox, oy, 4);
  debugGfx.endFill();

  // Line from lhCenter to beam origin
  debugGfx.lineStyle(1, 0x00ff00, 0.6);
  debugGfx.moveTo(lhX, lhY);
  debugGfx.lineTo(ox, oy);

  // Beam cone edges
  debugGfx.lineStyle(2, 0xffff00, 0.7);
  debugGfx.moveTo(ox, oy);
  debugGfx.lineTo(
    ox + Math.cos(beamAngle - BEAM_HALF_ANGLE) * bLen,
    oy + Math.sin(beamAngle - BEAM_HALF_ANGLE) * bLen,
  );
  debugGfx.moveTo(ox, oy);
  debugGfx.lineTo(
    ox + Math.cos(beamAngle + BEAM_HALF_ANGLE) * bLen,
    oy + Math.sin(beamAngle + BEAM_HALF_ANGLE) * bLen,
  );

  // Beam center line
  debugGfx.lineStyle(1, 0xff8800, 0.5);
  debugGfx.moveTo(ox, oy);
  debugGfx.lineTo(
    ox + Math.cos(beamAngle) * bLen,
    oy + Math.sin(beamAngle) * bLen,
  );

  // Glow radius circle
  debugGfx.lineStyle(1, 0x00aaff, 0.5);
  debugGfx.drawCircle(ox, oy, LH_GLOW_RADIUS);

  // Arrival radius
  debugGfx.lineStyle(1, 0x88ff88, 0.3);
  debugGfx.drawCircle(lhX, lhY, ARRIVAL_RADIUS);

  // Rock spawn zone (safe zone inner, max radius outer)
  debugGfx.lineStyle(1, 0xffaa00, 0.4);
  debugGfx.drawCircle(lhX, lhY, ROCK_SAFE_ZONE);
  debugGfx.lineStyle(1, 0xffaa00, 0.25);
  debugGfx.drawCircle(lhX, lhY, ROCK_SPAWN_RADIUS);

  // Rock colliders
  for (const rock of rockColliders) {
    debugGfx.lineStyle(2, 0xff2222, 0.8);
    debugGfx.drawCircle(rock.x, rock.y, rock.radius);
    debugGfx.lineStyle(0);
    debugGfx.beginFill(0xff2222, 0.3);
    debugGfx.drawCircle(rock.x, rock.y, rock.radius);
    debugGfx.endFill();
    debugGfx.beginFill(0xff0000, 1);
    debugGfx.drawCircle(rock.x, rock.y, 2);
    debugGfx.endFill();
  }

  // Debug: кнопки управления (позиция и текст)
  if (btnLeft && btnRight) {
    // Кнопка влево
    debugGfx.lineStyle(2, 0x00ff00, 0.7);
    debugGfx.drawRect(
      btnLeft.x - btnLeft.width / 2,
      btnLeft.y - btnLeft.height / 2,
      btnLeft.width,
      btnLeft.height,
    );
    // Кнопка вправо
    debugGfx.lineStyle(2, 0x0000ff, 0.7);
    debugGfx.drawRect(
      btnRight.x - btnRight.width / 2,
      btnRight.y - btnRight.height / 2,
      btnRight.width,
      btnRight.height,
    );

    // Текстовые элементы на кнопках
    // btnLeft
    btnLeft.children.forEach((child) => {
      if (child.text) {
        debugGfx.lineStyle(1, 0xffff00, 0.8);
        debugGfx.drawRect(
          btnLeft.x + child.x - child.width / 2,
          btnLeft.y + child.y - child.height / 2,
          child.width,
          child.height,
        );
      }
    });
    // btnRight
    btnRight.children.forEach((child) => {
      if (child.text) {
        debugGfx.lineStyle(1, 0xff00ff, 0.8);
        debugGfx.drawRect(
          btnRight.x + child.x - child.width / 2,
          btnRight.y + child.y - child.height / 2,
          child.width,
          child.height,
        );
      }
    });
  }

  // Update glow position live
  lhGlow.position.set(lhX, lhY + BEAM_ORIGIN_OFFSET_Y);

  // Debug text
  debugText.text =
    `[F1] Debug  |  ↑↓ offsetY: ${BEAM_ORIGIN_OFFSET_Y}  |  [] halfAngle: ${BEAM_HALF_ANGLE.toFixed(2)}  |  -+ glowR: ${LH_GLOW_RADIUS}\n` +
    `beamAngle: ${((beamAngle * 180) / Math.PI).toFixed(1)}°  |  origin: (${ox}, ${oy})`;
}

// ===== Resize =====
function resize() {
  gameW = window.innerWidth;
  gameH = window.innerHeight;
  lhX = gameW / 2;
  lhY = gameH / 2;
  app.renderer.resize(gameW, gameH);
  // Resize darkness render texture
  const pad = CAM_OFFSET + 40;
  darkRT.resize(gameW + pad * 2, gameH + pad * 2);
}

// ===== Generate Rocks =====
function generateRocks() {
  const count = Math.floor((gameW * gameH) / 18000);
  const rockDefs = [];

  for (let i = 0; i < count; i++) {
    let x,
      y,
      tries = 0;
    do {
      x = Math.random() * gameW;
      y = Math.random() * gameH;
      tries++;
    } while (
      tries < 50 &&
      (Math.hypot(x - lhX, y - lhY) < ROCK_SAFE_ZONE ||
        Math.hypot(x - lhX, y - lhY) > ROCK_SPAWN_RADIUS ||
        rockDefs.some((r) => Math.hypot(x - r.x, y - r.y) < 60))
    );

    if (tries >= 50) continue;

    const texKey =
      ROCK_TEX_KEYS[Math.floor(Math.random() * ROCK_TEX_KEYS.length)];
    const sc = 0.08 + Math.random() * 0.12;
    rockDefs.push({ x, y, tex: texKey, sc });
  }
  return rockDefs;
}

function buildRocks(parent) {
  const defs = generateRocks();
  for (const r of defs) {
    const spr = new PIXI.Sprite(textures[r.tex]);
    spr.anchor.set(0.5);
    spr.position.set(r.x, r.y);
    spr.scale.set(r.sc);
    parent.addChild(spr);

    // Store original position for animation
    spr._baseY = r.y;
    spr._floatPhase = Math.random() * Math.PI * 2;
    rockSprites.push(spr);

    const avgW = textures[r.tex].width;
    const avgH = textures[r.tex].height;
    const avgSize = (avgW + avgH) / 2;
    rockColliders.push({ x: r.x, y: r.y, radius: avgSize * r.sc * 0.3 });
  }
}

// ===== Build Lighthouse =====
function buildLighthouse(parent) {
  lighthouseContainer = new PIXI.Container();
  lighthouseContainer.position.set(lhX, lhY);

  lighthouseSprite = new PIXI.Sprite(textures.lighthouse);
  lighthouseSprite.anchor.set(0.5, 0.75);
  lighthouseSprite.scale.set(0.27);
  lighthouseContainer.addChild(lighthouseSprite);

  // Add lighthouse to worldContainer (so it moves with the map)
  parent.addChild(lighthouseContainer);
}

// ===== Lighthouse Glow =====
function buildGlow(parent) {
  lhGlow = new PIXI.Graphics();
  lhGlow.blendMode = PIXI.BLEND_MODES.ADD;
  lhGlow.beginFill(C.lhLight, 0.12);
  lhGlow.drawCircle(0, 0, 40);
  lhGlow.endFill();
  lhGlow.beginFill(C.lhLight, 0.18);
  lhGlow.drawCircle(0, 0, 18);
  lhGlow.endFill();
  // Attach glow to lighthouseContainer, so it follows the sprite
  lhGlow.position.set(0, BEAM_ORIGIN_OFFSET_Y);
  lighthouseContainer.addChild(lhGlow);
}

// ===== Darkness Overlay =====
function buildDarkness(parent) {
  const pad = CAM_OFFSET + 40;
  darkRT = PIXI.RenderTexture.create({
    width: gameW + pad * 2,
    height: gameH + pad * 2,
  });

  darknessGfx = new PIXI.Sprite(darkRT);
  darknessGfx.position.set(-pad, -pad);
  darknessGfx.filters = [new PIXI.BlurFilter(20)];
  parent.addChild(darknessGfx);

  darkFill = new PIXI.Graphics();
  beamErase = new PIXI.Graphics();
  beamErase.blendMode = PIXI.BLEND_MODES.ERASE;
}

function updateDarkness() {
  const pad = CAM_OFFSET + 40;
  const bLen = Math.max(gameW, gameH) * 2;
  // cx/cy — мировые координаты маяка + pad (без camX/camY)
  const cx = lhX + BEAM_ORIGIN_OFFSET_X + pad;
  const cy = lhY + BEAM_ORIGIN_OFFSET_Y + pad;

  // Dark fill
  darkFill.clear();
  darkFill.beginFill(0x000000, DARK_ALPHA);
  darkFill.drawRect(0, 0, gameW + pad * 2, gameH + pad * 2);
  darkFill.endFill();

  app.renderer.render(darkFill, { renderTexture: darkRT, clear: true });

  // Erase beam cone + lighthouse circle (modulated by lamp flicker)
  beamErase.clear();
  beamErase.beginFill(0xffffff, lampFlicker);
  beamErase.moveTo(cx, cy);
  beamErase.lineTo(
    cx + Math.cos(beamAngle - BEAM_HALF_ANGLE) * bLen,
    cy + Math.sin(beamAngle - BEAM_HALF_ANGLE) * bLen,
  );
  beamErase.lineTo(
    cx + Math.cos(beamAngle + BEAM_HALF_ANGLE) * bLen,
    cy + Math.sin(beamAngle + BEAM_HALF_ANGLE) * bLen,
  );
  beamErase.closePath();
  beamErase.endFill();

  beamErase.beginFill(0xffffff, 1);
  beamErase.drawCircle(cx, cy, LH_GLOW_RADIUS);
  beamErase.endFill();

  app.renderer.render(beamErase, { renderTexture: darkRT, clear: false });
}

// ===== Boats =====
function spawnBoat() {
  const side = Math.floor(Math.random() * 4);
  let x, y;

  if (side === 0) {
    x = Math.random() * gameW;
    y = -SPAWN_MARGIN;
  } else if (side === 1) {
    x = gameW + SPAWN_MARGIN;
    y = Math.random() * gameH;
  } else if (side === 2) {
    x = Math.random() * gameW;
    y = gameH + SPAWN_MARGIN;
  } else {
    x = -SPAWN_MARGIN;
    y = Math.random() * gameH;
  }

  const spr = new PIXI.Sprite(textures.boat1);
  spr.anchor.set(0.5);
  spr.scale.set(BOAT_SCALE);
  spr.position.set(x, y);
  boatLayer.addChild(spr);

  // Green beacon light (placed in separate layer above darkness)
  const beacon = new PIXI.Graphics();
  // // Red beacon (original):
  // beacon.beginFill(0xff2200, 1);
  // beacon.drawCircle(0, 0, BEACON_RADIUS);
  // beacon.endFill();
  // beacon.beginFill(0xff4400, 0.4);
  // beacon.drawCircle(0, 0, BEACON_RADIUS * 2.5);
  // beacon.endFill();
  beacon.beginFill(0x00dd44, 1);
  beacon.drawCircle(0, 0, BEACON_RADIUS);
  beacon.endFill();
  beacon.beginFill(0x44ff88, 0.4);
  beacon.drawCircle(0, 0, BEACON_RADIUS * 2.5);
  beacon.endFill();
  beacon.blendMode = PIXI.BLEND_MODES.ADD;
  beacon.position.set(x, y);
  beaconLayer.addChild(beacon);

  const angle = Math.atan2(lhY - y, lhX - x);
  spr.rotation = angle + Math.PI / 2;

  boats.push({
    spr,
    beacon,
    beaconPhase: Math.random() * Math.PI * 2,
    speed: BOAT_SPEED + Math.random() * 0.4,
    lit: false,
    sinkTimer: 0,
    sinking: false,
    arrived: false,
    wake: [],
    frameIndex: 0,
    frameTick: Math.random() * BOAT_FRAME_DURATION,
  });
}

// ===== Mermaids =====
function spawnMermaid() {
  // Same spawn logic as boats
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) {
    x = Math.random() * gameW;
    y = -SPAWN_MARGIN;
  } else if (side === 1) {
    x = gameW + SPAWN_MARGIN;
    y = Math.random() * gameH;
  } else if (side === 2) {
    x = Math.random() * gameW;
    y = gameH + SPAWN_MARGIN;
  } else {
    x = -SPAWN_MARGIN;
    y = Math.random() * gameH;
  }
  const spr = new PIXI.Sprite(textures.mermaid1);
  spr.anchor.set(0.5);
  spr.scale.set(BOAT_SCALE);
  spr.position.set(x, y);
  boatLayer.addChild(spr);
  mermaids.push({
    spr,
    speed: BOAT_SPEED + Math.random() * 0.4, // скорость как у лодок
    gone: false,
    fleeing: false,
    wavePhase: Math.random() * Math.PI * 2, // для колебания
    frameIndex: 0,
    frameTick: Math.random() * MERMAID_FRAME_DURATION, // offset фазы
  });
}

// ===== Krakens =====
function spawnKraken() {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) {
    x = Math.random() * gameW;
    y = -SPAWN_MARGIN;
  } else if (side === 1) {
    x = gameW + SPAWN_MARGIN;
    y = Math.random() * gameH;
  } else if (side === 2) {
    x = Math.random() * gameW;
    y = gameH + SPAWN_MARGIN;
  } else {
    x = -SPAWN_MARGIN;
    y = Math.random() * gameH;
  }
  const spr = new PIXI.Sprite(textures.kraken); // placeholder — replace with textures.kraken
  spr.anchor.set(0.5);
  spr.scale.set(BOAT_SCALE * 1.5); // крупнее чем русалка
  spr.position.set(x, y);
  boatLayer.addChild(spr);
  krakens.push({
    spr,
    speed: BOAT_SPEED * 0.6 + Math.random() * 0.3,
    gone: false,
    fleeing: false,
  });
}

// ===== Police Boats =====
function spawnPoliceBoat() {
  const side = Math.floor(Math.random() * 4);
  let x, y;
  if (side === 0) {
    x = Math.random() * gameW;
    y = -SPAWN_MARGIN;
  } else if (side === 1) {
    x = gameW + SPAWN_MARGIN;
    y = Math.random() * gameH;
  } else if (side === 2) {
    x = Math.random() * gameW;
    y = gameH + SPAWN_MARGIN;
  } else {
    x = -SPAWN_MARGIN;
    y = Math.random() * gameH;
  }

  const spr = new PIXI.Sprite(textures.boat1);
  spr.anchor.set(0.5);
  spr.scale.set(BOAT_SCALE);
  spr.tint = 0xaaccff;
  spr.position.set(x, y);
  boatLayer.addChild(spr);

  const beacon = new PIXI.Graphics();
  beacon.beginFill(0x0044ff, 1);
  beacon.drawCircle(0, 0, BEACON_RADIUS);
  beacon.endFill();
  beacon.beginFill(0x2266ff, 0.4);
  beacon.drawCircle(0, 0, BEACON_RADIUS * 2.5);
  beacon.endFill();
  beacon.blendMode = PIXI.BLEND_MODES.ADD;
  beacon.position.set(x, y);
  beaconLayer.addChild(beacon);

  const angle = Math.atan2(lhY - y, lhX - x);
  spr.rotation = angle + Math.PI / 2;

  policeBoats.push({
    spr,
    beacon,
    speed: BOAT_SPEED * 1.1 + Math.random() * 0.3,
    sinkTimer: 0,
    sinking: false,
    arrived: false,
    beaconPhase: Math.random() * Math.PI * 2,
    beaconBlue: true,
    wake: [],
    frameIndex: 0,
    frameTick: Math.random() * BOAT_FRAME_DURATION,
    driftDir: Math.random() < 0.5 ? 1 : -1, // направление дрейфа мимо маяка
  });
}

function isInBeam(x, y) {
  const dx = x - lhX;
  const dy = y - (lhY + BEAM_ORIGIN_OFFSET_Y);
  let angle = Math.atan2(dy, dx);
  let diff = angle - beamAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) < BEAM_HALF_ANGLE;
}

function checkRockCollision(x, y) {
  for (const rock of rockColliders) {
    const dist = Math.hypot(x - rock.x, y - rock.y);
    if (dist < rock.radius + BOAT_RADIUS) return true;
  }
  return false;
}

function updateBoats(delta) {
  for (let i = boats.length - 1; i >= 0; i--) {
    const b = boats[i];
    if (b.arrived) continue;

    const { spr } = b;
    const lit = isInBeam(spr.x, spr.y);
    b.lit = lit;

    // Frame animation
    b.frameTick += delta;
    if (b.frameTick >= BOAT_FRAME_DURATION) {
      b.frameTick -= BOAT_FRAME_DURATION;
      b.frameIndex = (b.frameIndex + 1) % BOAT_FRAMES.length;
      spr.texture = textures[BOAT_FRAMES[b.frameIndex]];
    }

    // Steer toward lighthouse
    const toX = lhX - spr.x;
    const toY = lhY - spr.y;
    const dist = Math.hypot(toX, toY);

    if (dist < ARRIVAL_RADIUS && !b.sinking) {
      // Arrived safely
      b.arrived = true;
      score++;
      updateHUD();
      spawnTooltip(spr.x, spr.y - 20, '+1 ⛵', TOOLTIP_STYLE_OK);
      // Restore lamp on boat arrival
      lampTimer = 0;
      if (score >= WIN_SCORE) {
        gameOver = true;
        showWin();
      }
      // Fade out
      const fadeOut = () => {
        spr.alpha -= 0.02;
        b.beacon.alpha = spr.alpha;
        if (spr.alpha <= 0) {
          app.ticker.remove(fadeOut);
          boatLayer.removeChild(spr);
          beaconLayer.removeChild(b.beacon);
          boats.splice(boats.indexOf(b), 1);
        }
      };
      app.ticker.add(fadeOut);
      continue;
    }

    if (b.sinking) {
      b.sinkTimer += delta;
      spr.alpha = Math.max(0, 1 - b.sinkTimer / 60);
      spr.rotation += 0.03 * delta;
      spr.scale.set(BOAT_SCALE * (1 - b.sinkTimer / 80));
      if (spr.alpha <= 0) {
        boatLayer.removeChild(spr);
        beaconLayer.removeChild(b.beacon);
        boats.splice(i, 1);
      }
      continue;
    }

    // Movement — boats move slowly, faster when lit
    const speedMult = lit ? 1.5 : 0.6;
    const nx = toX / dist;
    const ny = toY / dist;

    // Add slight wander when not lit
    let wx = 0,
      wy = 0;
    if (!lit) {
      const wander = Math.sin(Date.now() * 0.001 + i * 7) * 0.5;
      wx = -ny * wander;
      wy = nx * wander;
    }

    const moveX = (nx + wx) * b.speed * speedMult * delta;
    const moveY = (ny + wy) * b.speed * speedMult * delta;
    spr.x += moveX;
    spr.y += moveY;

    // Face movement direction
    const targetRot = Math.atan2(moveY, moveX) + Math.PI / 2;
    let rDiff = targetRot - spr.rotation;
    while (rDiff > Math.PI) rDiff -= Math.PI * 2;
    while (rDiff < -Math.PI) rDiff += Math.PI * 2;
    spr.rotation += rDiff * 0.08 * delta;

    // Rock collision — sink if not lit
    if (checkRockCollision(spr.x, spr.y)) {
      if (!lit) {
        b.sinking = true;
        b.sinkTimer = 0;
        lives--;
        boatsSunk++;
        updateHUD();
        spawnTooltip(spr.x, spr.y - 20, '💀', TOOLTIP_STYLE_FAIL);
        // 🛥️ Корабль затонул
        console.log(
          `🛥️ Корабль затонул на (${spr.x.toFixed(0)}, ${spr.y.toFixed(0)})`,
        );
        // Если три корабля затонуло — проигрыш
        if (boatsSunk >= 6 && !gameOver) {
          showBoatGameOver();
        } else if (lives <= 0) {
          gameOver = true;
          showGameOver();
        }
      } else {
        // Push away from rock
        for (const rock of rockColliders) {
          const rd = Math.hypot(spr.x - rock.x, spr.y - rock.y);
          if (rd < rock.radius + BOAT_RADIUS && rd > 0) {
            spr.x =
              rock.x + ((spr.x - rock.x) / rd) * (rock.radius + BOAT_RADIUS);
            spr.y =
              rock.y + ((spr.y - rock.y) / rd) * (rock.radius + BOAT_RADIUS);
          }
        }
      }
    }

    // Wake trail
    b.wake.unshift({ x: spr.x - nx * 14, y: spr.y - ny * 14, age: 0 });
    if (b.wake.length > WAKE_MAX) b.wake.pop();

    // Pulse beacon and follow boat
    const pulse = Math.max(
      0,
      Math.sin(Date.now() * BEACON_PULSE_SPEED + b.beaconPhase),
    );
    b.beacon.alpha = pulse;
    b.beacon.position.set(spr.x, spr.y);
  }
}

function drawWakes() {
  wakeGfx.clear();
  for (const b of boats) {
    for (const w of b.wake) {
      w.age++;
      const t = w.age / WAKE_MAX;
      if (t >= 1) continue;
      wakeGfx.beginFill(C.wake, (1 - t) * 0.15);
      wakeGfx.drawCircle(w.x, w.y, 2 + t * 4);
      wakeGfx.endFill();
    }
    while (b.wake.length > 0 && b.wake[b.wake.length - 1].age > WAKE_MAX) {
      b.wake.pop();
    }
  }
  for (const p of policeBoats) {
    for (const w of p.wake) {
      w.age++;
      const t = w.age / WAKE_MAX;
      if (t >= 1) continue;
      wakeGfx.beginFill(C.wake, (1 - t) * 0.15);
      wakeGfx.drawCircle(w.x, w.y, 2 + t * 4);
      wakeGfx.endFill();
    }
    while (p.wake.length > 0 && p.wake[p.wake.length - 1].age > WAKE_MAX) {
      p.wake.pop();
    }
  }
}

// ===== Update Police Boats =====
function updatePoliceBoats(delta) {
  for (let i = policeBoats.length - 1; i >= 0; i--) {
    const p = policeBoats[i];
    if (p.arrived) continue;

    const { spr } = p;
    const toX = lhX - spr.x;
    const toY = lhY - spr.y;
    const dist = Math.hypot(toX, toY);

    // Frame animation (same as friendly boats)
    p.frameTick += delta;
    if (p.frameTick >= BOAT_FRAME_DURATION) {
      p.frameTick -= BOAT_FRAME_DURATION;
      p.frameIndex = (p.frameIndex + 1) % BOAT_FRAMES.length;
      spr.texture = textures[BOAT_FRAMES[p.frameIndex]];
    }

    // Копы: если светишь — плывут к маяку, если нет — дрейфяют мимо
    const lit = isInBeam(spr.x, spr.y);

    if (dist < ARRIVAL_RADIUS && !p.sinking && lit) {
      p.arrived = true;
      policeArrived++;
      updateHUD();
      console.log(
        `🚔 Полицейский катер добрался до маяка (${spr.x.toFixed(0)}, ${spr.y.toFixed(0)})`,
      );
      spawnTooltip(spr.x, spr.y - 20, '🚔', TOOLTIP_STYLE_FAIL);
      shakeTime = 0.5;
      shakeIntensity = 18;
      if (policeArrived >= 3 && !gameOver) {
        showPoliceGameOver();
      }
      const fadeOut = () => {
        spr.alpha -= 0.02;
        p.beacon.alpha = spr.alpha;
        if (spr.alpha <= 0) {
          app.ticker.remove(fadeOut);
          boatLayer.removeChild(spr);
          beaconLayer.removeChild(p.beacon);
          policeBoats.splice(policeBoats.indexOf(p), 1);
        }
      };
      app.ticker.add(fadeOut);
      continue;
    }

    if (p.sinking) {
      p.sinkTimer += delta;
      spr.alpha = Math.max(0, 1 - p.sinkTimer / 60);
      spr.rotation += 0.03 * delta;
      spr.scale.set(BOAT_SCALE * (1 - p.sinkTimer / 80));
      if (spr.alpha <= 0) {
        boatLayer.removeChild(spr);
        beaconLayer.removeChild(p.beacon);
        policeBoats.splice(i, 1);
      }
      continue;
    }

    // Копы: если светишь — плывут к маяку, если нет — дрейфяют мимо
    const nx = toX / dist;
    const ny = toY / dist;

    let moveNx, moveNy, speedMult;
    if (lit) {
      // Направление к маяку
      moveNx = nx;
      moveNy = ny;
      speedMult = 1.5;
    } else {
      // Тангенциальный дрейф мимо маяка
      moveNx = -ny * p.driftDir;
      moveNy = nx * p.driftDir;
      speedMult = 0.9;
    }

    const moveX = moveNx * p.speed * speedMult * delta;
    const moveY = moveNy * p.speed * speedMult * delta;
    spr.x += moveX;
    spr.y += moveY;

    // Face movement direction
    const targetRot = Math.atan2(moveY, moveX) + Math.PI / 2;
    let rDiff = targetRot - spr.rotation;
    while (rDiff > Math.PI) rDiff -= Math.PI * 2;
    while (rDiff < -Math.PI) rDiff += Math.PI * 2;
    spr.rotation += rDiff * 0.08 * delta;

    // Rock collision — sink when not lit (no penalty), push away when lit
    if (checkRockCollision(spr.x, spr.y)) {
      if (!lit) {
        p.sinking = true;
        p.sinkTimer = 0;
        spawnTooltip(spr.x, spr.y - 20, '💀', TOOLTIP_STYLE_FAIL);
        console.log(
          `🚔 Полицейский катер разбился о камни (${spr.x.toFixed(0)}, ${spr.y.toFixed(0)})`,
        );
      } else {
        for (const rock of rockColliders) {
          const rd = Math.hypot(spr.x - rock.x, spr.y - rock.y);
          if (rd < rock.radius + BOAT_RADIUS && rd > 0) {
            spr.x =
              rock.x + ((spr.x - rock.x) / rd) * (rock.radius + BOAT_RADIUS);
            spr.y =
              rock.y + ((spr.y - rock.y) / rd) * (rock.radius + BOAT_RADIUS);
          }
        }
      }
    }

    // Wake trail
    p.wake.unshift({ x: spr.x - moveNx * 14, y: spr.y - moveNy * 14, age: 0 });
    if (p.wake.length > WAKE_MAX) p.wake.pop();

    // Pulse beacon: same sine as regular boats, color alternates by sign
    const t = Math.sin(Date.now() * BEACON_PULSE_SPEED + p.beaconPhase);
    const isBlue = t >= 0;
    if (isBlue !== p.beaconBlue) {
      p.beaconBlue = isBlue;
      const col = isBlue ? 0x0044ff : 0xff2200;
      const glow = isBlue ? 0x2266ff : 0xff4400;
      p.beacon.clear();
      p.beacon.beginFill(col, 1);
      p.beacon.drawCircle(0, 0, BEACON_RADIUS);
      p.beacon.endFill();
      p.beacon.beginFill(glow, 0.4);
      p.beacon.drawCircle(0, 0, BEACON_RADIUS * 2.5);
      p.beacon.endFill();
      p.beacon.blendMode = PIXI.BLEND_MODES.ADD;
    }
    p.beacon.alpha = Math.abs(t);
    p.beacon.position.set(spr.x, spr.y);
  }
}

// ===== Input =====
function bindEvents() {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    // (txtHint removed)

    // Toggle debug mode
    if (e.code === 'F1') {
      e.preventDefault();
      debugMode = !debugMode;
      debugGfx.visible = debugMode;
      debugText.visible = debugMode;
      darknessGfx.visible = !debugMode;
      console.log(`🔧 Debug mode: ${debugMode}`);
    }

    // Adjust BEAM_ORIGIN_OFFSET_Y in debug mode
    if (debugMode && e.code === 'ArrowUp') BEAM_ORIGIN_OFFSET_Y -= 2;
    if (debugMode && e.code === 'ArrowDown') BEAM_ORIGIN_OFFSET_Y += 2;
    if (debugMode && e.code === 'BracketLeft')
      BEAM_HALF_ANGLE = Math.max(0.05, BEAM_HALF_ANGLE - 0.02);
    if (debugMode && e.code === 'BracketRight') BEAM_HALF_ANGLE += 0.02;
    if (debugMode && e.code === 'Minus')
      LH_GLOW_RADIUS = Math.max(5, LH_GLOW_RADIUS - 5);
    if (debugMode && e.code === 'Equal') LH_GLOW_RADIUS += 5;

    // Restart on Enter/Space when game over
    if (gameOver && (e.code === 'Enter' || e.code === 'Space')) {
      restart();
    }
  });

  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
  });

  window.addEventListener('resize', () => {
    resize();
    lhGlow.position.set(lhX, lhY + BEAM_ORIGIN_OFFSET_Y);
    repositionUI();
  });
}

// ===== Pixi UI =====
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

function bindTurnButton(button, keyCode) {
  button.interactive = true;
  button.buttonMode = true;
  button.cursor = 'pointer';
  button.hitArea = new PIXI.Circle(0, 0, 44);

  const press = () => {
    keys[keyCode] = true;
  };

  const release = () => {
    keys[keyCode] = false;
  };

  button.on('pointerdown', press);
  button.on('pointerup', release);
  button.on('pointerupoutside', release);
  button.on('pointercancel', release);
  button.on('pointerout', release);
}

function buildUI() {
  // Overlay layer (game over)
  overlayLayer = new PIXI.Container();
  overlayLayer.visible = false;

  // Кнопки Enter и Spacebar для экрана поражения
  overlayLayer.keyEnter = new PIXI.Sprite(textures.buttonEnter);
  overlayLayer.keyEnter.anchor.set(0.5);
  overlayLayer.keyEnter.visible = false;
  overlayLayer.addChild(overlayLayer.keyEnter);

  overlayLayer.keySpace = new PIXI.Sprite(textures.buttonSpace);
  overlayLayer.keySpace.anchor.set(0.5);
  overlayLayer.keySpace.visible = false;
  overlayLayer.addChild(overlayLayer.keySpace);
  // HUD layer (always on top)
  hudLayer = new PIXI.Container();

  txtLives = new PIXI.Text('❤️❤️❤️', new PIXI.TextStyle(UI_STYLE));
  txtLives.anchor.set(0.5, 0);
  hudLayer.addChild(txtLives);

  txtScore = new PIXI.Text('⛵ 0', new PIXI.TextStyle(UI_STYLE));
  txtScore.anchor.set(0.5, 0);
  hudLayer.addChild(txtScore);

  txtMermaids = new PIXI.Text('🧜 0/3', new PIXI.TextStyle(UI_STYLE));
  txtMermaids.anchor.set(0, 0);
  hudLayer.addChild(txtMermaids);

  txtPolice = new PIXI.Text('🚔 0/3', new PIXI.TextStyle(UI_STYLE));
  txtPolice.anchor.set(1, 0);
  hudLayer.addChild(txtPolice);

  txtLamp = new PIXI.Text('💡💡💡💡💡', new PIXI.TextStyle(UI_STYLE));
  txtLamp.anchor.set(0.5, 0);
  hudLayer.addChild(txtLamp);

  // Arrow buttons at bottom
  const BTN_BOTTOM_MARGIN = 80; // raise buttons higher
  const btnY = () => gameH - BTN_BOTTOM_MARGIN;
  const btnSpacing = 110;
  const btnScale = 0.32; // make buttons even smaller
  // Left button
  btnLeft = new PIXI.Container();
  const sprLeft = new PIXI.Sprite(textures.button);
  sprLeft.anchor.set(0.5);
  sprLeft.scale.set(btnScale);
  btnLeft.addChild(sprLeft);
  // Add left arrow symbol on the left side
  const txtArrowLeft = new PIXI.Text('←', {
    fontFamily: 'Segoe UI, system-ui, sans-serif',
    fontSize: 32,
    fill: '#fff',
    align: 'center',
    fontWeight: 'bold',
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 4,
    dropShadowDistance: 0,
  });
  txtArrowLeft.anchor.set(0.5);
  txtArrowLeft.x = -24; // move arrow to the left edge of button
  txtArrowLeft.y = -2;
  btnLeft.addChild(txtArrowLeft);
  // Add 'D' label on the opposite (top-right) corner
  const txtDLabelOnLeft = new PIXI.Text('D', {
    fontFamily: 'Segoe UI, system-ui, sans-serif',
    fontSize: 18,
    fill: '#fff',
    align: 'center',
    fontWeight: 'bold',
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 3,
    dropShadowDistance: 0,
  });
  txtDLabelOnLeft.anchor.set(0.5);
  txtDLabelOnLeft.x = 22;
  txtDLabelOnLeft.y = -28;
  btnLeft.addChild(txtDLabelOnLeft);
  btnLeft.position.set(gameW / 2 - btnSpacing, btnY());
  bindTurnButton(btnLeft, 'ArrowLeft');
  hudLayer.addChild(btnLeft);

  // Right button
  btnRight = new PIXI.Container();
  const sprRight = new PIXI.Sprite(textures.button);
  sprRight.anchor.set(0.5);
  sprRight.scale.set(btnScale);
  btnRight.addChild(sprRight);
  // Add right arrow symbol on the right side
  const txtArrowRight = new PIXI.Text('→', {
    fontFamily: 'Segoe UI, system-ui, sans-serif',
    fontSize: 32,
    fill: '#fff',
    align: 'center',
    fontWeight: 'bold',
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 4,
    dropShadowDistance: 0,
  });
  txtArrowRight.anchor.set(0.5);
  txtArrowRight.x = 24; // move arrow to the right edge of button
  txtArrowRight.y = -2;
  btnRight.addChild(txtArrowRight);
  // Add 'A' label on the opposite (top-left) corner
  const txtALabelOnRight = new PIXI.Text('A', {
    fontFamily: 'Segoe UI, system-ui, sans-serif',
    fontSize: 18,
    fill: '#fff',
    align: 'center',
    fontWeight: 'bold',
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 3,
    dropShadowDistance: 0,
  });
  txtALabelOnRight.anchor.set(0.5);
  txtALabelOnRight.x = -22;
  txtALabelOnRight.y = -28;
  btnRight.addChild(txtALabelOnRight);
  btnRight.position.set(gameW / 2 + btnSpacing, btnY());
  bindTurnButton(btnRight, 'ArrowRight');
  hudLayer.addChild(btnRight);

  app.stage.addChild(hudLayer);

  // Overlay layer (game over)
  overlayLayer = new PIXI.Container();
  overlayLayer.visible = false;

  overlayBg = new PIXI.Graphics();
  overlayLayer.addChild(overlayBg);

  txtMessage = new PIXI.Text(
    '',
    new PIXI.TextStyle({
      ...UI_STYLE,
      fontSize: 36,
    }),
  );
  txtMessage.anchor.set(0.5);
  overlayLayer.addChild(txtMessage);

  txtRestart = new PIXI.Text(
    'Press to play again',
    new PIXI.TextStyle({
      ...UI_STYLE,
      fontSize: 18,
      fontWeight: 'normal',
      fill: '#4a88aa',
    }),
  );
  txtRestart.anchor.set(0.5);
  overlayLayer.addChild(txtRestart);

  // Iceberg splash image (hidden by default)
  overlayLayer.splashIceberg = new PIXI.Sprite();
  overlayLayer.splashIceberg.anchor.set(0.5);
  overlayLayer.splashIceberg.visible = false;
  overlayLayer.addChildAt(overlayLayer.splashIceberg, 0);

  // Mermaid splash image (hidden by default)
  overlayLayer.splashMermaid = new PIXI.Sprite();
  overlayLayer.splashMermaid.anchor.set(0.5);
  overlayLayer.splashMermaid.visible = false;
  // Добавляем splash-картинку на задний план (индекс 1, после iceberg)
  overlayLayer.addChildAt(overlayLayer.splashMermaid, 1);

  // Kraken splash image (hidden by default)
  overlayLayer.splashKraken = new PIXI.Sprite();
  overlayLayer.splashKraken.anchor.set(0.5);
  overlayLayer.splashKraken.visible = false;
  overlayLayer.addChildAt(overlayLayer.splashKraken, 2);

  app.stage.addChild(overlayLayer);

  repositionUI();
}

function repositionUI() {
  // Позиционирование спрайтов-кнопок на экране поражения
  if (overlayLayer.keyEnter && overlayLayer.keySpace) {
    overlayLayer.keyEnter.position.set(gameW / 2 - 60, gameH / 2 + 105);
    overlayLayer.keySpace.position.set(gameW / 2 + 70, gameH / 2 + 105);
  }
  txtMermaids.position.set(12, 16);
  txtLives.position.set(gameW / 2 - 55, 16);
  txtScore.position.set(gameW / 2 + 55, 16);
  txtPolice.position.set(gameW - 12, 16);
  txtLamp.position.set(gameW / 2, 44);
  // Move buttons if present
  const BTN_BOTTOM_MARGIN = 80;
  if (btnLeft) btnLeft.position.set(gameW / 2 - 110, gameH - BTN_BOTTOM_MARGIN);
  if (btnRight)
    btnRight.position.set(gameW / 2 + 110, gameH - BTN_BOTTOM_MARGIN);

  overlayBg.clear();
  overlayBg.beginFill(0x0a1020, 0.8);
  overlayBg.drawRect(0, 0, gameW, gameH);
  overlayBg.endFill();

  txtMessage.position.set(gameW / 2, gameH / 2 - 20);
  txtRestart.position.set(gameW / 2, gameH / 2 + 50);

  positionSplashSprite(overlayLayer.splashIceberg);
  positionSplashSprite(overlayLayer.splashMermaid);
  positionSplashSprite(overlayLayer.splashKraken);
}

function positionSplashSprite(sprite) {
  if (!sprite) return;

  sprite.position.set(gameW / 2, gameH / 2);

  if (sprite.texture && sprite.texture.baseTexture) {
    const tex = sprite.texture;
    const tw = tex.width;
    const th = tex.height;
    const scale = Math.min(gameW / tw, gameH / th);
    sprite.width = tw * scale;
    sprite.height = th * scale;
  } else {
    sprite.width = gameW;
    sprite.height = gameH;
  }
}

// ===== HUD =====
function updateHUD() {
  txtScore.text = `⛵ ${score}`;
  txtLives.text = '❤️'.repeat(Math.max(0, lives));
  txtMermaids.text = `🧜 ${mermaidsArrived}/3`;
  txtPolice.text = `🚔 ${policeArrived}/3`;
  const bulbs = Math.max(
    0,
    Math.round((1 - lampTimer / LAMP_BURNOUT_TIME) * 5),
  );
  txtLamp.text = bulbs > 0 ? '💡'.repeat(bulbs) : '🔦';
}

// ===== Game Loop =====
function gameLoop(delta) {
  if (gameOver) return;

  // Beam rotation via keyboard (no easing)
  if (keys['KeyA'] || keys['ArrowLeft']) beamAngle -= BEAM_ROTATE_SPEED * delta;
  if (keys['KeyD'] || keys['ArrowRight'])
    beamAngle += BEAM_ROTATE_SPEED * delta;

  // Animate rocks (ice floes) gently up and down
  const rockTime = performance.now() * 0.001;
  for (const spr of rockSprites) {
    // Gentle float: amplitude 4px, period ~1.5-2.5s, phase offset
    spr.y = spr._baseY + Math.sin(rockTime * 1.4 + spr._floatPhase) * 4;
  }

  // Камера центрируется на маяке со смещением в сторону луча
  const targetCamX = gameW / 2 - lhX - Math.cos(beamAngle) * CAM_BEAM_OFFSET;
  const targetCamY = gameH / 2 - lhY - Math.sin(beamAngle) * CAM_BEAM_OFFSET;
  camX += (targetCamX - camX) * CAM_EASE * delta;
  camY += (targetCamY - camY) * CAM_EASE * delta;
  // Camera shake
  let shakeOffsetX = 0,
    shakeOffsetY = 0;
  if (shakeTime > 0) {
    shakeTime -= delta / 60;
    const power = shakeIntensity * (shakeTime > 0 ? Math.max(0, shakeTime) : 0);
    shakeOffsetX = (Math.random() - 0.5) * 2 * power;
    shakeOffsetY = (Math.random() - 0.5) * 2 * power;
    if (shakeTime <= 0) {
      shakeTime = 0;
      shakeIntensity = 0;
    }
  }
  worldContainer.position.set(camX + shakeOffsetX, camY + shakeOffsetY);
  // Lighthouse position is set only on resize/init, not every frame

  // Lamp burnout — flicker and narrow over time
  lampTimer = Math.min(lampTimer + delta, LAMP_BURNOUT_TIME);
  const burnout = lampTimer / LAMP_BURNOUT_TIME;
  BEAM_HALF_ANGLE =
    LAMP_FULL_ANGLE - (LAMP_FULL_ANGLE - LAMP_MIN_ANGLE) * burnout;

  if (burnout > LAMP_FLICKER_START) {
    const flickerIntensity =
      (burnout - LAMP_FLICKER_START) / (1 - LAMP_FLICKER_START);
    const flick =
      Math.sin(Date.now() * 0.02) *
      Math.sin(Date.now() * 0.037) *
      Math.sin(Date.now() * 0.007);
    lampFlicker = 1 - flickerIntensity * 0.7 * Math.max(0, flick);
  } else {
    lampFlicker = 1;
  }
  lhGlow.alpha = lampFlicker;
  updateHUD();

  // Spawn boats
  const now = performance.now();
  if (now > nextSpawnTime) {
    // Spawn: 40% boat, 20% mermaid, 30% police, 10% kraken
    const roll = Math.random();
    if (roll < 0.4) {
      spawnBoat();
    } else if (roll < 0.6) {
      spawnMermaid();
    } else if (roll < 0.9) {
      spawnPoliceBoat();
    } else {
      if (krakens.length < 1) spawnKraken();
    }
    nextSpawnTime =
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
  if (debugMode) updateDebug();
}

// ===== Update Mermaids =====
function updateMermaids(delta) {
  for (let i = mermaids.length - 1; i >= 0; i--) {
    const m = mermaids[i];
    if (m.gone) continue;

    // Frame animation
    m.frameTick += delta;
    if (m.frameTick >= MERMAID_FRAME_DURATION) {
      m.frameTick -= MERMAID_FRAME_DURATION;
      m.frameIndex = (m.frameIndex + 1) % MERMAID_FRAMES.length;
      m.spr.texture = textures[MERMAID_FRAMES[m.frameIndex]];
    }

    const lit = isInBeam(m.spr.x, m.spr.y);

    // Однажды засвечена — убегает навсегда
    if (lit) m.fleeing = true;

    let nx, ny, speedMult;
    if (m.fleeing) {
      // Бежит от маяка в 2 раза быстрее
      const awayX = m.spr.x - lhX;
      const awayY = m.spr.y - lhY;
      const awayDist = Math.hypot(awayX, awayY) || 1;
      nx = awayX / awayDist;
      ny = awayY / awayDist;
      speedMult = 2;
    } else {
      // Плывёт к маяку
      const toX = lhX - m.spr.x;
      const toY = lhY - m.spr.y;
      const dist = Math.hypot(toX, toY);

      // Достигла маяка
      if (dist < ARRIVAL_RADIUS) {
        console.log(
          `🧜‍♀️ Русалка добралась до маяка (${m.spr.x.toFixed(0)}, ${m.spr.y.toFixed(0)})`,
        );
        shakeTime = 0.5;
        shakeIntensity = 18;
        m.gone = true;
        mermaidsArrived++;
        updateHUD();
        if (mermaidsArrived >= 3 && !gameOver) {
          showMermaidGameOver();
        }
        const fadeOut = () => {
          m.spr.alpha -= 0.04 * delta;
          if (m.spr.alpha <= 0) {
            boatLayer.removeChild(m.spr);
            mermaids.splice(i, 1);
            app.ticker.remove(fadeOut);
          }
        };
        app.ticker.add(fadeOut);
        continue;
      }

      nx = toX / dist;
      ny = toY / dist;
      speedMult = 1;
    }

    // Синусоидальное колебание по X (только когда не убегает)
    m.wavePhase += 0.04 * delta;
    const waveOffset = m.fleeing
      ? 0
      : Math.sin(performance.now() * 0.002 + m.wavePhase) * 24;

    m.spr.x += nx * m.speed * speedMult * delta + waveOffset * 0.04 * delta;
    m.spr.y += ny * m.speed * speedMult * delta;

    // Удалить если уплыла за пределы экрана
    if (
      m.fleeing &&
      (m.spr.x < -SPAWN_MARGIN * 2 ||
        m.spr.x > gameW + SPAWN_MARGIN * 2 ||
        m.spr.y < -SPAWN_MARGIN * 2 ||
        m.spr.y > gameH + SPAWN_MARGIN * 2)
    ) {
      m.gone = true;
      console.log(`🧜‍♀️ Русалка уплыла за экран`);
      boatLayer.removeChild(m.spr);
      mermaids.splice(i, 1);
      continue;
    }

    // Face movement direction
    const targetRot = Math.atan2(ny, nx) + Math.PI / 2;
    let rDiff = targetRot - m.spr.rotation;
    while (rDiff > Math.PI) rDiff -= Math.PI * 2;
    while (rDiff < -Math.PI) rDiff += Math.PI * 2;
    m.spr.rotation += rDiff * 0.08 * delta;
  }
}

// ===== Update Krakens =====
function updateKrakens(delta) {
  for (let i = krakens.length - 1; i >= 0; i--) {
    const k = krakens[i];
    if (k.gone) continue;

    const lit = isInBeam(k.spr.x, k.spr.y);
    // Динамически: убегает пока в луче, возвращается когда луч ушёл
    k.fleeing = lit;

    let nx, ny, speedMult;
    if (k.fleeing) {
      // Бежит от маяка
      const awayX = k.spr.x - lhX;
      const awayY = k.spr.y - lhY;
      const awayDist = Math.hypot(awayX, awayY) || 1;
      nx = awayX / awayDist;
      ny = awayY / awayDist;
      speedMult = 2;
    } else {
      // Плывёт к маяку
      const toX = lhX - k.spr.x;
      const toY = lhY - k.spr.y;
      const dist = Math.hypot(toX, toY);

      // Достиг маяка
      if (dist < ARRIVAL_RADIUS) {
        console.log(
          `🦑 Кракен добрался до маяка (${k.spr.x.toFixed(0)}, ${k.spr.y.toFixed(0)})`,
        );
        shakeTime = 0.7;
        shakeIntensity = 28;
        k.gone = true;
        krakensArrived++;
        spawnTooltip(k.spr.x, k.spr.y - 20, '🦑', TOOLTIP_STYLE_FAIL);
        if (!gameOver) {
          showKrakenGameOver();
        }
        const fadeOut = () => {
          k.spr.alpha -= 0.04 * delta;
          if (k.spr.alpha <= 0) {
            boatLayer.removeChild(k.spr);
            krakens.splice(i, 1);
            app.ticker.remove(fadeOut);
          }
        };
        app.ticker.add(fadeOut);
        continue;
      }

      nx = toX / dist;
      ny = toY / dist;
      speedMult = 1;
    }

    k.spr.x += nx * k.speed * speedMult * delta;
    k.spr.y += ny * k.speed * speedMult * delta;

    // Удалить если уплыл за пределы экрана (только убегая)
    if (
      k.fleeing &&
      (k.spr.x < -SPAWN_MARGIN * 2 ||
        k.spr.x > gameW + SPAWN_MARGIN * 2 ||
        k.spr.y < -SPAWN_MARGIN * 2 ||
        k.spr.y > gameH + SPAWN_MARGIN * 2)
    ) {
      k.gone = true;
      console.log(`🦑 Кракен уплыл за экран`);
      boatLayer.removeChild(k.spr);
      krakens.splice(i, 1);
      continue;
    }

    // Кракен не вращается
  }
}

// ===== Game Over by Mermaids =====
async function showMermaidGameOver() {
  // Показать спрайты-кнопки
  if (overlayLayer.keyEnter && overlayLayer.keySpace) {
    overlayLayer.keyEnter.visible = true;
    overlayLayer.keySpace.visible = true;
  }
  gameOver = true;
  txtMessage.text = '💀 Game Over — 3 mermaids reached the lighthouse!';
  overlayLayer.visible = true;
  playFailSound();
  txtMessage.style = new PIXI.TextStyle({
    ...UI_STYLE,
    fontSize: 38,
    fontWeight: 'bold',
    fill: '#fff',
    stroke: '#000',
    strokeThickness: 6,
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 8,
    dropShadowDistance: 0,
    align: 'center',
  });
  txtMessage.position.set(gameW / 2, gameH / 2 - 60);
  txtMessage.visible = true;
  txtRestart.style = new PIXI.TextStyle({
    ...UI_STYLE,
    fontSize: 22,
    fontWeight: 'normal',
    fill: '#fff',
    stroke: '#000',
    strokeThickness: 4,
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 6,
    dropShadowDistance: 0,
    align: 'center',
  });
  txtRestart.position.set(gameW / 2, gameH / 2 + 60);
  txtRestart.visible = true;
  if (!textures.splashMermaid) {
    textures.splashMermaid = await PIXI.Assets.load(
      'sprites/splash-mermaid.png',
    );
  }
  overlayLayer.splashMermaid.texture = textures.splashMermaid;
  overlayLayer.splashMermaid.visible = true;
  repositionUI();
}

// ===== Game Over by Krakens =====
async function showKrakenGameOver() {
  if (overlayLayer.keyEnter && overlayLayer.keySpace) {
    overlayLayer.keyEnter.visible = true;
    overlayLayer.keySpace.visible = true;
  }
  gameOver = true;
  txtMessage.text = '🦑 Кракены захватили маяк!';
  overlayLayer.visible = true;
  playFailSound();
  txtMessage.style = new PIXI.TextStyle({
    ...UI_STYLE,
    fontSize: 38,
    fontWeight: 'bold',
    fill: '#fff',
    stroke: '#000',
    strokeThickness: 6,
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 8,
    dropShadowDistance: 0,
    align: 'center',
  });
  txtMessage.position.set(gameW / 2, gameH / 2 - 60);
  txtMessage.visible = true;
  txtRestart.style = new PIXI.TextStyle({
    ...UI_STYLE,
    fontSize: 22,
    fontWeight: 'normal',
    fill: '#fff',
    stroke: '#000',
    strokeThickness: 4,
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 6,
    dropShadowDistance: 0,
    align: 'center',
  });
  txtRestart.position.set(gameW / 2, gameH / 2 + 60);
  txtRestart.visible = true;
  if (!textures.splashKraken) {
    textures.splashKraken = await PIXI.Assets.load('sprites/splash-kraken.png');
  }
  overlayLayer.splashKraken.texture = textures.splashKraken;
  overlayLayer.splashKraken.visible = true;
  if (overlayLayer.splashMermaid) overlayLayer.splashMermaid.visible = false;
  if (overlayLayer.splashIceberg) overlayLayer.splashIceberg.visible = false;
  repositionUI();
}

// ===== Win / Restart =====
function playFailSound() {
  const snd = new Audio('audio/fail-1.mp3');
  snd.volume = 0.1;
  snd.play().catch(() => {});
}

function showGameOver() {
  if (overlayLayer.keyEnter && overlayLayer.keySpace) {
    overlayLayer.keyEnter.visible = true;
    overlayLayer.keySpace.visible = true;
  }
  playFailSound();
  txtMessage.text = `💀 Game Over — ${score}/${WIN_SCORE} boats saved`;
  overlayLayer.visible = true;
}

function showWin() {
  txtMessage.text = `🎉 You Win! All ${WIN_SCORE} boats saved!`;
  overlayLayer.visible = true;
}

function restart() {
  if (overlayLayer.keyEnter) overlayLayer.keyEnter.visible = false;
  if (overlayLayer.keySpace) overlayLayer.keySpace.visible = false;
  overlayLayer.visible = false;
  if (overlayLayer.splashMermaid) overlayLayer.splashMermaid.visible = false;
  if (overlayLayer.splashKraken) overlayLayer.splashKraken.visible = false;

  // Remove all boats
  for (const b of boats) {
    boatLayer.removeChild(b.spr);
    beaconLayer.removeChild(b.beacon);
  }
  boats = [];

  // Remove all police boats
  for (const p of policeBoats) {
    boatLayer.removeChild(p.spr);
    beaconLayer.removeChild(p.beacon);
  }
  policeBoats = [];

  // Remove all krakens
  for (const k of krakens) {
    boatLayer.removeChild(k.spr);
  }
  krakens = [];

  score = 0;
  lives = MAX_LIVES;
  mermaidsArrived = 0;
  policeArrived = 0;
  krakensArrived = 0;
  lampTimer = 0;
  lampFlicker = 1;
  BEAM_HALF_ANGLE = LAMP_FULL_ANGLE;
  beamAngle = -Math.PI / 2;
  gameOver = false;
  nextSpawnTime = performance.now() + 1000;
  updateHUD();
}

// ===== Load Textures =====
async function loadTextures() {
  for (const [name, path] of Object.entries(SPRITE_FILES)) {
    textures[name] = await PIXI.Assets.load(path);
  }
}

// ===== Init =====
async function init() {
  gameW = window.innerWidth;
  gameH = window.innerHeight;
  lhX = gameW / 2;
  lhY = gameH / 2;
  app = new PIXI.Application({
    width: gameW,
    height: gameH,
    backgroundColor: C.ocean,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });
  $gameContainer.appendChild(app.view);
  // Load individual sprites
  await loadTextures();

  // World container holds all game elements (camera moves this)
  worldContainer = new PIXI.Container();
  app.stage.addChild(worldContainer);

  // Layer order: wake → rocks → boats → lighthouse → darkness → beacons → glow
  wakeGfx = new PIXI.Graphics();
  worldContainer.addChild(wakeGfx);

  rockLayer = new PIXI.Container();
  buildRocks(rockLayer);
  worldContainer.addChild(rockLayer);

  boatLayer = new PIXI.Container();
  worldContainer.addChild(boatLayer);

  buildLighthouse(worldContainer);

  buildDarkness(worldContainer);

  beaconLayer = new PIXI.Container();
  worldContainer.addChild(beaconLayer);

  tooltipLayer = new PIXI.Container();
  worldContainer.addChild(tooltipLayer);

  // Debug overlay (in world space)
  debugGfx = new PIXI.Graphics();
  debugGfx.visible = false;
  worldContainer.addChild(debugGfx);

  debugText = new PIXI.Text(
    '',
    new PIXI.TextStyle({
      fontFamily: 'monospace',
      fontSize: 13,
      fill: '#00ff88',
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 3,
      dropShadowDistance: 0,
    }),
  );
  debugText.visible = false;
  debugText.position.set(10, 10);
  app.stage.addChild(debugText);

  buildGlow(worldContainer);

  buildUI();

  bindEvents();
  updateHUD();
  nextSpawnTime = performance.now() + 1000;
  app.ticker.add(gameLoop);

  // ===== Background Music =====
  bgMusic = new Audio('audio/ocean-sea-soft-waves.mp3');
  bgMusic.loop = true;
  bgMusic.volume = 0.05;
  // Autoplay requires a user gesture — start on first interaction
  const startMusic = () => {
    bgMusic.play().catch(() => {});
    window.removeEventListener('pointerdown', startMusic);
    window.removeEventListener('keydown', startMusic);
  };
  window.addEventListener('pointerdown', startMusic);
  window.addEventListener('keydown', startMusic);

  if (analytics) {
    logEvent(analytics, 'game_start', {
      game_name: 'lighthouse',
      viewport_w: gameW,
      viewport_h: gameH,
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
      BEAM_ORIGIN_OFFSET_X = parseInt($sliderOffsetX.value, 10);
      $valOffsetX.textContent = $sliderOffsetX.value;
    });
  }
  if ($sliderOffsetY && $valOffsetY) {
    $sliderOffsetY.addEventListener('input', (e) => {
      BEAM_ORIGIN_OFFSET_Y = parseInt($sliderOffsetY.value, 10);
      $valOffsetY.textContent = $sliderOffsetY.value;
    });
  }
}

init();
