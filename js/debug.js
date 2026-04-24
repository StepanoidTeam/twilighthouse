import {
  PIXI,
  BOAT_RADIUS,
  KRAKEN_RADIUS,
  BEAM_LEN,
  ROCK_SAFE_ZONE,
  ROCK_SPAWN_RADIUS,
  DARKNESS_RADIUS,
  MOB_SPAWN_RING,
  ARRIVAL_RADIUS,
} from './config.js';
import S from './state.js';

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
  const ox = S.lhX + S.BEAM_ORIGIN_OFFSET_X;
  const oy = S.lhY + S.BEAM_ORIGIN_OFFSET_Y;
  const bLen = BEAM_LEN;

  S.debugGfx.clear();

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
  S.debugGfx.drawCircle(ox, oy, S.LH_GLOW_RADIUS);

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

  // Boat colliders (green)
  for (const b of S.boats) {
    if (b.arrived || b.sinking) continue;
    S.debugGfx.lineStyle(1, 0x00ff88, 0.8);
    S.debugGfx.drawCircle(b.spr.x, b.spr.y, BOAT_RADIUS);
  }

  // Mermaid colliders (yellow)
  for (const m of S.mermaids) {
    if (m.gone) continue;
    S.debugGfx.lineStyle(1, 0xffee00, 0.8);
    S.debugGfx.drawCircle(m.spr.x, m.spr.y, BOAT_RADIUS);
  }

  // Police colliders (blue)
  for (const p of S.policeBoats) {
    if (p.arrived || p.sinking) continue;
    S.debugGfx.lineStyle(1, 0x44aaff, 0.8);
    S.debugGfx.drawCircle(p.spr.x, p.spr.y, BOAT_RADIUS);
  }

  // Kraken colliders (purple, larger, offset down)
  for (const k of S.krakens) {
    if (k.gone) continue;
    S.debugGfx.lineStyle(2, 0xcc44ff, 0.9);
    S.debugGfx.drawCircle(k.spr.x, k.spr.y + KRAKEN_RADIUS, KRAKEN_RADIUS);
  }

  // Rock colliders
  for (const rock of S.rockColliders) {
    S.debugGfx.lineStyle(2, 0xff2222, 0.8);
    S.debugGfx.drawCircle(rock.x, rock.y, rock.radius);
    S.debugGfx.lineStyle(0);
    S.debugGfx.beginFill(0xff2222, 0.3);
    S.debugGfx.drawCircle(rock.x, rock.y, rock.radius);
    S.debugGfx.endFill();
    S.debugGfx.beginFill(0xff0000, 1);
    S.debugGfx.drawCircle(rock.x, rock.y, 2);
    S.debugGfx.endFill();
  }

  // Update glow position live
  S.lhGlow.position.set(S.lhX, S.lhY + S.BEAM_ORIGIN_OFFSET_Y);

  // Debug text
  S.debugText.text =
    `[~] Debug  |  ↑↓ offsetY: ${S.BEAM_ORIGIN_OFFSET_Y}  |  [] halfAngle: ${S.BEAM_HALF_ANGLE.toFixed(2)}  |  -+ glowR: ${S.LH_GLOW_RADIUS}\n` +
    `beamAngle: ${((S.beamAngle * 180) / Math.PI).toFixed(1)}°  |  origin: (${ox}, ${oy})`;
}
