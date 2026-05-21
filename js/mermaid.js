import {
  PIXI,
  BOAT_SPEED,
  BOAT_RADIUS,
  BOAT_WIDTH,
  ARRIVAL_RADIUS,
  DARKNESS_RADIUS,
  MOB_SPAWN_RING,
  SPAWN_MARGIN,
  MERMAID_FRAMES,
  MERMAID_FRAME_DURATION,
  OCCULT_LAMP_SCARE_RADIUS,
  TOOLTIP_STYLE_OK,
  scaleToWidth,
  tickAnim,
} from './config.js';
import S from './state.js';
import { isInBeam, spawnOnRing } from './lighthouse.js';
import { getMermaidSpeedMult, isOccultLampActive } from './run-perks.js';
import { getOccultLampTargets } from './rocks.js';
import {
  spawnTooltip,
  updateHUD,
  scheduleGameOver,
} from './ui.js';
import { levels } from './levels.js';

// Number of stable frames before the beam scare is committed.
// Matches cops, so a quick beam sweep does not instantly scare mermaids.
const LIT_HYSTERESIS_FRAMES = 10;

/** @returns {{ x: number, y: number } | null} */
function getNearestOccultLamp(mx, my) {
  const lamps = getOccultLampTargets();
  if (!lamps.length) return null;
  let best = null;
  let bestDist = Infinity;
  for (const lamp of lamps) {
    const dist = Math.hypot(mx - lamp.x, my - lamp.y);
    if (dist < bestDist) {
      bestDist = dist;
      best = lamp;
    }
  }
  return best;
}

function scareMermaid(m, originX, originY, tooltip = '🙈') {
  spawnTooltip(m.spr.x, m.spr.y - 30, tooltip, TOOLTIP_STYLE_OK);
  m.fleeing = true;
  m.fleeOriginX = originX;
  m.fleeOriginY = originY;
}

export function spawnMermaid() {
  const { x, y } = spawnOnRing();
  const spr = new PIXI.Sprite(S.textures.mermaid1);
  spr.anchor.set(0.5);
  scaleToWidth(spr, BOAT_WIDTH);
  spr.position.set(x, y);
  S.boatLayer.addChild(spr);
  S.mermaids.push({
    spr,
    speed: (BOAT_SPEED + Math.random() * 0.4) * getMermaidSpeedMult(),
    gone: false,
    fleeing: false,
    fleeOriginX: S.lhX,
    fleeOriginY: S.lhY,
    lastRawLit: false,
    rawLitStableFor: 0,
    wavePhase: Math.random() * Math.PI * 2,
    frameIndex: 0,
    frameTick: Math.random() * MERMAID_FRAME_DURATION,
  });
}

