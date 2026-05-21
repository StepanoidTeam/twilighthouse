import {
  PIXI,
  C,
  BOAT_RADIUS,
  BEAM_ROTATE_SPEED,
  LAMP_FULL_ANGLE,
  LAMP_MIN_ANGLE,
  LAMP_BURNOUT_TIME,
  LAMP_FLICKER_START,
  MOB_SPAWN_RING,
  LIGHTHOUSE_WIDTH,
  scaleToWidth,
} from './config.js';
import S from './state.js';
import { getEffectiveLampBurnoutMs, getMaxBeamHalfAngle } from './run-perks.js';

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

  S.lhGlow.position.set(S.BEAM_ORIGIN_OFFSET_X, S.BEAM_ORIGIN_OFFSET_Y);
  S.lighthouseContainer.addChild(S.lhGlow);
}

function updateBeamRotation(delta) {
  const rotateSpeed = BEAM_ROTATE_SPEED * (S.beamRotateMult || 1);
  if (S.keys['KeyA'] || S.keys['ArrowLeft']) {
    S.beamAngle -= rotateSpeed * delta;
  }
  if (S.keys['KeyD'] || S.keys['ArrowRight']) {
    S.beamAngle += rotateSpeed * delta;
  }
}

function updateLamp(delta) {
  const lampCap = getEffectiveLampBurnoutMs();
  if (S.lampRestoreFramesLeft > 0) {
    S.lampRestoreFramesLeft = Math.max(0, S.lampRestoreFramesLeft - delta);
    const restoreTotal = Math.max(1, S.lampRestoreFramesTotal || 1);
    const restoreProgress = 1 - S.lampRestoreFramesLeft / restoreTotal;
    const easedProgress = 1 - Math.pow(1 - restoreProgress, 3);
    S.lampTimer = S.lampRestoreStartTimer * (1 - easedProgress);
    if (S.lampRestoreFramesLeft <= 0) {
      S.lampTimer = 0;
      S.lampRestoreFramesTotal = 0;
      S.lampRestoreStartTimer = 0;
    }
  } else if (S.lampTimer < 0) {
    S.lampTimer = Math.min(S.lampTimer + delta, 0);
  } else {
    S.lampTimer = Math.min(S.lampTimer + delta, lampCap);
  }

  const burnout =
    S.lampTimer < 0 ? 0 : S.lampTimer / lampCap;
  const beamMult = S.runBeamMult || 1;
  const fullAngle = LAMP_FULL_ANGLE * beamMult;
  let halfAngle = fullAngle - (fullAngle - LAMP_MIN_ANGLE) * burnout;
  halfAngle = Math.min(halfAngle, getMaxBeamHalfAngle());
  S.BEAM_HALF_ANGLE = halfAngle;

  if (burnout > LAMP_FLICKER_START) {
    const flickerIntensity =
      (burnout - LAMP_FLICKER_START) / (1 - LAMP_FLICKER_START);
    const flick =
      Math.sin(Date.now() * 0.02) *
      Math.sin(Date.now() * 0.037) *
      Math.sin(Date.now() * 0.007);
    S.lampFlicker = 1 - flickerIntensity * 0.7 * Math.max(0, flick);
  } else {
    S.lampFlicker = 1;
  }

  if (S.lhGlow) S.lhGlow.alpha = S.lampFlicker;
}

export function updateLighthouse(delta) {
  updateBeamRotation(delta);
  updateLamp(delta);
}

export function isInBeam(x, y) {
  const convergence = getBeamConvergencePoint(S.beamAngle);
  const dx = x - (S.lhX + convergence.x);
  const dy = y - (S.lhY + convergence.y);
  let angle = Math.atan2(dy, dx);
  let diff = angle - S.beamAngle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return Math.abs(diff) < S.BEAM_HALF_ANGLE;
}

export function checkRockCollision(x, y) {
  for (const rock of S.rockColliders) {
    if (rock.radius <= 0) continue;
    const dist = Math.hypot(x - rock.x, y - rock.y);
    if (dist < rock.radius + BOAT_RADIUS) return true;
  }
  return false;
}

export function getBeamConvergencePoint(beamAngle) {
  return {
    x: S.BEAM_ORIGIN_OFFSET_X - Math.cos(beamAngle) * S.LH_GLOW_RADIUS,
    y: S.BEAM_ORIGIN_OFFSET_Y - Math.sin(beamAngle) * S.LH_GLOW_RADIUS,
  };
}

export function updateDebugBeam() {
  const convergence = getBeamConvergencePoint(S.beamAngle);
  const ox = S.lhX + convergence.x;
  const oy = S.lhY + convergence.y;

  const cxCircle = S.lhX + S.BEAM_ORIGIN_OFFSET_X;
  const cyCircle = S.lhY + S.BEAM_ORIGIN_OFFSET_Y;

  const bLen = 1400; // BEAM_LEN

  // Crosshair at lighthouse center (lhX, lhY)
  S.debugGfx.lineStyle(1, 0x888888, 0.5);
  S.debugGfx.moveTo(S.lhX - 20, S.lhY);
  S.debugGfx.lineTo(S.lhX + 20, S.lhY);
  S.debugGfx.moveTo(S.lhX, S.lhY - 20);
  S.debugGfx.lineTo(S.lhX, S.lhY + 20);

  // Beam origin point
  S.debugGfx.lineStyle(0);
  S.debugGfx.beginFill(0x00ff00, 1);
  S.debugGfx.drawCircle(ox, oy, 4);
  S.debugGfx.endFill();

  // Line from lhCenter to beam origin
  S.debugGfx.lineStyle(1, 0x00ff00, 0.6);
  S.debugGfx.moveTo(S.lhX, S.lhY);
  S.debugGfx.lineTo(ox, oy);

  // Beam cone edges
  S.debugGfx.lineStyle(2, 0xffff00, 0.7);
  S.debugGfx.moveTo(ox, oy);
  S.debugGfx.lineTo(
    ox + Math.cos(S.beamAngle - S.BEAM_HALF_ANGLE) * bLen,
    oy + Math.sin(S.beamAngle - S.BEAM_HALF_ANGLE) * bLen,
  );
  S.debugGfx.moveTo(ox, oy);
  S.debugGfx.lineTo(
    ox + Math.cos(S.beamAngle + S.BEAM_HALF_ANGLE) * bLen,
    oy + Math.sin(S.beamAngle + S.BEAM_HALF_ANGLE) * bLen,
  );

  // Beam center line
  S.debugGfx.lineStyle(1, 0xff8800, 0.5);
  S.debugGfx.moveTo(ox, oy);
  S.debugGfx.lineTo(
    ox + Math.cos(S.beamAngle) * bLen,
    oy + Math.sin(S.beamAngle) * bLen,
  );

  // Glow radius circle
  S.debugGfx.lineStyle(1, 0x00aaff, 0.5);
  S.debugGfx.drawCircle(cxCircle, cyCircle, S.LH_GLOW_RADIUS);

  // Update glow position live
  S.lhGlow.position.set(S.BEAM_ORIGIN_OFFSET_X, S.BEAM_ORIGIN_OFFSET_Y);
}

export function spawnOnRing() {
  const angle = Math.random() * Math.PI * 2;
  return {
    x: S.lhX + Math.cos(angle) * MOB_SPAWN_RING,
    y: S.lhY + Math.sin(angle) * MOB_SPAWN_RING,
  };
}
