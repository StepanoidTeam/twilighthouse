import { PIXI } from './config.js';
import { isInBeam } from './lighthouse.js';
import S from './state.js';
import { createPixiEmojiText } from './emoji-sprites.js';

const INDICATOR_MARGIN = 34;
const INDICATOR_STYLE = new PIXI.TextStyle({
  fontFamily: 'Segoe UI Emoji, Apple Color Emoji, sans-serif',
  fontSize: 28,
  fontWeight: 'bold',
  fill: '#ffffff',
  dropShadow: true,
  dropShadowColor: '#000000',
  dropShadowBlur: 6,
  dropShadowDistance: 0,
});

/** @type {PIXI.Container[]} */
let indicators = [];
let oldMapRevealUntil = 0;

function destroyIndicators() {
  for (const c of indicators) {
    if (c.parent) c.parent.removeChild(c);
    c.destroy({ children: true });
  }
  indicators = [];
}

function placeIndicator(container, worldX, worldY) {
  const screenPos = S.worldContainer.toGlobal({ x: worldX, y: worldY });
  const onScreen =
    screenPos.x >= 0 &&
    screenPos.x <= S.gameW &&
    screenPos.y >= 0 &&
    screenPos.y <= S.gameH;

  if (onScreen) {
    container.position.set(
      Math.max(
        INDICATOR_MARGIN,
        Math.min(S.gameW - INDICATOR_MARGIN, screenPos.x),
      ),
      Math.max(
        INDICATOR_MARGIN,
        Math.min(S.gameH - INDICATOR_MARGIN, screenPos.y),
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
      : ((nx > 0 ? S.gameW - INDICATOR_MARGIN : INDICATOR_MARGIN) - cx) / nx;
  const edgeY =
    ny === 0
      ? Infinity
      : ((ny > 0 ? S.gameH - INDICATOR_MARGIN : INDICATOR_MARGIN) - cy) / ny;
  const edgeDist = Math.min(Math.abs(edgeX), Math.abs(edgeY));
  container.position.set(cx + nx * edgeDist, cy + ny * edgeDist);
}

function ensureIndicatorLayer() {
  if (!S.app) return null;
  if (!S.oldMapLayer) {
    S.oldMapLayer = new PIXI.Container();
    S.app.stage.addChild(S.oldMapLayer);
  }
  return S.oldMapLayer;
}

function makeIndicator(icon) {
  const layer = ensureIndicatorLayer();
  if (!layer) return null;
  const container = new PIXI.Container();
  const txt = createPixiEmojiText(icon, INDICATOR_STYLE, S.textures, {
    emojiSize: 32,
  });
  txt.pivot.set(txt.contentWidth / 2, txt.contentHeight / 2);
  container.addChild(txt);
  layer.addChild(container);
  indicators.push(container);
  return container;
}

function isTimedRevealActive() {
  return oldMapRevealUntil > performance.now();
}

function syncIndicatorsActive() {
  if (
    S.oldMapIndicatorsActive &&
    oldMapRevealUntil &&
    !isTimedRevealActive()
  ) {
    oldMapRevealUntil = 0;
    S.oldMapIndicatorsActive = false;
  }
  return S.oldMapIndicatorsActive;
}

/** @param {number} durationMs */
export function triggerOldMapReveal(durationMs) {
  oldMapRevealUntil = performance.now() + durationMs;
  S.oldMapIndicatorsActive = true;
}

export function isOldMapRevealActive() {
  return isTimedRevealActive();
}

export function resetOldMapReveal() {
  oldMapRevealUntil = 0;
  S.oldMapIndicatorsActive = false;
}

export function updateOldMapReveal() {
  const active = syncIndicatorsActive();
  if (!active) {
    destroyIndicators();
    if (S.oldMapLayer) S.oldMapLayer.visible = false;
    return;
  }

  const layer = ensureIndicatorLayer();
  if (!layer) return;
  layer.visible = true;
  destroyIndicators();

  for (const p of S.policeBoats) {
    if (p.arrived || p.sinking) continue;
    if (isInBeam(p.spr.x, p.spr.y)) continue;
    const c = makeIndicator('🚔');
    if (c) placeIndicator(c, p.spr.x, p.spr.y);
  }
  for (const m of S.mermaids) {
    if (m.gone) continue;
    if (isInBeam(m.spr.x, m.spr.y)) continue;
    const c = makeIndicator('🧜‍♀️');
    if (c) placeIndicator(c, m.spr.x, m.spr.y);
  }
  for (const k of S.krakens) {
    if (k.gone) continue;
    if (isInBeam(k.spr.x, k.spr.y)) continue;
    const c = makeIndicator('🦑');
    if (c) placeIndicator(c, k.spr.x, k.spr.y);
  }
  for (const b of S.boats) {
    if (b.arrived || b.sinking) continue;
    if (b.lit) continue;
    const c = makeIndicator('📦');
    if (c) placeIndicator(c, b.spr.x, b.spr.y);
  }
}

export function cleanupOldMap() {
  destroyIndicators();
  if (S.oldMapLayer) {
    S.app?.stage.removeChild(S.oldMapLayer);
    S.oldMapLayer.destroy({ children: true });
    S.oldMapLayer = null;
  }
  resetOldMapReveal();
}
