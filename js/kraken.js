import {
  PIXI,
  BOAT_SPEED,
  BOAT_RADIUS,
  KRAKEN_RADIUS,
  KRAKEN_WIDTH,
  ARRIVAL_RADIUS,
  MOB_SPAWN_RING,
  SPAWN_MARGIN,
  DARKNESS_RADIUS,
  TOOLTIP_STYLE_OK,
  TOOLTIP_STYLE_FAIL,
  KRAKEN_CHASE_FRAMES,
  KRAKEN_RETREAT_FRAMES,
  KRAKEN_FRAME_DURATION,
  LIT_DEBOUNCE,
  scaleToWidth,
  tickAnim,
} from './config.js';
import S from './state.js';
import { isInBeam, spawnOnRing } from './lighthouse.js';
import { spawnMermaid } from './mermaid.js';
import {
  spawnTooltip,
  updateHUD,
  scheduleGameOver,
  playCrashSound,
} from './ui.js';
import { levels } from './levels.js';

const KRAKEN_INDICATOR_MARGIN = 34;
const KRAKEN_INDICATOR_STYLE = new PIXI.TextStyle({
  fontFamily: 'Segoe UI Emoji, Apple Color Emoji, sans-serif',
  fontSize: 34,
  fontWeight: 'bold',
  fill: '#ffffff',
  dropShadow: true,
  dropShadowColor: '#000000',
  dropShadowBlur: 6,
  dropShadowDistance: 0,
});

function createKrakenIndicator() {
  const container = new PIXI.Container();
  container.visible = false;

  const icon = new PIXI.Text('🦑', KRAKEN_INDICATOR_STYLE);
  icon.anchor.set(0.5);

  container.addChild(icon);
  S.app.stage.addChild(container);
  return container;
}

function destroyKrakenIndicator(k) {
  if (!k.indicator) return;
  S.app.stage.removeChild(k.indicator);
  k.indicator.destroy({ children: true });
  k.indicator = null;
}

function updateKrakenIndicator(k) {
  if (!k.indicator) return;
  const screenPos = k.spr.getGlobalPosition();
  const onScreen =
    screenPos.x >= 0 &&
    screenPos.x <= S.gameW &&
    screenPos.y >= 0 &&
    screenPos.y <= S.gameH;
  const outsideDarknessRadius =
    Math.hypot(k.spr.x - S.lhX, k.spr.y - S.lhY) > DARKNESS_RADIUS;

  k.indicator.visible = !onScreen || outsideDarknessRadius;
  if (!k.indicator.visible) return;

  if (onScreen) {
    k.indicator.position.set(
      Math.max(
        KRAKEN_INDICATOR_MARGIN,
        Math.min(S.gameW - KRAKEN_INDICATOR_MARGIN, screenPos.x),
      ),
      Math.max(
        KRAKEN_INDICATOR_MARGIN,
        Math.min(S.gameH - KRAKEN_INDICATOR_MARGIN, screenPos.y),
      ),
    );
    return;
  }

  const cx = S.gameW / 2;
  const cy = S.gameH / 2;
  const dx = screenPos.x - cx;
  const dy = screenPos.y - cy;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = dx / dist;
  const ny = dy / dist;
  const edgeX =
    nx === 0
      ? Infinity
      : ((nx > 0 ? S.gameW - KRAKEN_INDICATOR_MARGIN : KRAKEN_INDICATOR_MARGIN) -
          cx) /
        nx;
  const edgeY =
    ny === 0
      ? Infinity
      : ((ny > 0 ? S.gameH - KRAKEN_INDICATOR_MARGIN : KRAKEN_INDICATOR_MARGIN) -
          cy) /
        ny;
  const edgeDist = Math.min(Math.abs(edgeX), Math.abs(edgeY));
  k.indicator.position.set(cx + nx * edgeDist, cy + ny * edgeDist);
}

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
    litPending: null,
    litPendingAt: 0,
    wavePhase: Math.random() * Math.PI * 2,
    frameIndex: 0,
    frameTick: Math.random() * KRAKEN_FRAME_DURATION,
    baseScaleX: spr.scale.x,
    indicator: createKrakenIndicator(),
    fadeOut: null,
  });
}

