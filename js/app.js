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
const SPAWN_MARGIN = 60;
const SPAWN_INTERVAL_MIN = 2500;
const SPAWN_INTERVAL_MAX = 5000;
const BOAT_SCALE = 0.18;
const BEAM_HALF_ANGLE = 0.3;
const BEAM_LEN = 1400;
const DARK_ALPHA = 0.82;
const LH_GLOW_RADIUS = 55;

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
  light: 'sprites/light.png',
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
let textures = {};
let beamCont, darknessGfx, wakeGfx;
let keys = {};
let beamAngle = -Math.PI / 2;
let gameOver = false;
let boats = [];
let rocks = [];
let rockColliders = [];
let score = 0;
let lives = 3;
let nextSpawnTime = 0;
let rockLayer, boatLayer;

// ===== UI State =====
let hudLayer, overlayLayer;
let txtLives, txtScore, txtHint, txtMessage, txtRestart;
let overlayBg;

// ===== Resize =====
function resize() {
  gameW = window.innerWidth;
  gameH = window.innerHeight;
  lhX = gameW / 2;
  lhY = gameH / 2;
  app.renderer.resize(gameW, gameH);
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
    rockDefs.push({ x, y, tex: texKey, sc, r: Math.random() * Math.PI * 2 });
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
    spr.rotation = r.r;
    parent.addChild(spr);

    const avgW = textures[r.tex].width;
    const avgH = textures[r.tex].height;
    const avgSize = (avgW + avgH) / 2;
    rockColliders.push({ x: r.x, y: r.y, radius: avgSize * r.sc * 0.3 });
  }
}

// ===== Build Lighthouse =====
function buildLighthouse(parent) {
  const cont = new PIXI.Container();
  cont.position.set(lhX, lhY);

  const dockSpr = new PIXI.Sprite(textures.dock);
  dockSpr.anchor.set(0.5, 0);
  dockSpr.scale.set(0.32);
  dockSpr.position.set(0, 20);
  cont.addChild(dockSpr);

  const lhSpr = new PIXI.Sprite(textures.lighthouse);
  lhSpr.anchor.set(0.5, 0.75);
  lhSpr.scale.set(0.27);
  cont.addChild(lhSpr);

  parent.addChild(cont);
}

// ===== Build Beam =====
function buildBeam(parent) {
  beamCont = new PIXI.Container();
  beamCont.position.set(lhX, lhY);

  // Light sprite from sprites/light.png
  const lightSpr = new PIXI.Sprite(textures.light);
  lightSpr.anchor.set(0.42, 0);
  lightSpr.blendMode = PIXI.BLEND_MODES.ADD;
  lightSpr.alpha = 0.6;
  const beamScale = (Math.max(gameW, gameH) * 0.8) / lightSpr.texture.height;
  lightSpr.scale.set(beamScale);
  beamCont.addChild(lightSpr);

  // Glow at source
  const glow = new PIXI.Graphics();
  glow.blendMode = PIXI.BLEND_MODES.ADD;
  glow.beginFill(C.lhLight, 0.12);
  glow.drawCircle(0, 0, 40);
  glow.endFill();
  glow.beginFill(C.lhLight, 0.18);
  glow.drawCircle(0, 0, 18);
  glow.endFill();
  beamCont.addChild(glow);

  parent.addChild(beamCont);
}

// ===== Darkness Overlay =====
function buildDarkness(parent) {
  darknessGfx = new PIXI.Graphics();
  darknessGfx.filters = [new PIXI.BlurFilter(20)];
  parent.addChild(darknessGfx);
}

function updateDarkness() {
  darknessGfx.clear();

  const pad = 40;
  const bLen = Math.hypot(gameW / 2 + pad, gameH / 2 + pad);

  darknessGfx.beginFill(0x000000, DARK_ALPHA);
  darknessGfx.drawRect(-pad, -pad, gameW + pad * 2, gameH + pad * 2);

  // Cut beam-shaped triangle hole — BEFORE endFill
  darknessGfx.beginHole();
  darknessGfx.moveTo(lhX, lhY);
  darknessGfx.lineTo(
    lhX + Math.cos(beamAngle - BEAM_HALF_ANGLE) * bLen,
    lhY + Math.sin(beamAngle - BEAM_HALF_ANGLE) * bLen,
  );
  darknessGfx.lineTo(
    lhX + Math.cos(beamAngle + BEAM_HALF_ANGLE) * bLen,
    lhY + Math.sin(beamAngle + BEAM_HALF_ANGLE) * bLen,
  );
  darknessGfx.closePath();
  darknessGfx.endHole();

  // Cut circular hole around lighthouse
  darknessGfx.beginHole();
  darknessGfx.drawCircle(lhX, lhY, LH_GLOW_RADIUS);
  darknessGfx.endHole();

  darknessGfx.endFill();
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

  const angle = Math.atan2(lhY - y, lhX - x);
  spr.rotation = angle + Math.PI / 2;

  boats.push({
    spr,
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
  const dy = y - lhY;
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
      // Fade out
      const fadeOut = () => {
        spr.alpha -= 0.02;
        if (spr.alpha <= 0) {
          app.ticker.remove(fadeOut);
          boatLayer.removeChild(spr);
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
    beamCont.position.set(lhX, lhY);
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

  // Beam rotation via keyboard
  if (keys['KeyA'] || keys['ArrowLeft']) beamAngle -= BEAM_ROTATE_SPEED * delta;
  if (keys['KeyD'] || keys['ArrowRight'])
    beamAngle += BEAM_ROTATE_SPEED * delta;

  beamCont.rotation = beamAngle;

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
}

// ===== Win / Restart =====
function showGameOver() {
  txtMessage.text = `💀 Game Over — ${score} boats saved`;
  overlayLayer.visible = true;
}

function restart() {
  overlayLayer.visible = false;

  // Remove all boats
  for (const b of boats) boatLayer.removeChild(b.spr);
  boats = [];

  score = 0;
  lives = 3;
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

  // Layer order: wake → rocks → beam → boats → lighthouse → darkness → HUD
  wakeGfx = new PIXI.Graphics();
  app.stage.addChild(wakeGfx);

  rockLayer = new PIXI.Container();
  buildRocks(rockLayer);
  app.stage.addChild(rockLayer);

  buildBeam(app.stage);

  boatLayer = new PIXI.Container();
  app.stage.addChild(boatLayer);

  buildLighthouse(app.stage);

  buildDarkness(app.stage);

  buildUI();

  bindEvents();
  updateHUD();
  nextSpawnTime = performance.now() + 1000;
  app.ticker.add(gameLoop);

  console.log('🔦 Lighthouse game initialized');
}

init();
