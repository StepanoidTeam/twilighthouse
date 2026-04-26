import {
  PIXI,
  BEAM_LEN,
  ROCK_SAFE_ZONE,
  ROCK_SPAWN_RADIUS,
  DARKNESS_RADIUS,
  MOB_SPAWN_RING,
  ARRIVAL_RADIUS,
} from './config.js';
import S from './state.js';
import { updateDebugBeam, getBeamConvergencePoint } from './lighthouse.js';

export function buildDebug() {
  S.debugGfx = new PIXI.Graphics();
  S.debugGfx.visible = false;

  S.debugText = new PIXI.Text(
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
  S.debugText.visible = false;
  S.debugText.position.set(10, 10);
}

export function updateDebug() {
  S.debugGfx.clear();

  // Beam debug drawing
  updateDebugBeam();

  // Arrival radius
  S.debugGfx.lineStyle(1, 0x88ff88, 0.3);
  S.debugGfx.drawCircle(S.lhX, S.lhY, ARRIVAL_RADIUS);

  // Rock spawn zone (safe zone inner, max radius outer)
  S.debugGfx.lineStyle(1, 0xffaa00, 0.4);
  S.debugGfx.drawCircle(S.lhX, S.lhY, ROCK_SAFE_ZONE);
  S.debugGfx.lineStyle(1, 0xffaa00, 0.25);
  S.debugGfx.drawCircle(S.lhX, S.lhY, ROCK_SPAWN_RADIUS);

  // Mob spawn / beam cap radius
  S.debugGfx.lineStyle(2, 0xffffff, 0.35);
  S.debugGfx.drawCircle(S.lhX, S.lhY, DARKNESS_RADIUS);

  // Mob spawn ring
  S.debugGfx.lineStyle(2, 0xaaaaff, 0.35);
  S.debugGfx.drawCircle(S.lhX, S.lhY, MOB_SPAWN_RING);

  // Debug text
  const convergence = getBeamConvergencePoint(S.beamAngle);
  const ox = S.lhX + convergence.x;
  const oy = S.lhY + convergence.y;
  S.debugText.text =
    `[~] Debug  |  [] halfAngle: ${S.BEAM_HALF_ANGLE.toFixed(2)}  |  -+ glowR: ${S.LH_GLOW_RADIUS}\n` +
    `beamAngle: ${((S.beamAngle * 180) / Math.PI).toFixed(1)}°  |  origin: (${ox.toFixed(0)}, ${oy.toFixed(0)})`;
}
