import {
  PIXI,
  BOAT_SPEED,
  BOAT_RADIUS,
  KRAKEN_RADIUS,
  KRAKEN_WIDTH,
  ARRIVAL_RADIUS,
  MOB_SPAWN_RING,
  SPAWN_MARGIN,
  TOOLTIP_STYLE_OK,
  TOOLTIP_STYLE_FAIL,
  KRAKEN_CHASE_FRAMES,
  KRAKEN_RETREAT_FRAMES,
  KRAKEN_FRAME_DURATION,
  scaleToWidth,
} from './config.js';
import S from './state.js';
import { isInBeam, spawnOnRing } from './lighthouse.js';
import {
  spawnTooltip,
  updateHUD,
  scheduleGameOver,
  showKrakenGameOver,
  showBoatGameOver,
  showGameOver,
  playCrashSound,
} from './ui.js';

export function spawnKraken() {
  const { x, y } = spawnOnRing();
  const spr = new PIXI.Sprite(S.textures.krakenChase1);
  spr.anchor.set(0.5);
  scaleToWidth(spr, KRAKEN_WIDTH);
  spr.position.set(x, y);
  S.boatLayer.addChild(spr);
  S.krakens.push({
    spr,
    speed: BOAT_SPEED * 0.6 + Math.random() * 0.3,
    gone: false,
    fleeing: false,
    wavePhase: Math.random() * Math.PI * 2,
    frameIndex: 0,
    frameTick: Math.random() * KRAKEN_FRAME_DURATION,
  });
}

