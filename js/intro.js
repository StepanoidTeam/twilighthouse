import { PIXI } from './config.js';
import S from './state.js';
import { playSound } from './sound.js';
import { t } from './i18n.js';

const COMICS_FILES = [
  'sprites/comics/comics-1.png',
  'sprites/comics/comics-2.png',
  'sprites/comics/comics-3.png',
  'sprites/comics/comics-4.png',
];

const PAGE_FLIP_SOUND = 'audio/book.mp3';
const PAGE_FLIP_VOLUME = 0.7;

const BTN_LABEL_STYLE = new PIXI.TextStyle({
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  fontSize: 26,
  fontWeight: 'bold',
  fill: '#ffffff',
  stroke: '#000',
  strokeThickness: 4,
  dropShadow: true,
  dropShadowColor: '#000',
  dropShadowBlur: 4,
  dropShadowDistance: 0,
});

const COUNTER_STYLE = new PIXI.TextStyle({
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  fontSize: 18,
  fontWeight: 'bold',
  fill: '#c8d8e8',
  dropShadow: true,
  dropShadowColor: '#000',
  dropShadowBlur: 3,
  dropShadowDistance: 0,
});

const HINT_STYLE = new PIXI.TextStyle({
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  fontSize: 14,
  fontWeight: 'normal',
  fill: '#6a8a9a',
  dropShadow: true,
  dropShadowColor: '#000',
  dropShadowBlur: 3,
  dropShadowDistance: 0,
  align: 'center',
});

function makeButton(label, onClick) {
  const container = new PIXI.Container();

  const txt = new PIXI.Text(label, BTN_LABEL_STYLE);
  txt.anchor.set(0.5);

  const padX = 22;
  const padY = 12;
  const w = Math.max(72, txt.width + padX * 2);
  const h = txt.height + padY * 2;

  const bg = new PIXI.Graphics();
  bg.beginFill(0x1a2230, 0.92);
  bg.lineStyle(2, 0x5599cc, 1);
  bg.drawRoundedRect(-w / 2, -h / 2, w, h, 10);
  bg.endFill();

  container.addChild(bg);
  container.addChild(txt);

  container.interactive = true;
  container.buttonMode = true;
  container.cursor = 'pointer';
  container.hitArea = new PIXI.Rectangle(-w / 2, -h / 2, w, h);
  container.alpha = 0.9;
  container.on('pointerover', () => {
    container.alpha = 1;
  });
  container.on('pointerout', () => {
    container.alpha = 0.9;
  });
  container.on('pointerdown', onClick);

  container._txt = txt;
  container._bg = bg;
  container._w = w;
  container._h = h;
  return container;
}

function redrawButton(btn, newLabel) {
  if (btn._txt.text === newLabel) return;
  btn._txt.text = newLabel;
  const padX = 22;
  const padY = 12;
  const w = Math.max(72, btn._txt.width + padX * 2);
  const h = btn._txt.height + padY * 2;
  btn._bg.clear();
  btn._bg.beginFill(0x1a2230, 0.92);
  btn._bg.lineStyle(2, 0x5599cc, 1);
  btn._bg.drawRoundedRect(-w / 2, -h / 2, w, h, 10);
  btn._bg.endFill();
  btn.hitArea = new PIXI.Rectangle(-w / 2, -h / 2, w, h);
  btn._w = w;
  btn._h = h;
}