export function updateMermaids(delta) {
  const occultLure = isOccultLampActive();

  for (let i = S.mermaids.length - 1; i >= 0; i--) {
    const m = S.mermaids[i];
    if (m.gone) continue;

    // Frame animation
    tickAnim(m, delta, MERMAID_FRAMES, MERMAID_FRAME_DURATION, S.textures);

    const insideDarknessRadius =
      Math.hypot(m.spr.x - S.lhX, m.spr.y - S.lhY) < DARKNESS_RADIUS;
    const rawLit = insideDarknessRadius && isInBeam(m.spr.x, m.spr.y);
    if (rawLit !== m.lastRawLit) {
      m.lastRawLit = rawLit;
      m.rawLitStableFor = 0;
    }
    m.rawLitStableFor += delta;

    // Засвечена лучом — убегает от маяка
    if (rawLit && !m.fleeing && m.rawLitStableFor >= LIT_HYSTERESIS_FRAMES) {
      scareMermaid(m, S.lhX, S.lhY);
    }

    let nx, ny, speedMult;
    if (m.fleeing) {
      const originX = m.fleeOriginX ?? S.lhX;
      const originY = m.fleeOriginY ?? S.lhY;
      const awayX = m.spr.x - originX;
      const awayY = m.spr.y - originY;
      const awayDist = Math.hypot(awayX, awayY) || 1;
      nx = awayX / awayDist;
      ny = awayY / awayDist;
      speedMult = 2;
    } else if (occultLure) {
      const lamp = getNearestOccultLamp(m.spr.x, m.spr.y);
      if (lamp) {
        const toX = lamp.x - m.spr.x;
        const toY = lamp.y - m.spr.y;
        const dist = Math.hypot(toX, toY);

        if (dist < OCCULT_LAMP_SCARE_RADIUS) {
          scareMermaid(m, lamp.x, lamp.y, '🔮🙈');
          nx = 0;
          ny = 0;
          speedMult = 0;
        } else {
          nx = toX / dist;
          ny = toY / dist;
          speedMult = 1;
        }
      } else {
        // Ламп не осталось — плывёт к маяку как обычно
        const toX = S.lhX - m.spr.x;
        const toY = S.lhY - m.spr.y;
        const dist = Math.hypot(toX, toY);
        if (dist < ARRIVAL_RADIUS) {
          handleMermaidReachedLighthouse(m, i, delta);
          continue;
        }
        nx = toX / dist;
        ny = toY / dist;
        speedMult = 1;
      }
    } else {
      const toX = S.lhX - m.spr.x;
      const toY = S.lhY - m.spr.y;
      const dist = Math.hypot(toX, toY);

      if (dist < ARRIVAL_RADIUS) {
        handleMermaidReachedLighthouse(m, i, delta);
        continue;
      }

      nx = toX / dist;
      ny = toY / dist;
      speedMult = 1;
    }

    // Синусоидальное колебание по X (только когда не убегает)
    m.wavePhase += 0.04 * delta;
    const waveOffset = m.fleeing
      ? 0
      : Math.sin(performance.now() * 0.002 + m.wavePhase) * 24;

    if (speedMult > 0) {
      m.spr.x += nx * m.speed * speedMult * delta + waveOffset * 0.04 * delta;
      m.spr.y += ny * m.speed * speedMult * delta;
    }

    // Удалить если уплыла за пределы зоны
    if (
      m.fleeing &&
      Math.hypot(m.spr.x - S.lhX, m.spr.y - S.lhY) >
        MOB_SPAWN_RING + SPAWN_MARGIN
    ) {
      m.gone = true;
      console.log(`🧜‍♀️ Русалка уплыла за экран`);
      S.boatLayer.removeChild(m.spr);
      S.mermaids.splice(i, 1);
      levels.notify('repelled_mermaids');
      continue;
    }

    // Face movement direction
    if (speedMult > 0) {
      const targetRot = Math.atan2(ny, nx) + Math.PI / 2;
      let rDiff = targetRot - m.spr.rotation;
      while (rDiff > Math.PI) rDiff -= Math.PI * 2;
      while (rDiff < -Math.PI) rDiff += Math.PI * 2;
      m.spr.rotation += rDiff * 0.08 * delta;
    }
  }
}

function handleMermaidReachedLighthouse(m, index, delta) {
  console.log(
    `🧜‍♀️ Русалка добралась до маяка (${m.spr.x.toFixed(0)}, ${m.spr.y.toFixed(0)})`,
  );
  S.shakeTime = 0.5;
  S.shakeIntensity = 18;
  m.gone = true;
  S.mermaidsArrived++;
  if (S.runStats) S.runStats.mermaidsArrived++;
  const gameOver = S.takeDamage('mermaid', 1);
  updateHUD();
  if (gameOver) {
    scheduleGameOver();
  }
  const fadeOut = () => {
    m.spr.alpha -= 0.04 * delta;
    if (m.spr.alpha <= 0) {
      S.boatLayer.removeChild(m.spr);
      S.mermaids.splice(index, 1);
      S.app.ticker.remove(fadeOut);
    }
  };
  S.app.ticker.add(fadeOut);
}

export function drawMermaidDebug(gfx) {
  // Mermaid colliders (yellow)
  for (const m of S.mermaids) {
    if (m.gone) continue;
    gfx.lineStyle(1, 0xffee00, 0.8);
    gfx.drawCircle(m.spr.x, m.spr.y, BOAT_RADIUS);
  }
}

function draw({ debug = false, gfx = null } = {}) {
  if (!debug || !gfx) return;
  drawMermaidDebug(gfx);
}

function update(delta) {
  updateMermaids(delta);
}

export const mermaidEntity = {
  update,
  draw,
};

export function cleanupMermaids() {
  for (const m of S.mermaids) {
    S.boatLayer.removeChild(m.spr);
  }
  S.mermaids = [];
}
