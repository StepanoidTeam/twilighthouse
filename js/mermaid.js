import {
  PIXI,
  BOAT_SPEED,
  BOAT_SCALE,
  ARRIVAL_RADIUS,
  MOB_SPAWN_RING,
  SPAWN_MARGIN,
  MERMAID_FRAMES,
  MERMAID_FRAME_DURATION,
  TOOLTIP_STYLE_OK,
} from './config.js';
import S from './state.js';
import { isInBeam, spawnOnRing } from './lighthouse.js';
import {
  spawnTooltip,
  updateHUD,
  scheduleGameOver,
  showMermaidGameOver,
} from './ui.js';

export function spawnMermaid() {
  const { x, y } = spawnOnRing();
  const spr = new PIXI.Sprite(S.textures.mermaid1);
  spr.anchor.set(0.5);
  spr.scale.set(BOAT_SCALE);
  spr.position.set(x, y);
  S.boatLayer.addChild(spr);
  S.mermaids.push({
    spr,
    speed: BOAT_SPEED + Math.random() * 0.4,
    gone: false,
    fleeing: false,
    wasLit: false,
    wavePhase: Math.random() * Math.PI * 2,
    frameIndex: 0,
    frameTick: Math.random() * MERMAID_FRAME_DURATION,
  });
}

export function updateMermaids(delta) {
  for (let i = S.mermaids.length - 1; i >= 0; i--) {
    const m = S.mermaids[i];
    if (m.gone) continue;

    // Frame animation
    m.frameTick += delta;
    if (m.frameTick >= MERMAID_FRAME_DURATION) {
      m.frameTick -= MERMAID_FRAME_DURATION;
      m.frameIndex = (m.frameIndex + 1) % MERMAID_FRAMES.length;
      m.spr.texture = S.textures[MERMAID_FRAMES[m.frameIndex]];
    }

    const lit = isInBeam(m.spr.x, m.spr.y);

    // Однажды засвечена — убегает навсегда
    if (lit && !m.wasLit) {
      spawnTooltip(m.spr.x, m.spr.y - 30, '🙈', TOOLTIP_STYLE_OK);
    }
    m.wasLit = lit;
    if (lit) m.fleeing = true;

    let nx, ny, speedMult;
    if (m.fleeing) {
      // Бежит от маяка в 2 раза быстрее
      const awayX = m.spr.x - S.lhX;
      const awayY = m.spr.y - S.lhY;
      const awayDist = Math.hypot(awayX, awayY) || 1;
      nx = awayX / awayDist;
      ny = awayY / awayDist;
      speedMult = 2;
    } else {
      // Плывёт к маяку
      const toX = S.lhX - m.spr.x;
      const toY = S.lhY - m.spr.y;
      const dist = Math.hypot(toX, toY);

      // Достигла маяка
      if (dist < ARRIVAL_RADIUS) {
        console.log(
          `🧜‍♀️ Русалка добралась до маяка (${m.spr.x.toFixed(0)}, ${m.spr.y.toFixed(0)})`,
        );
        S.shakeTime = 0.5;
        S.shakeIntensity = 18;
        m.gone = true;
        S.mermaidsArrived++;
        updateHUD();
        if (S.mermaidsArrived >= 3) {
          scheduleGameOver(showMermaidGameOver);
        }
        const fadeOut = () => {
          m.spr.alpha -= 0.04 * delta;
          if (m.spr.alpha <= 0) {
            S.boatLayer.removeChild(m.spr);
            S.mermaids.splice(i, 1);
            S.app.ticker.remove(fadeOut);
          }
        };
        S.app.ticker.add(fadeOut);
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

    m.spr.x += nx * m.speed * speedMult * delta + waveOffset * 0.04 * delta;
    m.spr.y += ny * m.speed * speedMult * delta;

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
      continue;
    }

    // Face movement direction
    const targetRot = Math.atan2(ny, nx) + Math.PI / 2;
    let rDiff = targetRot - m.spr.rotation;
    while (rDiff > Math.PI) rDiff -= Math.PI * 2;
    while (rDiff < -Math.PI) rDiff += Math.PI * 2;
    m.spr.rotation += rDiff * 0.08 * delta;
  }
}

export function cleanupMermaids() {
  for (const m of S.mermaids) {
    S.boatLayer.removeChild(m.spr);
  }
  S.mermaids = [];
}