export function updateKrakens(delta) {
  for (let i = S.krakens.length - 1; i >= 0; i--) {
    const k = S.krakens[i];
    if (k.gone) continue;

    const lit = isInBeam(k.spr.x, k.spr.y);
    // Динамически: убегает пока в луче, возвращается когда луч ушёл
    const prevFleeing = k.fleeing;
    k.fleeing = lit;

    // Сброс кадра при смене фазы
    if (k.fleeing !== prevFleeing) {
      k.frameIndex = 0;
      k.frameTick = 0;
    }

    // Frame animation
    k.frameTick += delta;
    if (k.frameTick >= KRAKEN_FRAME_DURATION) {
      k.frameTick -= KRAKEN_FRAME_DURATION;
      const frames = k.fleeing ? KRAKEN_RETREAT_FRAMES : KRAKEN_CHASE_FRAMES;
      k.frameIndex = (k.frameIndex + 1) % frames.length;
      k.spr.texture = S.textures[frames[k.frameIndex]];
    }

    let nx, ny, speedMult;
    if (k.fleeing) {
      // Бежит от маяка
      const awayX = k.spr.x - S.lhX;
      const awayY = k.spr.y - S.lhY;
      const awayDist = Math.hypot(awayX, awayY) || 1;
      nx = awayX / awayDist;
      ny = awayY / awayDist;
      speedMult = 2;
    } else {
      // Плывёт к маяку
      const toX = S.lhX - k.spr.x;
      const toY = S.lhY - k.spr.y;
      const dist = Math.hypot(toX, toY);

      // Достиг маяка
      if (dist < ARRIVAL_RADIUS + KRAKEN_RADIUS) {
        console.log(
          `🦑 Кракен добрался до маяка (${k.spr.x.toFixed(0)}, ${k.spr.y.toFixed(0)})`,
        );
        S.shakeTime = 0.7;
        S.shakeIntensity = 28;
        k.gone = true;
        S.krakensArrived++;
        spawnTooltip(k.spr.x, k.spr.y - 20, '🦑', TOOLTIP_STYLE_FAIL);
        scheduleGameOver(showKrakenGameOver);
        const fadeOut = () => {
          k.spr.alpha -= 0.04 * delta;
          if (k.spr.alpha <= 0) {
            S.boatLayer.removeChild(k.spr);
            S.krakens.splice(i, 1);
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

    // Синусоидальное колебание (только когда не убегает)
    k.wavePhase += 0.04 * delta;
    const kWaveOffset = k.fleeing
      ? 0
      : Math.sin(performance.now() * 0.002 + k.wavePhase) * 24;

    k.spr.x += nx * k.speed * speedMult * delta + kWaveOffset * 0.04 * delta;
    k.spr.y += ny * k.speed * speedMult * delta;

    // Смещённый центр коллайдера кракена (вниз на 1 радиус)
    const kcx = k.spr.x;
    const kcy = k.spr.y + KRAKEN_RADIUS;

    // Кракен уничтожает корабли
    for (let bi = S.boats.length - 1; bi >= 0; bi--) {
      const b = S.boats[bi];
      if (b.arrived || b.sinking) continue;
      if (
        Math.hypot(kcx - b.spr.x, kcy - b.spr.y) <
        KRAKEN_RADIUS + BOAT_RADIUS
      ) {
        b.sinking = true;
        b.sinkTimer = 0;
        S.lives--;
        S.boatsSunk++;
        updateHUD();
        spawnTooltip(b.spr.x, b.spr.y - 20, '🦑💀', TOOLTIP_STYLE_FAIL);
        playCrashSound();
        console.log(`🦑 Кракен уничтожил корабль`);
        if (S.boatsSunk >= 6) scheduleGameOver(showBoatGameOver);
        else if (S.lives <= 0) scheduleGameOver(showGameOver);
      }
    }

    // Кракен уничтожает русалок
    for (let mi = S.mermaids.length - 1; mi >= 0; mi--) {
      const m = S.mermaids[mi];
      if (m.gone) continue;
      if (
        Math.hypot(kcx - m.spr.x, kcy - m.spr.y) <
        KRAKEN_RADIUS + BOAT_RADIUS
      ) {
        m.gone = true;
        spawnTooltip(m.spr.x, m.spr.y - 20, '🦑🧜', TOOLTIP_STYLE_OK);
        console.log(`🦑 Кракен уничтожил русалку`);
        S.boatLayer.removeChild(m.spr);
        S.mermaids.splice(mi, 1);
      }
    }

    // Кракен уничтожает полицейских
    for (let pi = S.policeBoats.length - 1; pi >= 0; pi--) {
      const p = S.policeBoats[pi];
      if (p.arrived || p.sinking) continue;
      if (
        Math.hypot(kcx - p.spr.x, kcy - p.spr.y) <
        KRAKEN_RADIUS + BOAT_RADIUS
      ) {
        p.sinking = true;
        p.sinkTimer = 0;
        spawnTooltip(p.spr.x, p.spr.y - 20, '🦑🚔', TOOLTIP_STYLE_OK);
        console.log(`🦑 Кракен уничтожил полицейского`);
      }
    }

    // Кракен топит льдины-камни
    for (let ri = S.rockColliders.length - 1; ri >= 0; ri--) {
      const rock = S.rockColliders[ri];
      if (
        Math.hypot(kcx - rock.x, kcy - rock.y) <
        KRAKEN_RADIUS + rock.radius
      ) {
        const spr = S.rockSprites[ri];
        if (spr) {
          S.rockLayer.removeChild(spr);
          S.rockSprites.splice(ri, 1);
        }
        S.rockColliders.splice(ri, 1);
        console.log(`🦑 Кракен потопил льдину`);
      }
    }

    // Удалить если уплыл за пределы зоны (только убегая)
    if (
      k.fleeing &&
      Math.hypot(k.spr.x - S.lhX, k.spr.y - S.lhY) >
        MOB_SPAWN_RING + SPAWN_MARGIN
    ) {
      k.gone = true;
      console.log(`🦑 Кракен уплыл за экран`);
      S.boatLayer.removeChild(k.spr);
      S.krakens.splice(i, 1);
      continue;
    }

    // Кракен не вращается
  }
}

export function cleanupKrakens() {
  for (const k of S.krakens) {
    S.boatLayer.removeChild(k.spr);
  }
  S.krakens = [];
}
