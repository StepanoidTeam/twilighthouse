import {
  PIXI,
  ROCK_TEX_KEYS,
  ROCK_SAFE_ZONE,
  ROCK_SPAWN_RADIUS,
} from './config.js';
import S from './state.js';

function generateRocks() {
  // Плотность считаем от логической площади вокруг маяка, а не от физического
  // размера вьюпорта — иначе на узких экранах скал почти не будет.
  const area = Math.PI * ROCK_SPAWN_RADIUS * ROCK_SPAWN_RADIUS;
  const count = Math.floor(area / 18000);
  const rockDefs = [];

  for (let i = 0; i < count; i++) {
    let x,
      y,
      tries = 0;
    do {
      // Кидаем в квадрат со стороной 2*ROCK_SPAWN_RADIUS вокруг маяка и
      // отбрасываем по условиям ниже (safe zone, вне радиуса, коллизии).
      x = S.lhX + (Math.random() * 2 - 1) * ROCK_SPAWN_RADIUS;
      y = S.lhY + (Math.random() * 2 - 1) * ROCK_SPAWN_RADIUS;
      tries++;
    } while (
      tries < 50 &&
      (Math.hypot(x - S.lhX, y - S.lhY) < ROCK_SAFE_ZONE ||
        Math.hypot(x - S.lhX, y - S.lhY) > ROCK_SPAWN_RADIUS ||
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

export function buildRocks(parent) {
  const defs = generateRocks();
  for (const r of defs) {
    const spr = new PIXI.Sprite(S.textures[r.tex]);
    spr.anchor.set(0.5);
    spr.position.set(r.x, r.y);
    spr.scale.set(r.sc);
    parent.addChild(spr);

    // Store original position for animation
    spr._baseY = r.y;
    spr._floatPhase = Math.random() * Math.PI * 2;
    S.rockSprites.push(spr);

    const avgW = S.textures[r.tex].width;
    const avgH = S.textures[r.tex].height;
    const avgSize = (avgW + avgH) / 2;
    S.rockColliders.push({ x: r.x, y: r.y, radius: avgSize * r.sc * 0.3 });
  }
}

export function updateRocks() {
  const rockTime = performance.now() * 0.001;
  for (const spr of S.rockSprites) {
    spr.y = spr._baseY + Math.sin(rockTime * 1.4 + spr._floatPhase) * 4;
  }
}

// ===== Cleanup for restart =====
// Камни могут быть уничтожены кракенами во время игры, поэтому между
// забегами нужно полностью сносить их и генерировать заново.
export function cleanupRocks() {
  if (S.rockLayer) {
    for (const spr of S.rockSprites) {
      S.rockLayer.removeChild(spr);
    }
  }
  S.rockSprites = [];
  S.rockColliders = [];
}
