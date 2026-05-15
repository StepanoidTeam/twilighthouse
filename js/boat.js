import {
  PIXI,
  BOAT_SPEED,
  BOAT_RADIUS,
  BOAT_WIDTH,
  WAKE_MAX,
  WAKE_DOT_R_MIN,
  WAKE_DOT_R_GROWTH,
  ARRIVAL_RADIUS,
  BEACON_RADIUS,
  BEACON_PULSE_SPEED,
  BOAT_FRAMES,
  BOAT_FRAME_DURATION,
  LIT_DEBOUNCE,
  BOAT_CARGO_TYPES,
  TOOLTIP_STYLE_OK,
  TOOLTIP_STYLE_FAIL,
  C,
  scaleToWidth,
  tickAnim,
} from './config.js';
import { BOAT_SONAR_VOLUME, playRandomSound } from './sound.js';
import S from './state.js';
import { isInBeam, checkRockCollision, spawnOnRing } from './lighthouse.js';
import { createWakeEmitterState, tickWakeEmitter } from './wake.js';

const BOAT_SONAR_SOUNDS = [
  'audio/boat/submarine_sonar-1.mp3',
  'audio/boat/submarine_sonar-2.mp3',
  'audio/boat/submarine_sonar-3.mp3',
];

function playBoatSonar() {
  playRandomSound(BOAT_SONAR_SOUNDS, BOAT_SONAR_VOLUME);
}

import {
  spawnTooltip,
  createCargoLabel,
  updateHUD,
  scheduleGameOver,
  playCrashSound,
} from './ui.js';
import { levels } from './levels.js';

const LAMP_RESTORE_FRAMES = 14;

// ===== Cargo Helpers =====
function parseCargo(cargoStr) {
  const result = {};
  for (const type of BOAT_CARGO_TYPES) {
    const idx = cargoStr.indexOf(type);
    if (idx !== -1) {
      const after = cargoStr.slice(idx + type.length);
      const m = after.match(/^\d+/);
      result[type] = m ? parseInt(m[0]) : 0;
    } else {
      result[type] = 0;
    }
  }
  return result;
}

function addCargo(cargoStr) {
  const parsed = parseCargo(cargoStr);
  for (const type of BOAT_CARGO_TYPES) {
    S.deliveredCargo[type] += parsed[type] || 0;
  }
}

function randomCargo() {
  const r = Math.random();
  const numTypes = r < 0.5 ? 1 : r < 0.85 ? 2 : 3;
  const types = [...BOAT_CARGO_TYPES]
    .sort(() => Math.random() - 0.5)
    .slice(0, numTypes);
  return types
    .map((type) => `${type}${1 + Math.floor(Math.random() * 5)}`)
    .join(' ');
}

// ===== Spawn =====
export function spawnBoat() {
  const { x, y } = spawnOnRing();

  const spr = new PIXI.Sprite(S.textures.boat1);
  spr.anchor.set(0.5);
  scaleToWidth(spr, BOAT_WIDTH);
  spr.position.set(x, y);
  S.boatLayer.addChild(spr);

  // Green beacon light (placed in separate layer above darkness)
  const beacon = new PIXI.Graphics();
  beacon.beginFill(0x00dd44, 1);
  beacon.drawCircle(0, 0, BEACON_RADIUS);
  beacon.endFill();
  beacon.beginFill(0x44ff88, 0.4);
  beacon.drawCircle(0, 0, BEACON_RADIUS * 2.5);
  beacon.endFill();
  beacon.blendMode = PIXI.BLEND_MODES.ADD;
  beacon.position.set(x, y);
  S.beaconLayer.addChild(beacon);

  const angle = Math.atan2(S.lhY - y, S.lhX - x);
  spr.rotation = angle + Math.PI / 2;

  S.boats.push({
    spr,
    beacon,
    beaconPhase: Math.random() * Math.PI * 2,
    speed: BOAT_SPEED + Math.random() * 0.4,
    lit: false,
    wasLit: false,
    litPending: null,
    litPendingAt: 0,
    sinkTimer: 0,
    sinking: false,
    arrived: false,
    wake: [],
    wakeEmit: createWakeEmitterState(),
    frameIndex: 0,
    frameTick: Math.random() * BOAT_FRAME_DURATION,
    cargo: randomCargo(),
    cargoLabel: null,
  });
  // Create label after push so we can reference boats.at(-1)
  const bl = createCargoLabel(S.boats[S.boats.length - 1].cargo);
  S.boats[S.boats.length - 1].cargoLabel = bl;
  S.tooltipLayer.addChild(bl);
}

