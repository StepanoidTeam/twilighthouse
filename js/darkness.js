import { PIXI, DARKNESS_PAD, DARK_ALPHA, DARKNESS_RADIUS } from './config.js';
import S from './state.js';

export function buildDarkness(parent) {
  const pad = DARKNESS_PAD;
  S.darkRT = PIXI.RenderTexture.create({
    width: S.gameW + pad * 2,
    height: S.gameH + pad * 2,
  });

  S.darknessGfx = new PIXI.Sprite(S.darkRT);
  S.darknessGfx.position.set(-pad, -pad);
  S.darknessGfx.filters = [new PIXI.BlurFilter(20)];
  parent.addChild(S.darknessGfx);

  S.darkFill = new PIXI.Graphics();
  S.beamErase = new PIXI.Graphics();
  S.beamErase.blendMode = PIXI.BLEND_MODES.ERASE;
  S.outerDark = new PIXI.Graphics();
}

export function updateDarkness() {
  const pad = DARKNESS_PAD;
  const bLen = Math.max(S.gameW, S.gameH) * 2;
  // cx/cy — мировые координаты маяка + pad (без camX/camY)
  const cx = S.lhX + S.BEAM_ORIGIN_OFFSET_X + pad;
  const cy = S.lhY + S.BEAM_ORIGIN_OFFSET_Y + pad;

  // Dark fill
  S.darkFill.clear();
  S.darkFill.beginFill(0x000000, DARK_ALPHA);
  S.darkFill.drawRect(0, 0, S.gameW + pad * 2, S.gameH + pad * 2);
  S.darkFill.endFill();

  S.app.renderer.render(S.darkFill, { renderTexture: S.darkRT, clear: true });

  // Erase beam cone + lighthouse circle (modulated by lamp flicker)
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

  // Re-fill darkness outside mob spawn radius — beam can't reach beyond it
  S.outerDark.clear();
  S.outerDark.beginFill(0x000000, 1);
  S.outerDark.drawRect(0, 0, S.gameW + pad * 2, S.gameH + pad * 2);
  S.outerDark.beginHole();
  S.outerDark.drawCircle(S.lhX + pad, S.lhY + pad, DARKNESS_RADIUS);
  S.outerDark.endHole();
  S.outerDark.endFill();
  S.app.renderer.render(S.outerDark, { renderTexture: S.darkRT, clear: false });
}
