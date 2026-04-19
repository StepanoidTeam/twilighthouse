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

// Lamp burnout
const LAMP_FULL_ANGLE = 0.3;
const LAMP_MIN_ANGLE = 0.08;
const LAMP_BURNOUT_TIME = 600;
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
  lighthouse: 'sprites/lighthouse.png',
  dock: 'sprites/bridge.png',
  boat: 'sprites/boat.png',
  rock1: 'sprites/rock1.png',
  rock2: 'sprites/rock2.png',
  rock3: 'sprites/rock3.png',
  rock4: 'sprites/rock4.png',
  rock5: 'sprites/rock5.png',
};

const ROCK_TEX_KEYS = ['rock1', 'rock2', 'rock3', 'rock4', 'rock5'];

// ===== Game State =====
let app;
let gameW, gameH, lhX, lhY;
let lighthouseContainer, lighthouseSprite;
let textures = {};
let darknessGfx, wakeGfx, lhGlow;
let darkRT, darkFill, beamErase;
let keys = {};
let beamAngle = -Math.PI / 2;
let gameOver = false;
let boats = [];
let rocks = [];
let rockColliders = [];
let score = 0;
let lives = MAX_LIVES;
let nextSpawnTime = 0;
let lampTimer = 0;
let lampFlicker = 1;
let rockLayer, boatLayer, beaconLayer, tooltipLayer, worldContainer;
let camX = 0,
  camY = 0;

// ===== Debug =====
let debugMode = false;
let debugGfx, debugText;

// ===== UI State =====
let hudLayer, overlayLayer;
let txtLives, txtScore, txtHint, txtMessage, txtRestart;
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

  const dockSpr = new PIXI.Sprite(textures.dock);
  dockSpr.anchor.set(0.5, 0);
  dockSpr.scale.set(0.32);
  dockSpr.position.set(0, 20);
  lighthouseContainer.addChild(dockSpr);

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

  const spr = new PIXI.Sprite(textures.boat);
  spr.anchor.set(0.5);
  spr.scale.set(BOAT_SCALE);
  spr.position.set(x, y);
  boatLayer.addChild(spr);

  // Red beacon light (placed in separate layer above darkness)
  const beacon = new PIXI.Graphics();
  beacon.beginFill(0xff2200, 1);
  beacon.drawCircle(0, 0, BEACON_RADIUS);
  beacon.endFill();
  beacon.beginFill(0xff4400, 0.4);
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
        updateHUD();
        spawnTooltip(spr.x, spr.y - 20, '💀', TOOLTIP_STYLE_FAIL);
        if (lives <= 0) {
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
}

// ===== Input =====
function bindEvents() {
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (txtHint.visible) txtHint.visible = false;

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

function buildUI() {
  // HUD layer (always on top)
  hudLayer = new PIXI.Container();

  txtLives = new PIXI.Text('❤️❤️❤️', new PIXI.TextStyle(UI_STYLE));
  txtLives.anchor.set(0.5, 0);
  hudLayer.addChild(txtLives);

  txtScore = new PIXI.Text('⛵ 0', new PIXI.TextStyle(UI_STYLE));
  txtScore.anchor.set(0.5, 0);
  hudLayer.addChild(txtScore);

  // Hint at bottom
  txtHint = new PIXI.Text(
    '← → to rotate the beam',
    new PIXI.TextStyle({
      ...UI_STYLE,
      fontSize: 15,
      fontWeight: 'normal',
      fill: 'rgba(200, 216, 232, 0.6)',
    }),
  );
  txtHint.anchor.set(0.5, 1);
  hudLayer.addChild(txtHint);

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
    'Press ENTER to play again',
    new PIXI.TextStyle({
      ...UI_STYLE,
      fontSize: 18,
      fontWeight: 'normal',
      fill: '#4a88aa',
    }),
  );
  txtRestart.anchor.set(0.5);
  overlayLayer.addChild(txtRestart);

  app.stage.addChild(overlayLayer);

  repositionUI();
}

function repositionUI() {
  txtLives.position.set(gameW / 2 - 50, 16);
  txtScore.position.set(gameW / 2 + 50, 16);
  txtHint.position.set(gameW / 2, gameH - 20);

  overlayBg.clear();
  overlayBg.beginFill(0x0a1020, 0.8);
  overlayBg.drawRect(0, 0, gameW, gameH);
  overlayBg.endFill();

  txtMessage.position.set(gameW / 2, gameH / 2 - 20);
  txtRestart.position.set(gameW / 2, gameH / 2 + 30);
}

// ===== HUD =====
function updateHUD() {
  txtScore.text = `⛵ ${score}`;
  txtLives.text = '❤️'.repeat(Math.max(0, lives));
}

// ===== Game Loop =====
function gameLoop(delta) {
  if (gameOver) return;

  // Beam rotation via keyboard (no easing)
  if (keys['KeyA'] || keys['ArrowLeft']) beamAngle -= BEAM_ROTATE_SPEED * delta;
  if (keys['KeyD'] || keys['ArrowRight'])
    beamAngle += BEAM_ROTATE_SPEED * delta;

  // Камера всегда центрируется на маяке
  const targetCamX = gameW / 2 - lhX;
  const targetCamY = gameH / 2 - lhY;
  camX += (targetCamX - camX) * CAM_EASE * delta;
  camY += (targetCamY - camY) * CAM_EASE * delta;
  worldContainer.position.set(camX, camY);
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

  // Spawn boats
  const now = performance.now();
  if (now > nextSpawnTime) {
    spawnBoat();
    nextSpawnTime =
      now +
      SPAWN_INTERVAL_MIN +
      Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
  }

  updateBoats(delta);
  drawWakes();
  updateDarkness();
  updateTooltips(delta);
  if (debugMode) updateDebug();
}

// ===== Win / Restart =====
function showGameOver() {
  txtMessage.text = `💀 Game Over — ${score}/${WIN_SCORE} boats saved`;
  overlayLayer.visible = true;
}

function showWin() {
  txtMessage.text = `🎉 You Win! All ${WIN_SCORE} boats saved!`;
  overlayLayer.visible = true;
}

function restart() {
  overlayLayer.visible = false;

  // Remove all boats
  for (const b of boats) {
    boatLayer.removeChild(b.spr);
    beaconLayer.removeChild(b.beacon);
  }
  boats = [];

  score = 0;
  lives = MAX_LIVES;
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
