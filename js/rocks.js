import {
  PIXI,
  ROCK_TEX_KEYS,
  ROCK_SAFE_ZONE,
  ROCK_SPAWN_RADIUS,
  BEACON_RADIUS,
  BEACON_PULSE_SPEED,
  OCCULT_LAMP_SCARE_RADIUS,
  PERK_NEW_ICEBERGS_COUNT,
  ICEBERG_SPAWN_INITIAL_DELAY_MS,
  ICEBERG_SPAWN_STAGGER_MS,
  ICEBERG_SURFACE_RISE,
  ICEBERG_SURFACE_DURATION,
} from './config.js';
import S from './state.js';

const ROCK_MIN_SPACING = 60;

/** @type {number[]} */
let pendingIcebergSpawnTimers = [];

function getExistingRockPositions() {
  return S.rockColliders.map((rock) => ({ x: rock.x, y: rock.y }));
}

/** @returns {{ x: number, y: number, tex: string, sc: number } | null} */
function tryPlaceRock(existing) {
  for (let tries = 0; tries < 50; tries += 1) {
    const x = S.lhX + (Math.random() * 2 - 1) * ROCK_SPAWN_RADIUS;
    const y = S.lhY + (Math.random() * 2 - 1) * ROCK_SPAWN_RADIUS;
    const dist = Math.hypot(x - S.lhX, y - S.lhY);
    if (dist < ROCK_SAFE_ZONE || dist > ROCK_SPAWN_RADIUS) continue;
    if (
      existing.some((rock) => Math.hypot(x - rock.x, y - rock.y) < ROCK_MIN_SPACING)
    ) {
      continue;
    }

    const texKey =
      ROCK_TEX_KEYS[Math.floor(Math.random() * ROCK_TEX_KEYS.length)];
    const sc = 0.08 + Math.random() * 0.12;
    return { x, y, tex: texKey, sc };
  }
  return null;
}

/** @param {PIXI.Container} parent
 *  @param {{ x: number, y: number, tex: string, sc: number }} def */
function addRockFromDef(parent, def) {
  const spr = new PIXI.Sprite(S.textures[def.tex]);
  spr.anchor.set(0.5);
  spr.position.set(def.x, def.y);
  spr.scale.set(def.sc);
  parent.addChild(spr);

  spr._baseY = def.y;
  spr._floatPhase = Math.random() * Math.PI * 2;
  S.rockSprites.push(spr);

  const avgW = S.textures[def.tex].width;
  const avgH = S.textures[def.tex].height;
  const avgSize = (avgW + avgH) / 2;
  S.rockColliders.push({
    x: def.x,
    y: def.y,
    radius: avgSize * def.sc * 0.3,
  });
}

/** @param {PIXI.Container} parent
 *  @param {{ x: number, y: number, tex: string, sc: number }} def */
function addRockFromDefSurfacing(parent, def) {
  const spr = new PIXI.Sprite(S.textures[def.tex]);
  spr.anchor.set(0.5);
  spr.scale.set(def.sc);
  spr.alpha = 0;
  spr._baseY = def.y;
  spr._floatPhase = Math.random() * Math.PI * 2;
  spr._surfacing = { elapsed: 0, duration: ICEBERG_SURFACE_DURATION };
  spr.position.set(def.x, def.y + ICEBERG_SURFACE_RISE);
  parent.addChild(spr);
  S.rockSprites.push(spr);

  const avgW = S.textures[def.tex].width;
  const avgH = S.textures[def.tex].height;
  const avgSize = (avgW + avgH) / 2;
  const collider = {
    x: def.x,
    y: def.y,
    radius: 0,
  };
  S.rockColliders.push(collider);
  spr._rockCollider = collider;
  spr._targetRadius = avgSize * def.sc * 0.3;
}

function generateRocks() {
  const area = Math.PI * ROCK_SPAWN_RADIUS * ROCK_SPAWN_RADIUS;
  const count = Math.floor(area / 18000);
  const rockDefs = [];

  for (let i = 0; i < count; i++) {
    const def = tryPlaceRock(rockDefs);
    if (def) rockDefs.push(def);
  }
  return rockDefs;
}

export function buildRocks(parent) {
  const defs = generateRocks();
  for (const def of defs) {
    addRockFromDef(parent, def);
  }
}

function clearPendingIcebergSpawns() {
  for (const timerId of pendingIcebergSpawnTimers) {
    clearTimeout(timerId);
  }
  pendingIcebergSpawnTimers = [];
}

/** @param {number} [count] @returns {number} how many icebergs were scheduled */
export function spawnRandomIcebergs(count = PERK_NEW_ICEBERGS_COUNT) {
  if (!S.rockLayer) return 0;

  const defs = [];
  const existing = getExistingRockPositions();

  for (let i = 0; i < count; i += 1) {
    const def = tryPlaceRock([...existing, ...defs]);
    if (!def) continue;
    defs.push(def);
    existing.push({ x: def.x, y: def.y });
  }

  defs.forEach((def, index) => {
    const delay =
      ICEBERG_SPAWN_INITIAL_DELAY_MS + index * ICEBERG_SPAWN_STAGGER_MS;
    const timerId = window.setTimeout(() => {
      pendingIcebergSpawnTimers = pendingIcebergSpawnTimers.filter(
        (id) => id !== timerId,
      );
      if (!S.rockLayer || S.gameOver || S.gameOverPending) return;
      addRockFromDefSurfacing(S.rockLayer, def);
    }, delay);
    pendingIcebergSpawnTimers.push(timerId);
  });

  return defs.length;
}

