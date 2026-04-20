import { PIXI, DARKNESS_PAD, DARK_ALPHA, DARKNESS_RADIUS } from './config.js';
import S from './state.js';

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
  // Маяк всегда в центре RT. Луч сдвинут на BEAM_ORIGIN_OFFSET_*.
  const cxLH = w / 2;
  const cyLH = h / 2;
  const cx = cxLH + S.BEAM_ORIGIN_OFFSET_X;
  const cy = cyLH + S.BEAM_ORIGIN_OFFSET_Y;

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
    cx + Math.cos(S.beamAngle - S.BEAM_HALF_ANGLE) * bLen,
    cy + Math.sin(S.beamAngle - S.BEAM_HALF_ANGLE) * bLen,
  );
  S.beamErase.lineTo(
    cx + Math.cos(S.beamAngle + S.BEAM_HALF_ANGLE) * bLen,
    cy + Math.sin(S.beamAngle + S.BEAM_HALF_ANGLE) * bLen,
  );
  S.beamErase.closePath();
  S.beamErase.endFill();

  S.beamErase.beginFill(0xffffff, 1);
  S.beamErase.drawCircle(cx, cy, S.LH_GLOW_RADIUS);
  S.beamErase.endFill();
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