// ===== Update =====
export function updateBoats(delta) {
  for (let i = S.boats.length - 1; i >= 0; i--) {
    const b = S.boats[i];
    if (b.arrived) continue;

    const { spr } = b;
    const rawLit = isInBeam(spr.x, spr.y);
    const now = performance.now();

    // Debounce lit status: commit change only after LIT_DEBOUNCE ms of stable raw value
    if (rawLit !== b.lit) {
      if (b.litPending !== rawLit) {
        b.litPending = rawLit;
        b.litPendingAt = now;
      } else if (now - b.litPendingAt >= LIT_DEBOUNCE) {
        b.wasLit = b.lit;
        b.lit = rawLit;
        b.litPending = null;
        // Play sonar sound on beam entry
        if (b.lit && !b.wasLit && !b.sinking) {
          playBoatSonar();
        }
      }
    } else {
      b.litPending = null;
    }

    // Persistent framed cargo label — visible while beam is on boat
    if (b.cargoLabel) {
      b.cargoLabel.visible = b.lit && !b.sinking;
      b.cargoLabel.position.set(spr.x, spr.y - 36);
    }

    // Frame animation
    tickAnim(b, delta, BOAT_FRAMES, BOAT_FRAME_DURATION, S.textures);

    // Steer toward lighthouse
    const toX = S.lhX - spr.x;
    const toY = S.lhY - spr.y;
    const dist = Math.hypot(toX, toY);

    if (dist < ARRIVAL_RADIUS && !b.sinking) {
      // Arrived safely
      b.arrived = true;
      if (b.cargoLabel) {
        S.tooltipLayer.removeChild(b.cargoLabel);
        b.cargoLabel.destroy();
        b.cargoLabel = null;
      }
      S.score++;
      addCargo(b.cargo);
      updateHUD();
      spawnTooltip(spr.x, spr.y - 20, b.cargo, TOOLTIP_STYLE_OK);
      // Restore lamp on boat arrival
      S.lampRestoreStartTimer = S.lampTimer;
      S.lampRestoreFramesTotal = LAMP_RESTORE_FRAMES;
      S.lampRestoreFramesLeft = LAMP_RESTORE_FRAMES;
      levels.notify('delivered_boats');
      // Fade out
      const fadeOut = () => {
        spr.alpha -= 0.02;
        b.beacon.alpha = spr.alpha;
        if (spr.alpha <= 0) {
          S.app.ticker.remove(fadeOut);
          S.boatLayer.removeChild(spr);
          S.beaconLayer.removeChild(b.beacon);
          S.boats.splice(S.boats.indexOf(b), 1);
        }
      };
      S.app.ticker.add(fadeOut);
      continue;
    }

    if (b.sinking) {
      b.sinkTimer += delta;
      spr.alpha = Math.max(0, 1 - b.sinkTimer / 60);
      spr.rotation += 0.03 * delta;
      scaleToWidth(spr, BOAT_WIDTH * (1 - b.sinkTimer / 80));
      if (spr.alpha <= 0) {
        if (b.cargoLabel) {
          S.tooltipLayer.removeChild(b.cargoLabel);
          b.cargoLabel.destroy();
          b.cargoLabel = null;
        }
        S.boatLayer.removeChild(spr);
        S.beaconLayer.removeChild(b.beacon);
        S.boats.splice(i, 1);
      }
      continue;
    }

    // Movement — boats move slowly, faster when lit
    const speedMult = b.lit ? 1.5 : 0.6;
    const nx = toX / dist;
    const ny = toY / dist;

    // Add slight wander when not lit
    let wx = 0,
      wy = 0;
    if (!b.lit) {
      const wander = Math.sin(Date.now() * 0.001 + i * 7) * 0.5;
      wx = -ny * wander;
      wy = nx * wander;
    }

    const moveX = (nx + wx) * b.speed * speedMult * delta;
    const moveY = (ny + wy) * b.speed * speedMult * delta;
    const prevX = spr.x;
    const prevY = spr.y;
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
      if (!b.lit) {
        b.sinking = true;
        b.sinkTimer = 0;
        S.boatsSunk++;
        if (S.runStats) S.runStats.smugglersSunk++;
        const gameOver = S.takeDamage('boat-sink', 1);
        updateHUD();
        spawnTooltip(spr.x, spr.y - 20, '💀 −💔', TOOLTIP_STYLE_FAIL);
        playCrashSound();
        console.log(
          `🛥️ Корабль затонул на (${spr.x.toFixed(0)}, ${spr.y.toFixed(0)})`,
        );
        if (gameOver) {
          scheduleGameOver();
        }
      } else {
        // Push away from rock
        for (const rock of S.rockColliders) {
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

    // Wake trail — uneven spacing (distance accumulator) + lateral jitter
    const stepLen = Math.hypot(moveX, moveY);
    let fx = nx;
    let fy = ny;
    if (stepLen > 1e-4) {
      fx = moveX / stepLen;
      fy = moveY / stepLen;
    }
    tickWakeEmitter(
      b.wakeEmit,
      b.wake,
      prevX,
      prevY,
      spr.x,
      spr.y,
      fx,
      fy,
      stepLen,
    );

    // Pulse beacon and follow boat
    const pulse = Math.max(
      0,
      Math.sin(Date.now() * BEACON_PULSE_SPEED + b.beaconPhase),
    );
    b.beacon.alpha = pulse;
    b.beacon.position.set(spr.x, spr.y);
  }
}

// ===== Draw Wakes (boats + police) =====
export function drawWakes() {
  S.wakeGfx.clear();
  for (const b of S.boats) {
    for (const w of b.wake) {
      w.age++;
      const t = w.age / WAKE_MAX;
      if (t >= 1) continue;
      const alpha = (1 - t) * 0.15 * (w.alphaMul ?? 1);
      const r = (WAKE_DOT_R_MIN + t * WAKE_DOT_R_GROWTH) * (w.rMul ?? 1);
      S.wakeGfx.beginFill(C.wake, Math.min(0.22, alpha));
      S.wakeGfx.drawCircle(w.x, w.y, r);
      S.wakeGfx.endFill();
    }
    while (b.wake.length > 0 && b.wake[b.wake.length - 1].age > WAKE_MAX) {
      b.wake.pop();
    }
  }
  for (const p of S.policeBoats) {
    for (const w of p.wake) {
      w.age++;
      const t = w.age / WAKE_MAX;
      if (t >= 1) continue;
      const alpha = (1 - t) * 0.15 * (w.alphaMul ?? 1);
      const r = (WAKE_DOT_R_MIN + t * WAKE_DOT_R_GROWTH) * (w.rMul ?? 1);
      S.wakeGfx.beginFill(C.wake, Math.min(0.22, alpha));
      S.wakeGfx.drawCircle(w.x, w.y, r);
      S.wakeGfx.endFill();
    }
    while (p.wake.length > 0 && p.wake[p.wake.length - 1].age > WAKE_MAX) {
      p.wake.pop();
    }
  }
}

export function drawBoatDebug(gfx) {
  // Boat colliders (green)
  for (const b of S.boats) {
    if (b.arrived || b.sinking) continue;
    gfx.lineStyle(1, 0x00ff88, 0.8);
    gfx.drawCircle(b.spr.x, b.spr.y, BOAT_RADIUS);
  }
}

function draw({ debug = false, gfx = null } = {}) {
  drawWakes();
  if (!debug || !gfx) return;
  drawBoatDebug(gfx);
}

function update(delta) {
  updateBoats(delta);
}

export const boatEntity = {
  update,
  draw,
};

// ===== Cleanup for restart =====
export function cleanupBoats() {
  for (const b of S.boats) {
    if (b.cargoLabel) {
      S.tooltipLayer.removeChild(b.cargoLabel);
      b.cargoLabel.destroy();
    }
    S.boatLayer.removeChild(b.spr);
    S.beaconLayer.removeChild(b.beacon);
  }
  S.boats = [];
}