export function updateRocks(delta = 1) {
  const rockTime = performance.now() * 0.001;

  for (const spr of S.rockSprites) {
    if (spr._surfacing) {
      spr._surfacing.elapsed += delta;
      const progress = Math.min(
        1,
        spr._surfacing.elapsed / spr._surfacing.duration,
      );
      const eased = 1 - Math.pow(1 - progress, 3);
      spr.alpha = eased;
      spr.y = spr._baseY + ICEBERG_SURFACE_RISE * (1 - eased);

      if (progress >= 1) {
        spr.y = spr._baseY;
        spr.alpha = 1;
        if (spr._rockCollider) {
          spr._rockCollider.radius = spr._targetRadius ?? spr._rockCollider.radius;
          delete spr._targetRadius;
          delete spr._rockCollider;
        }
        delete spr._surfacing;
      }
      continue;
    }

    spr.y = spr._baseY + Math.sin(rockTime * 1.4 + spr._floatPhase) * 4;
  }

  updateOccultLamps();
}

/** Purple occult lamps on icebergs when the perk is active. */
export function spawnOccultRockLamps() {
  if (S.occultRockLamps?.length) return;
  S.occultRockLamps = [];
  if (!S.beaconLayer) return;

  const picks = S.rockSprites
    .filter((spr) => !spr._surfacing)
    .map((spr, i) => ({ spr, i }))
    .sort(() => Math.random() - 0.5)
    .slice(0, Math.max(3, Math.ceil(S.rockSprites.length * 0.35)));

  for (const { spr } of picks) {
    const lamp = new PIXI.Graphics();
    lamp.beginFill(0xaa44ff, 1);
    lamp.drawCircle(0, 0, BEACON_RADIUS);
    lamp.endFill();
    lamp.beginFill(0xcc88ff, 0.45);
    lamp.drawCircle(0, 0, BEACON_RADIUS * 2.5);
    lamp.endFill();
    lamp.blendMode = PIXI.BLEND_MODES.ADD;
    lamp.position.set(spr.x, spr.y - 18);
    S.beaconLayer.addChild(lamp);
    S.occultRockLamps.push({ lamp, rockSpr: spr, phase: Math.random() * Math.PI * 2 });
  }
}

function pruneOccultLamps() {
  if (!S.occultRockLamps?.length) return;
  S.occultRockLamps = S.occultRockLamps.filter((entry) => {
    if (entry.rockSpr?.parent) return true;
    if (entry.lamp?.parent) S.beaconLayer.removeChild(entry.lamp);
    entry.lamp?.destroy();
    return false;
  });
}

function updateOccultLamps() {
  if (!S.occultRockLamps?.length) return;
  pruneOccultLamps();
  for (const entry of S.occultRockLamps) {
    const pulse = Math.abs(
      Math.sin(Date.now() * BEACON_PULSE_SPEED + entry.phase),
    );
    entry.lamp.alpha = 0.35 + pulse * 0.65;
    if (entry.rockSpr?.parent) {
      entry.lamp.position.set(entry.rockSpr.x, entry.rockSpr.y - 18);
    }
  }
}

/** @returns {{ x: number, y: number }[]} */
export function getOccultLampTargets() {
  if (!S.occultRockLamps?.length) return [];
  pruneOccultLamps();
  return S.occultRockLamps.map((entry) => ({
    x: entry.lamp.x,
    y: entry.lamp.y,
  }));
}

export function drawRockDebug(gfx) {
  // Rock colliders
  for (const rock of S.rockColliders) {
    gfx.lineStyle(2, 0xff2222, 0.8);
    gfx.drawCircle(rock.x, rock.y, rock.radius);
    gfx.lineStyle(0);
    gfx.beginFill(0xff2222, 0.3);
    gfx.drawCircle(rock.x, rock.y, rock.radius);
    gfx.endFill();
    gfx.beginFill(0xff0000, 1);
    gfx.drawCircle(rock.x, rock.y, 2);
    gfx.endFill();
  }

  // Surfacing icebergs (collider not active yet, cyan)
  for (const rock of S.rockColliders) {
    if (rock.radius > 0) continue;
    gfx.lineStyle(1, 0x44ddff, 0.7);
    gfx.drawCircle(rock.x, rock.y, 24);
  }

  // Occult lamp scare colliders (purple)
  for (const lamp of getOccultLampTargets()) {
    gfx.lineStyle(2, 0xcc44ff, 0.95);
    gfx.drawCircle(lamp.x, lamp.y, OCCULT_LAMP_SCARE_RADIUS);
    gfx.lineStyle(0);
    gfx.beginFill(0xaa44ff, 0.2);
    gfx.drawCircle(lamp.x, lamp.y, OCCULT_LAMP_SCARE_RADIUS);
    gfx.endFill();
    gfx.beginFill(0xcc88ff, 1);
    gfx.drawCircle(lamp.x, lamp.y, 3);
    gfx.endFill();
  }
}

function draw({ debug = false, gfx = null } = {}) {
  if (!debug || !gfx) return;
  drawRockDebug(gfx);
}

function update(delta) {
  updateRocks(delta);
}

export const rockEntity = {
  update,
  draw,
};

// ===== Cleanup for restart =====
// Камни могут быть уничтожены кракенами во время игры, поэтому между
// забегами нужно полностью сносить их и генерировать заново.
export function cleanupRocks() {
  clearPendingIcebergSpawns();

  if (S.rockLayer) {
    for (const spr of S.rockSprites) {
      S.rockLayer.removeChild(spr);
    }
  }
  if (S.occultRockLamps?.length && S.beaconLayer) {
    for (const entry of S.occultRockLamps) {
      S.beaconLayer.removeChild(entry.lamp);
      entry.lamp.destroy();
    }
  }
  S.rockSprites = [];
  S.rockColliders = [];
  S.occultRockLamps = [];
}
