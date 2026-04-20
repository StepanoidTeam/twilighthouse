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
  TOOLTIP_STYLE_OK,
  TOOLTIP_STYLE_FAIL,
} from './config.js';
import S from './state.js';
import { isInBeam, checkRockCollision, spawnOnRing } from './lighthouse.js';
import {
  spawnTooltip,
  updateHUD,
  scheduleGameOver,
  showPoliceGameOver,
} from './ui.js';

export function spawnPoliceBoat() {
  const { x, y } = spawnOnRing();

  const spr = new PIXI.Sprite(S.textures.boat1);
  spr.anchor.set(0.5);
  spr.scale.set(BOAT_SCALE);
  spr.tint = 0xaaccff;
  spr.position.set(x, y);
  S.boatLayer.addChild(spr);

  const beacon = new PIXI.Graphics();
  beacon.beginFill(0x0044ff, 1);
  beacon.drawCircle(0, 0, BEACON_RADIUS);
  beacon.endFill();
  beacon.beginFill(0x2266ff, 0.4);
  beacon.drawCircle(0, 0, BEACON_RADIUS * 2.5);
  beacon.endFill();
  beacon.blendMode = PIXI.BLEND_MODES.ADD;
  beacon.position.set(x, y);
  S.beaconLayer.addChild(beacon);

  const angle = Math.atan2(S.lhY - y, S.lhX - x);
  spr.rotation = angle + Math.PI / 2;

  S.policeBoats.push({
    spr,
    beacon,
    speed: BOAT_SPEED * 1.1 + Math.random() * 0.3,
    sinkTimer: 0,
    sinking: false,
    arrived: false,
    beaconPhase: Math.random() * Math.PI * 2,
    beaconBlue: true,
    wake: [],
    frameIndex: 0,
    frameTick: Math.random() * BOAT_FRAME_DURATION,
    driftDir: Math.random() < 0.5 ? 1 : -1,
    wasLit: false,
  });
}

export function updatePoliceBoats(delta) {
  for (let i = S.policeBoats.length - 1; i >= 0; i--) {
    const p = S.policeBoats[i];
    if (p.arrived) continue;

    const { spr } = p;
    const toX = S.lhX - spr.x;
    const toY = S.lhY - spr.y;
    const dist = Math.hypot(toX, toY);

    // Frame animation (same as friendly boats)
    p.frameTick += delta;
    if (p.frameTick >= BOAT_FRAME_DURATION) {
      p.frameTick -= BOAT_FRAME_DURATION;
      p.frameIndex = (p.frameIndex + 1) % BOAT_FRAMES.length;
      spr.texture = S.textures[BOAT_FRAMES[p.frameIndex]];
    }

    // Копы: если светишь — плывут к маяку, если нет — дрейфяют мимо
    const lit = isInBeam(spr.x, spr.y);
    // Show cop tooltip on beam entry / exit
    if (lit && !p.wasLit) {
      spawnTooltip(spr.x, spr.y - 30, '‼️', TOOLTIP_STYLE_FAIL);
    } else if (!lit && p.wasLit) {
      spawnTooltip(spr.x, spr.y - 30, '❔', TOOLTIP_STYLE_OK);
    }
    p.wasLit = lit;

    if (dist < ARRIVAL_RADIUS && !p.sinking && lit) {
      p.arrived = true;
      S.policeArrived++;
      updateHUD();
      console.log(
        `🚔 Полицейский катер добрался до маяка (${spr.x.toFixed(0)}, ${spr.y.toFixed(0)})`,
      );
      spawnTooltip(spr.x, spr.y - 20, '🚔', TOOLTIP_STYLE_FAIL);
      S.shakeTime = 0.5;
      S.shakeIntensity = 18;
      if (S.policeArrived >= 3) {
        scheduleGameOver(showPoliceGameOver);
      }
      const fadeOut = () => {
        spr.alpha -= 0.02;
        p.beacon.alpha = spr.alpha;
        if (spr.alpha <= 0) {
          S.app.ticker.remove(fadeOut);
          S.boatLayer.removeChild(spr);
          S.beaconLayer.removeChild(p.beacon);
          S.policeBoats.splice(S.policeBoats.indexOf(p), 1);
        }
      };
      S.app.ticker.add(fadeOut);
      continue;
    }

    if (p.sinking) {
      p.sinkTimer += delta;
      spr.alpha = Math.max(0, 1 - p.sinkTimer / 60);
      spr.rotation += 0.03 * delta;
      spr.scale.set(BOAT_SCALE * (1 - p.sinkTimer / 80));
      if (spr.alpha <= 0) {
        S.boatLayer.removeChild(spr);
        S.beaconLayer.removeChild(p.beacon);
        S.policeBoats.splice(i, 1);
      }
      continue;
    }

    // Копы: если светишь — плывут к маяку, если нет — дрейфяют мимо
    const nx = toX / dist;
    const ny = toY / dist;

    let moveNx, moveNy, speedMult;
    if (lit) {
      // Направление к маяку
      moveNx = nx;
      moveNy = ny;
      speedMult = 1.5;
    } else {
      // Тангенциальный дрейф мимо маяка
      moveNx = -ny * p.driftDir;
      moveNy = nx * p.driftDir;
      speedMult = 0.9;
    }

    const moveX = moveNx * p.speed * speedMult * delta;
    const moveY = moveNy * p.speed * speedMult * delta;
    spr.x += moveX;
    spr.y += moveY;

    // Face movement direction
    const targetRot = Math.atan2(moveY, moveX) + Math.PI / 2;
    let rDiff = targetRot - spr.rotation;
    while (rDiff > Math.PI) rDiff -= Math.PI * 2;
    while (rDiff < -Math.PI) rDiff += Math.PI * 2;
    spr.rotation += rDiff * 0.08 * delta;

    // Rock collision — sink when not lit (no penalty), push away when lit
    if (checkRockCollision(spr.x, spr.y)) {
      if (!lit) {
        p.sinking = true;
        p.sinkTimer = 0;
        spawnTooltip(spr.x, spr.y - 20, '💀', TOOLTIP_STYLE_FAIL);
        console.log(
          `🚔 Полицейский катер разбился о камни (${spr.x.toFixed(0)}, ${spr.y.toFixed(0)})`,
        );
      } else {
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
    p.wake.unshift({ x: spr.x - moveNx * 14, y: spr.y - moveNy * 14, age: 0 });
    if (p.wake.length > WAKE_MAX) p.wake.pop();

    // Pulse beacon: same sine as regular boats, color alternates by sign
    const t = Math.sin(Date.now() * BEACON_PULSE_SPEED + p.beaconPhase);
    const isBlue = t >= 0;
    if (isBlue !== p.beaconBlue) {
      p.beaconBlue = isBlue;
      const col = isBlue ? 0x0044ff : 0xff2200;
      const glow = isBlue ? 0x2266ff : 0xff4400;
      p.beacon.clear();
      p.beacon.beginFill(col, 1);
      p.beacon.drawCircle(0, 0, BEACON_RADIUS);
      p.beacon.endFill();
      p.beacon.beginFill(glow, 0.4);
      p.beacon.drawCircle(0, 0, BEACON_RADIUS * 2.5);
      p.beacon.endFill();
      p.beacon.blendMode = PIXI.BLEND_MODES.ADD;
    }
    p.beacon.alpha = Math.abs(t);
    p.beacon.position.set(spr.x, spr.y);
  }
}

export function cleanupPolice() {
  for (const p of S.policeBoats) {
    S.boatLayer.removeChild(p.spr);
    S.beaconLayer.removeChild(p.beacon);
  }
  S.policeBoats = [];
}