export async function showIntro(app) {
  const textures = [];
  for (const file of COMICS_FILES) {
    textures.push(await PIXI.Assets.load(file));
  }

  const container = new PIXI.Container();
  app.stage.addChild(container);

  const bgGfx = new PIXI.Graphics();
  container.addChild(bgGfx);

  const pageSprite = new PIXI.Sprite(textures[0]);
  pageSprite.anchor.set(0.5);
  container.addChild(pageSprite);

  const counter = new PIXI.Text(`1 / ${textures.length}`, COUNTER_STYLE);
  counter.anchor.set(0.5);
  container.addChild(counter);

  const hint = new PIXI.Text(t('hint.intro'), HINT_STYLE);
  hint.anchor.set(0.5);
  container.addChild(hint);

  let idx = 0;
  let resolved = false;
  let resolvePromise;

  const btnPrev = makeButton('◀', () => setPage(idx - 1));
  const btnNext = makeButton('▶', () => {
    if (idx < textures.length - 1) {
      setPage(idx + 1);
    } else {
      playSound(PAGE_FLIP_SOUND, PAGE_FLIP_VOLUME);
      closeIntro();
    }
  });
  const btnSkip = makeButton(t('intro.skip'), () => {
    closeIntro();
  });
  container.addChild(btnPrev);
  container.addChild(btnNext);
  container.addChild(btnSkip);

  const layout = () => {
    bgGfx.clear();
    bgGfx.beginFill(0x05080e, 1);
    bgGfx.drawRect(0, 0, S.gameW, S.gameH);
    bgGfx.endFill();

    const tex = pageSprite.texture;
    if (tex && tex.baseTexture) {
      const tw = tex.width;
      const th = tex.height;
      const maxW = S.gameW * 0.9;
      const maxH = S.gameH * 0.78;
      const scale = Math.min(maxW / tw, maxH / th);
      pageSprite.width = tw * scale;
      pageSprite.height = th * scale;
    }
    pageSprite.position.set(S.gameW / 2, S.gameH * 0.46);

    const btnY = S.gameH - 56;
    btnPrev.position.set(S.gameW / 2 - 120, btnY);
    btnNext.position.set(S.gameW / 2 + 120, btnY);
    counter.position.set(S.gameW / 2, btnY);

    btnSkip.position.set(S.gameW - btnSkip._w / 2 - 20, btnSkip._h / 2 + 20);

    hint.position.set(S.gameW / 2, S.gameH - 18);
  };

  const updateNavState = () => {
    btnPrev.alpha = idx === 0 ? 0.35 : 0.9;
    btnPrev.interactive = idx !== 0;
    btnPrev.cursor = idx === 0 ? 'default' : 'pointer';

    const isLast = idx === textures.length - 1;
    redrawButton(btnNext, isLast ? t('intro.start') : '▶');
    btnSkip.visible = !isLast;
    layout();
  };

  function setPage(newIdx) {
    if (resolved) return;
    const clamped = Math.max(0, Math.min(textures.length - 1, newIdx));
    if (clamped === idx) return;
    idx = clamped;
    pageSprite.texture = textures[idx];
    counter.text = `${idx + 1} / ${textures.length}`;
    updateNavState();
    playSound(PAGE_FLIP_SOUND, PAGE_FLIP_VOLUME);
  }

  function closeIntro() {
    if (resolved) return;
    resolved = true;
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', onResize);
    app.stage.removeChild(container);
    container.destroy({ children: true });
    resolvePromise();
  }

  const onKey = (e) => {
    const ae = document.activeElement;
    if (
      ae &&
      (ae.tagName === 'INPUT' ||
        ae.tagName === 'TEXTAREA' ||
        ae.isContentEditable)
    ) {
      return;
    }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      setPage(idx - 1);
    } else if (
      e.code === 'ArrowRight' ||
      e.code === 'KeyD' ||
      e.code === 'Space' ||
      e.code === 'Enter' ||
      e.code === 'KeyE'
    ) {
      if (idx < textures.length - 1) {
        setPage(idx + 1);
      } else {
        playSound(PAGE_FLIP_SOUND, PAGE_FLIP_VOLUME);
        closeIntro();
      }
    } else if (e.code === 'Escape' || e.code === 'KeyQ') {
      closeIntro();
    }
  };

  const onResize = () => layout();

  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);

  updateNavState();

  return new Promise((resolve) => {
    resolvePromise = resolve;
  });
}