export function updateKrakens(delta) {
  for (let i = S.krakens.length - 1; i >= 0; i--) {
    const k = S.krakens[i];
    if (k.gone) continue;

    const prevFleeing = k.fleeing;
    const rawLit = isInBeam(k.spr.x, k.spr.y);
    const now = performance.now();

    // Debounce beam state so kraken does not thrash on the beam edge.
    if (rawLit !== k.fleeing) {
      if (k.litPending !== rawLit) {
        k.litPending = rawLit;
        k.litPendingAt = now;
      } else if (now - k.litPendingAt >= LIT_DEBOUNCE) {
        k.fleeing = rawLit;
        k.litPending = null;
        if (rawLit) {
          spawnTooltip(k.spr.x, k.spr.y - 30, '🙈', TOOLTIP_STYLE_OK);
          spawnMermaid();
        }
      }
    } else {
      k.litPending = null;
    }

    // Сброс кадра при смене фазы
    if (k.fleeing !== prevFleeing) {
      k.frameIndex = 0;
      k.frameTick = 0;
    }

    // Frame animation
    const kFrames = k.fleeing ? KRAKEN_RETREAT_FRAMES : KRAKEN_CHASE_FRAMES;
    tickAnim(k, delta, kFrames, KRAKEN_FRAME_DURATION, S.textures);

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
        destroyKrakenIndicator(k);
        S.krakensArrived++;
        spawnTooltip(k.spr.x, k.spr.y - 20, '🦑 −💔×ALL', TOOLTIP_STYLE_FAIL);
        const gameOver = S.takeDamage('kraken', S.heartsRemaining);
        updateHUD();
        if (gameOver) {
          scheduleGameOver();
        }
        const fadeOut = (fadeDelta) => {
          k.spr.alpha -= 0.04 * fadeDelta;
          if (k.spr.alpha <= 0) {
            if (k.spr.parent) k.spr.parent.removeChild(k.spr);
            const idx = S.krakens.indexOf(k);
            if (idx !== -1) S.krakens.splice(idx, 1);
            S.app.ticker.remove(fadeOut);
            k.fadeOut = null;
          }
        };
        k.fadeOut = fadeOut;
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

    k.spr.scale.x = nx > 0 ? -k.baseScaleX : k.baseScaleX;

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
        S.boatsSunk++;
        // Kraken sink counts as boat-sink damage
        const gameOver = S.takeDamage('boat-sink', 1);
        updateHUD();
        spawnTooltip(b.spr.x, b.spr.y - 20, '🦑💀 −💔', TOOLTIP_STYLE_FAIL);
        playCrashSound();
        console.log(`🦑 Кракен уничтожил корабль`);
        if (gameOver) scheduleGameOver();
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
        playCrashSound();
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
        playCrashSound();
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
      destroyKrakenIndicator(k);
      if (k.spr.parent) k.spr.parent.removeChild(k.spr);
      S.krakens.splice(i, 1);
      levels.notify('repelled_kraken');
      continue;
    }

    // Кракен не вращается
    updateKrakenIndicator(k);
  }
}

export function drawKrakenDebug(gfx) {
  // Kraken colliders: attack (purple, larger, offset down)
  // and illumination trigger (cyan, exact point used by isInBeam).
  for (const k of S.krakens) {
    if (k.gone) continue;
    gfx.lineStyle(2, 0xcc44ff, 0.9);
    gfx.drawCircle(k.spr.x, k.spr.y + KRAKEN_RADIUS, KRAKEN_RADIUS);

    gfx.lineStyle(2, 0x00e5ff, 0.95);
    gfx.drawCircle(k.spr.x, k.spr.y, BOAT_RADIUS);
    gfx.moveTo(k.spr.x - 6, k.spr.y);
    gfx.lineTo(k.spr.x + 6, k.spr.y);
    gfx.moveTo(k.spr.x, k.spr.y - 6);
    gfx.lineTo(k.spr.x, k.spr.y + 6);
  }
}

function draw({ debug = false, gfx = null } = {}) {
  if (!debug || !gfx) return;
  drawKrakenDebug(gfx);
}

function update(delta) {
  updateKrakens(delta);
}

export const krakenEntity = {
  update,
  draw,
};

export function cleanupKrakens() {
  for (const k of S.krakens) {
    if (k.fadeOut) S.app.ticker.remove(k.fadeOut);
    destroyKrakenIndicator(k);
    if (k.spr.parent) k.spr.parent.removeChild(k.spr);
  }
  S.krakens = [];
}
