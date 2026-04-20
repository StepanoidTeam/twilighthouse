import {
  PIXI,
  BOAT_SPEED,
  BOAT_RADIUS,
  BOAT_SCALE,
  WAKE_MAX,
  ARRIVAL_RADIUS,
  BEACON_RADIUS,
  BEACON_PULSE_SPEED,
  BOAT_FRAMES,
  BOAT_FRAME_DURATION,
  BOAT_CARGO_TYPES,
  WIN_SCORE,
  TOOLTIP_STYLE_OK,
  TOOLTIP_STYLE_FAIL,
  C,
} from './config.js';
import { BOAT_SONAR_VOLUME, playRandomSound } from './sound.js';
import S from './state.js';
import { isInBeam, checkRockCollision, spawnOnRing } from './lighthouse.js';

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
  showBoatGameOver,
  showGameOver,
  showWin,
  playCrashSound,
} from './ui.js';

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
  const cargo = [];
  const numTypes = 1 + Math.floor(Math.random() * BOAT_CARGO_TYPES.length);
  const types = [...BOAT_CARGO_TYPES]
    .sort(() => Math.random() - 0.5)
    .slice(0, numTypes);
  for (const type of types) {
    const count = Math.floor(Math.random() * 6); // 0–5
    if (count > 0) cargo.push(`${type}${count}`);
  }
  // Guarantee at least 1 item
  if (cargo.length === 0) {
    const type =
      BOAT_CARGO_TYPES[Math.floor(Math.random() * BOAT_CARGO_TYPES.length)];
    cargo.push(`${type}1`);
  }
  return cargo.join(' ');
}

// ===== Spawn =====
export function spawnBoat() {
  const { x, y } = spawnOnRing();

  const spr = new PIXI.Sprite(S.textures.boat1);
  spr.anchor.set(0.5);
  spr.scale.set(BOAT_SCALE);
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
    sinkTimer: 0,
    sinking: false,
    arrived: false,
    wake: [],
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
    const lit = isInBeam(spr.x, spr.y);
    // Play sonar sound on beam entry
    if (lit && !b.wasLit && !b.sinking) {
      playBoatSonar();
    }
    // Persistent framed cargo label — visible while beam is on boat
    if (b.cargoLabel) {
      b.cargoLabel.visible = lit && !b.sinking;
      b.cargoLabel.position.set(spr.x, spr.y - 36);
    }
    b.wasLit = lit;
    b.lit = lit;

    // Frame animation
    b.frameTick += delta;
    if (b.frameTick >= BOAT_FRAME_DURATION) {
      b.frameTick -= BOAT_FRAME_DURATION;
      b.frameIndex = (b.frameIndex + 1) % BOAT_FRAMES.length;
      spr.texture = S.textures[BOAT_FRAMES[b.frameIndex]];
    }

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
      S.lampTimer = 0;
      if (S.score >= WIN_SCORE) {
        S.gameOver = true;
        showWin();
      }
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
      spr.scale.set(BOAT_SCALE * (1 - b.sinkTimer / 80));
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
        S.lives--;
        S.boatsSunk++;
        updateHUD();
        spawnTooltip(spr.x, spr.y - 20, '💀', TOOLTIP_STYLE_FAIL);
        playCrashSound();
        // 🛥️ Корабль затонул
        console.log(
          `🛥️ Корабль затонул на (${spr.x.toFixed(0)}, ${spr.y.toFixed(0)})`,
        );
        // Если три корабля затонуло — проигрыш
        if (S.boatsSunk >= 6) {
          scheduleGameOver(showBoatGameOver);
        } else if (S.lives <= 0) {
          scheduleGameOver(showGameOver);
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

// ===== Draw Wakes (boats + police) =====
export function drawWakes() {
  S.wakeGfx.clear();
  for (const b of S.boats) {
    for (const w of b.wake) {
      w.age++;
      const t = w.age / WAKE_MAX;
      if (t >= 1) continue;
      S.wakeGfx.beginFill(C.wake, (1 - t) * 0.15);
      S.wakeGfx.drawCircle(w.x, w.y, 2 + t * 4);
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
      S.wakeGfx.beginFill(C.wake, (1 - t) * 0.15);
      S.wakeGfx.drawCircle(w.x, w.y, 2 + t * 4);
      S.wakeGfx.endFill();
    }
    while (p.wake.length > 0 && p.wake[p.wake.length - 1].age > WAKE_MAX) {
      p.wake.pop();
    }
  }
}

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
