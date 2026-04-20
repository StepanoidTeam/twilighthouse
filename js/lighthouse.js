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

export function buildGlow() {
  S.lhGlow = new PIXI.Graphics();
  S.lhGlow.blendMode = PIXI.BLEND_MODES.ADD;

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
