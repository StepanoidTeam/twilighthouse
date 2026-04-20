import {
  PIXI,
  C,
  BOAT_RADIUS,
  MOB_SPAWN_RING,
  LIGHTHOUSE_WIDTH,
  scaleToWidth,
} from './config.js';
import S from './state.js';

export function buildLighthouse(parent) {
  S.lighthouseContainer = new PIXI.Container();
  S.lighthouseContainer.position.set(S.lhX, S.lhY);

  S.lighthouseSprite = new PIXI.Sprite(S.textures.lighthouse);
  S.lighthouseSprite.anchor.set(0.5, 0.75);
  scaleToWidth(S.lighthouseSprite, LIGHTHOUSE_WIDTH);
  S.lighthouseContainer.addChild(S.lighthouseSprite);

  parent.addChild(S.lighthouseContainer);
}

// export function buildGlow() {
//   S.lhGlow = new PIXI.Graphics();
//   S.lhGlow.blendMode = PIXI.BLEND_MODES.ADD;
//   S.lhGlow.beginFill(C.lhLight, 0.12);
//   S.lhGlow.drawCircle(0, 0, 40);
//   S.lhGlow.endFill();
//   S.lhGlow.beginFill(C.lhLight, 0.18);
//   S.lhGlow.drawCircle(0, 0, 25);
//   S.lhGlow.endFill();
//   S.lhGlow.position.set(0, S.BEAM_ORIGIN_OFFSET_Y);
//   S.lighthouseContainer.addChild(S.lhGlow);
// }
export function buildGlow() {
  const radius = 40;
  const color = C.lhLight;

  // Извлекаем RGB из hex-цвета PIXI
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;

  // Рисуем градиент на Canvas
  const canvas = document.createElement('canvas');
  const size = radius * 2;
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
  gradient.addColorStop(0,   `rgba(${r},${g},${b}, 0.9)`); // центр
  gradient.addColorStop(0.4, `rgba(${r},${g},${b}, 0.2)`);
  gradient.addColorStop(1,   `rgba(${r},${g},${b}, 0)`);    // край

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Создаём спрайт
  S.lhGlow = new PIXI.Sprite(PIXI.Texture.from(canvas));
  S.lhGlow.anchor.set(0.5);
  S.lhGlow.blendMode = PIXI.BLEND_MODES.OVERLAY; // OVERLAY
  S.lhGlow.position.set(0, S.BEAM_ORIGIN_OFFSET_Y);
  S.lighthouseContainer.addChild(S.lhGlow);
}

export function isInBeam(x, y) {
  const dx = x - S.lhX;
  const dy = y - (S.lhY + S.BEAM_ORIGIN_OFFSET_Y);
  let angle = Math.atan2(dy, dx);
  let diff = angle - S.beamAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) < S.BEAM_HALF_ANGLE;
}

export function checkRockCollision(x, y) {
  for (const rock of S.rockColliders) {
    const dist = Math.hypot(x - rock.x, y - rock.y);
    if (dist < rock.radius + BOAT_RADIUS) return true;
  }
  return false;
}

export function spawnOnRing() {
  const angle = Math.random() * Math.PI * 2;
  return {
    x: S.lhX + Math.cos(angle) * MOB_SPAWN_RING,
    y: S.lhY + Math.sin(angle) * MOB_SPAWN_RING,
  };
}
