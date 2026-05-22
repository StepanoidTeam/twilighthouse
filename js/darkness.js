import {
  PIXI,
  DARKNESS_PAD,
  DARK_ALPHA,
  DARKNESS_RADIUS,
  BEAM_VISUAL_NARROW_ANGLE,
} from './config.js';
import S from './state.js';
import { getBeamConvergencePoint } from './lighthouse.js';

const PHOSPHOR_TRAIL_MAX_AGE = 180;
const PHOSPHOR_TRAIL_BASE_RADIUS = 18;
const PHOSPHOR_TRAIL_BASE_ALPHA = 0.32;

// Логические размеры RT затемнения: покрываем видимую область мира вокруг
// маяка (gameW / worldScale) + padding с каждой стороны. Маяк лежит по центру
// RT, что освобождает расчёты от привязки к lhX/lhY и viewport-центру.
function getDarknessLogicalSize() {
  const pad = DARKNESS_PAD;
  const s = S.worldScale || 1;
  return {
    pad,
    w: S.gameW / s + pad * 2,
    h: S.gameH / s + pad * 2,
  };
}

export function rebuildDarknessGeometry() {
  if (!S.darkRT || !S.darknessGfx) return;
  const { w, h } = getDarknessLogicalSize();
  S.darkRT.resize(w, h);
  // darknessGfx — ребёнок worldContainer. Сажаем его так, чтобы центр RT
  // совпадал с мировыми координатами маяка.
  S.darknessGfx.position.set(S.lhX - w / 2, S.lhY - h / 2);
}

export function buildDarkness(parent) {
  const { w, h } = getDarknessLogicalSize();
  S.darkRT = PIXI.RenderTexture.create({ width: w, height: h });

  S.darknessGfx = new PIXI.Sprite(S.darkRT);
  S.darknessGfx.position.set(S.lhX - w / 2, S.lhY - h / 2);
  S.darknessGfx.filters = [new PIXI.BlurFilter(20)];
  parent.addChild(S.darknessGfx);

  S.darkFill = new PIXI.Graphics();
  S.beamErase = new PIXI.Graphics();
  S.beamErase.blendMode = PIXI.BLEND_MODES.ERASE;
  S.outerDark = new PIXI.Graphics();
}

export function updateDarkness() {
  const { w, h } = getDarknessLogicalSize();
  const bLen = Math.max(w, h) * 2;
  const visualHalfAngle = Math.max(
    0.001,
    S.BEAM_HALF_ANGLE - BEAM_VISUAL_NARROW_ANGLE,
  );
  // Маяк всегда в центре RT. Точка схождения луча — на радиусе от центра.
  const cxLH = w / 2;
  const cyLH = h / 2;
  const convergence = getBeamConvergencePoint(S.beamAngle);
  const cx = cxLH + convergence.x;
  const cy = cyLH + convergence.y;

  const cxCircle = cxLH + S.BEAM_ORIGIN_OFFSET_X;
  const cyCircle = cyLH + S.BEAM_ORIGIN_OFFSET_Y;

  // Заливка полной темноты
  S.darkFill.clear();
  S.darkFill.beginFill(0x000000, DARK_ALPHA);
  S.darkFill.drawRect(0, 0, w, h);
  S.darkFill.endFill();
  S.app.renderer.render(S.darkFill, { renderTexture: S.darkRT, clear: true });

  // Стираем конус луча + круг у основания маяка (с учётом мерцания лампы)
  S.beamErase.clear();
  S.beamErase.beginFill(0xffffff, S.lampFlicker);
  S.beamErase.moveTo(cx, cy);
  S.beamErase.lineTo(
    cx + Math.cos(S.beamAngle - visualHalfAngle) * bLen,
    cy + Math.sin(S.beamAngle - visualHalfAngle) * bLen,
  );
  S.beamErase.lineTo(
    cx + Math.cos(S.beamAngle + visualHalfAngle) * bLen,
    cy + Math.sin(S.beamAngle + visualHalfAngle) * bLen,
  );
  S.beamErase.closePath();
  S.beamErase.endFill();

  // glow circle
  S.beamErase.beginFill(0xffffff, S.lampFlicker);
  S.beamErase.drawCircle(cxCircle, cyCircle, S.LH_GLOW_RADIUS);
  S.beamErase.endFill();

  const moonlightRadius = Math.max(0, Number(S.moonlightRevealRadius) || 0);
  const moonlightAlpha = Math.max(0, Number(S.moonlightRevealAlpha) || 0);
  if (moonlightRadius > 0 && moonlightAlpha > 0) {
    S.beamErase.beginFill(0xffffff, moonlightAlpha * S.lampFlicker);
    S.beamErase.drawCircle(cxLH, cyLH, moonlightRadius);
    S.beamErase.endFill();
  }

  if (Array.isArray(S.enemyGlowTraces) && S.enemyGlowTraces.length > 0) {
    const next = [];
    for (const trace of S.enemyGlowTraces) {
      const age = (trace.age || 0) + 1;
      if (age >= PHOSPHOR_TRAIL_MAX_AGE) continue;
      trace.age = age;
      next.push(trace);
      const progress = age / PHOSPHOR_TRAIL_MAX_AGE;
      const alpha = Math.max(0, (trace.alpha || PHOSPHOR_TRAIL_BASE_ALPHA) * (1 - progress));
      const radius = Math.max(
        2,
        (trace.radius || PHOSPHOR_TRAIL_BASE_RADIUS) * (0.7 + progress * 0.5),
      );
      if (alpha <= 0) continue;
      S.beamErase.beginFill(0xffffff, alpha);
      S.beamErase.drawCircle(trace.x - S.lhX + cxLH, trace.y - S.lhY + cyLH, radius);
      S.beamErase.endFill();
    }
    S.enemyGlowTraces = next;
  }

  S.app.renderer.render(S.beamErase, { renderTexture: S.darkRT, clear: false });

  // Снова заливаем чёрным вне радиуса спавна: луч туда не дотянется
  S.outerDark.clear();
  S.outerDark.beginFill(0x000000, 1);
  S.outerDark.drawRect(0, 0, w, h);
  S.outerDark.beginHole();
  S.outerDark.drawCircle(cxLH, cyLH, DARKNESS_RADIUS);
  S.outerDark.endHole();
  S.outerDark.endFill();
  S.app.renderer.render(S.outerDark, { renderTexture: S.darkRT, clear: false });
}

export function addEnemyGlowTrace(x, y) {
  if (!S.phosphorWaterEnabled) return;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
  if (!Array.isArray(S.enemyGlowTraces)) {
    S.enemyGlowTraces = [];
  }
  S.enemyGlowTraces.push({
    x,
    y,
    age: 0,
    radius: PHOSPHOR_TRAIL_BASE_RADIUS + Math.random() * 6,
    alpha: PHOSPHOR_TRAIL_BASE_ALPHA + Math.random() * 0.08,
  });
  if (S.enemyGlowTraces.length > 260) {
    S.enemyGlowTraces.splice(0, S.enemyGlowTraces.length - 260);
  }
}
