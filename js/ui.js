import {
  PIXI,
  UI_STYLE,
  TOOLTIP_RISE_SPEED,
  TOOLTIP_DURATION,
  OVERLAY_FADE_DURATION,
  BOAT_CARGO_TYPES,
  CARGO_LABEL_STYLE,
  WIN_SCORE,
  LAMP_BURNOUT_TIME,
  GAME_OVER_DELAY,
} from './config.js';
import S from './state.js';

// ===== Tooltips =====
export function spawnTooltip(x, y, text, style) {
  const txt = new PIXI.Text(text, style);
  txt.anchor.set(0.5);
  txt.position.set(x, y);
  S.tooltipLayer.addChild(txt);
  S.tooltips.push({ txt, age: 0 });
}

export function updateTooltips(delta) {
  for (let i = S.tooltips.length - 1; i >= 0; i--) {
    const t = S.tooltips[i];
    t.age += delta;
    t.txt.y -= TOOLTIP_RISE_SPEED * delta;
    t.txt.alpha = Math.max(0, 1 - t.age / TOOLTIP_DURATION);
    if (t.age >= TOOLTIP_DURATION) {
      S.tooltipLayer.removeChild(t.txt);
      t.txt.destroy();
      S.tooltips.splice(i, 1);
    }
  }
}

export function createCargoLabel(cargoText) {
  const container = new PIXI.Container();
  const txt = new PIXI.Text(cargoText, CARGO_LABEL_STYLE);
  txt.anchor.set(0.5, 0.5);
  const pad = 7;
  const w = txt.width + pad * 2;
  const h = txt.height + pad * 2;
  const bg = new PIXI.Graphics();
  bg.beginFill(0x071420, 0.88);
  bg.lineStyle(1.5, 0x44cc88, 1);
  bg.drawRoundedRect(-w / 2, -h / 2, w, h, 6);
  bg.endFill();
  container.addChild(bg);
  container.addChild(txt);
  container.visible = false;
  return container;
}

// ===== Overlay Fade =====
export function fadeInOverlay() {
  S.overlayLayer.alpha = 0;
  S.overlayLayer.visible = true;
  const start = performance.now();
  const tick = () => {
    const t = Math.min(1, (performance.now() - start) / OVERLAY_FADE_DURATION);
    S.overlayLayer.alpha = t;
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

export function scheduleGameOver(fn) {
  if (S.gameOver || S.gameOverPending) return;
  S.gameOverPending = true;
  setTimeout(fn, GAME_OVER_DELAY);
}

// ===== HUD =====
export function updateHUD() {
  const cargoStr = BOAT_CARGO_TYPES.map((t) =>
    S.deliveredCargo[t] > 0 ? `${t}${S.deliveredCargo[t]}` : null,
  )
    .filter(Boolean)
    .join(' ');
  S.txtScore.text = cargoStr || '📦×0';
  S.txtLives.text = '❤️'.repeat(Math.max(0, S.lives));
  S.txtMermaids.text = `🧜 ${S.mermaidsArrived}/3`;
  S.txtPolice.text = `🚔 ${S.policeArrived}/3`;
  const bulbs = Math.max(
    0,
    Math.round((1 - S.lampTimer / LAMP_BURNOUT_TIME) * 5),
  );
  S.txtLamp.text = bulbs > 0 ? '💡'.repeat(bulbs) : '🔦';
  S.txtSunk.text = `⛵💥 ${S.boatsSunk}/6`;
}

// ===== Build HUD =====
export function buildHUD() {
  S.hudLayer = new PIXI.Container();

  S.txtLives = new PIXI.Text('❤️❤️❤️', new PIXI.TextStyle(UI_STYLE));
  S.txtLives.anchor.set(1, 0);
  S.hudLayer.addChild(S.txtLives);

  S.txtScore = new PIXI.Text('📦×0', new PIXI.TextStyle(UI_STYLE));
  S.txtScore.anchor.set(1, 0);
  S.hudLayer.addChild(S.txtScore);

  S.txtMermaids = new PIXI.Text('🧜 0/3', new PIXI.TextStyle(UI_STYLE));
  S.txtMermaids.anchor.set(1, 0);
  S.hudLayer.addChild(S.txtMermaids);

  S.txtPolice = new PIXI.Text('🚔 0/3', new PIXI.TextStyle(UI_STYLE));
  S.txtPolice.anchor.set(1, 0);
  S.hudLayer.addChild(S.txtPolice);

  S.txtLamp = new PIXI.Text('💡💡💡💡💡', new PIXI.TextStyle(UI_STYLE));
  S.txtLamp.anchor.set(1, 0);
  S.hudLayer.addChild(S.txtLamp);

  S.txtSunk = new PIXI.Text('⛵💥 0/6', new PIXI.TextStyle(UI_STYLE));
  S.txtSunk.anchor.set(1, 0);
  S.hudLayer.addChild(S.txtSunk);

  S.app.stage.addChild(S.hudLayer);
}

// ===== Build Buttons =====
function bindTurnButton(button, keyCode) {
  button.interactive = true;
  button.buttonMode = true;
  button.cursor = 'pointer';
  button.hitArea = new PIXI.Circle(0, 0, 44);

  const press = () => {
    S.keys[keyCode] = true;
  };
  const release = () => {
    S.keys[keyCode] = false;
  };

  button.on('pointerdown', press);
  button.on('pointerup', release);
  button.on('pointerupoutside', release);
  button.on('pointercancel', release);
  button.on('pointerout', release);
}

export function buildButtons() {
  const btnSpacing = 110;
  const btnScale = 0.32;
  const BTN_BOTTOM_MARGIN = 80;

  // Left button
  S.btnLeft = new PIXI.Container();
  const sprLeft = new PIXI.Sprite(S.textures.button);
  sprLeft.anchor.set(0.5);
  sprLeft.scale.set(btnScale);
  S.btnLeft.addChild(sprLeft);
  const txtArrowLeft = new PIXI.Text('←', {
    fontFamily: 'Segoe UI, system-ui, sans-serif',
    fontSize: 32,
    fill: '#fff',
    align: 'center',
    fontWeight: 'bold',
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 4,
    dropShadowDistance: 0,
  });
  txtArrowLeft.anchor.set(0.5);
  txtArrowLeft.x = -24;
  txtArrowLeft.y = -2;
  S.btnLeft.addChild(txtArrowLeft);
  const txtDLabelOnLeft = new PIXI.Text('A', {
    fontFamily: 'Segoe UI, system-ui, sans-serif',
    fontSize: 18,
    fill: '#fff',
    align: 'center',
    fontWeight: 'bold',
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 3,
    dropShadowDistance: 0,
  });
  txtDLabelOnLeft.anchor.set(0.5);
  txtDLabelOnLeft.x = 22;
  txtDLabelOnLeft.y = -28;
  S.btnLeft.addChild(txtDLabelOnLeft);
  S.btnLeft.position.set(S.gameW / 2 - btnSpacing, S.gameH - BTN_BOTTOM_MARGIN);
  bindTurnButton(S.btnLeft, 'ArrowLeft');
  S.hudLayer.addChild(S.btnLeft);

  // Right button
  S.btnRight = new PIXI.Container();
  const sprRight = new PIXI.Sprite(S.textures.button);
  sprRight.anchor.set(0.5);
  sprRight.scale.set(btnScale);
  S.btnRight.addChild(sprRight);
  const txtArrowRight = new PIXI.Text('→', {
    fontFamily: 'Segoe UI, system-ui, sans-serif',
    fontSize: 32,
    fill: '#fff',
    align: 'center',
    fontWeight: 'bold',
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 4,
    dropShadowDistance: 0,
  });
  txtArrowRight.anchor.set(0.5);
  txtArrowRight.x = 24;
  txtArrowRight.y = -2;
  S.btnRight.addChild(txtArrowRight);
  const txtALabelOnRight = new PIXI.Text('D', {
    fontFamily: 'Segoe UI, system-ui, sans-serif',
    fontSize: 18,
    fill: '#fff',
    align: 'center',
    fontWeight: 'bold',
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 3,
    dropShadowDistance: 0,
  });
  txtALabelOnRight.anchor.set(0.5);
  txtALabelOnRight.x = -22;
  txtALabelOnRight.y = -28;
  S.btnRight.addChild(txtALabelOnRight);
  S.btnRight.position.set(
    S.gameW / 2 + btnSpacing,
    S.gameH - BTN_BOTTOM_MARGIN,
  );
  bindTurnButton(S.btnRight, 'ArrowRight');
  S.hudLayer.addChild(S.btnRight);
}

// ===== Overlay =====
export function buildOverlay() {
  S.overlayLayer = new PIXI.Container();
  S.overlayLayer.visible = false;

  S.overlayBg = new PIXI.Graphics();
  S.overlayLayer.addChild(S.overlayBg);

  S.txtMessage = new PIXI.Text(
    '',
    new PIXI.TextStyle({
      ...UI_STYLE,
      fontSize: 36,
    }),
  );
  S.txtMessage.anchor.set(0.5);
  S.overlayLayer.addChild(S.txtMessage);

  S.txtRestart = new PIXI.Text(
    'Press to play again',
    new PIXI.TextStyle({
      ...UI_STYLE,
      fontSize: 18,
      fontWeight: 'normal',
      fill: '#4a88aa',
    }),
  );
  S.txtRestart.anchor.set(0.5);
  S.overlayLayer.addChild(S.txtRestart);

  // Iceberg splash image (hidden by default)
  S.overlayLayer.splashIceberg = new PIXI.Sprite();
  S.overlayLayer.splashIceberg.anchor.set(0.5);
  S.overlayLayer.splashIceberg.visible = false;
  S.overlayLayer.addChildAt(S.overlayLayer.splashIceberg, 0);

  // Mermaid splash image (hidden by default)
  S.overlayLayer.splashMermaid = new PIXI.Sprite();
  S.overlayLayer.splashMermaid.anchor.set(0.5);
  S.overlayLayer.splashMermaid.visible = false;
  S.overlayLayer.addChildAt(S.overlayLayer.splashMermaid, 1);

  // Kraken splash image (hidden by default)
  S.overlayLayer.splashKraken = new PIXI.Sprite();
  S.overlayLayer.splashKraken.anchor.set(0.5);
  S.overlayLayer.splashKraken.visible = false;
  S.overlayLayer.addChildAt(S.overlayLayer.splashKraken, 2);

  // Police splash image (hidden by default)
  S.overlayLayer.splashPolice = new PIXI.Sprite();
  S.overlayLayer.splashPolice.anchor.set(0.5);
  S.overlayLayer.splashPolice.visible = false;
  S.overlayLayer.addChildAt(S.overlayLayer.splashPolice, 3);

  // Кнопки Enter и Spacebar для экрана поражения
  S.overlayLayer.keyEnter = new PIXI.Sprite(S.textures.buttonEnter);
  S.overlayLayer.keyEnter.anchor.set(0.5);
  S.overlayLayer.keyEnter.scale.set(0.5);
  S.overlayLayer.keyEnter.visible = false;
  S.overlayLayer.addChild(S.overlayLayer.keyEnter);

  S.overlayLayer.txtOr = new PIXI.Text(
    'OR',
    new PIXI.TextStyle({
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: 18,
      fontWeight: 'bold',
      fill: '#6a8a9a',
      dropShadow: true,
      dropShadowColor: '#000',
      dropShadowBlur: 4,
      dropShadowDistance: 0,
    }),
  );
  S.overlayLayer.txtOr.anchor.set(0.5);
  S.overlayLayer.txtOr.visible = false;
  S.overlayLayer.addChild(S.overlayLayer.txtOr);

  S.overlayLayer.keySpace = new PIXI.Sprite(S.textures.buttonSpace);
  S.overlayLayer.keySpace.anchor.set(0.5);
  S.overlayLayer.keySpace.scale.set(0.5);
  S.overlayLayer.keySpace.visible = false;
  S.overlayLayer.addChild(S.overlayLayer.keySpace);

  S.app.stage.addChild(S.overlayLayer);
}

function positionSplashSprite(sprite) {
  if (!sprite) return;

  sprite.position.set(S.gameW / 2, S.gameH / 2);

  if (sprite.texture && sprite.texture.baseTexture) {
    const tex = sprite.texture;
    const tw = tex.width;
    const th = tex.height;
    const scale = Math.min(S.gameW / tw, S.gameH / th);
    sprite.width = tw * scale;
    sprite.height = th * scale;
  } else {
    sprite.width = S.gameW;
    sprite.height = S.gameH;
  }
}

export function repositionUI() {
  // Позиционирование спрайтов-кнопок на экране поражения
  if (S.overlayLayer.keyEnter && S.overlayLayer.keySpace) {
    const keyY = S.gameH - 80;
    S.overlayLayer.keyEnter.position.set(S.gameW / 2 - 130, keyY);
    if (S.overlayLayer.txtOr)
      S.overlayLayer.txtOr.position.set(S.gameW / 2, keyY);
    S.overlayLayer.keySpace.position.set(S.gameW / 2 + 130, keyY);
  }
  const HUD_RIGHT = S.gameW - 12;
  const HUD_LINE = 28;
  S.txtLives.position.set(HUD_RIGHT, 12);
  S.txtScore.position.set(HUD_RIGHT, 12 + HUD_LINE);
  S.txtMermaids.position.set(HUD_RIGHT, 12 + HUD_LINE * 2);
  S.txtPolice.position.set(HUD_RIGHT, 12 + HUD_LINE * 3);
  S.txtLamp.position.set(HUD_RIGHT, 12 + HUD_LINE * 4);
  S.txtSunk.position.set(HUD_RIGHT, 12 + HUD_LINE * 5);
  // Move buttons if present
  const BTN_BOTTOM_MARGIN = 80;
  if (S.btnLeft)
    S.btnLeft.position.set(S.gameW / 2 - 110, S.gameH - BTN_BOTTOM_MARGIN);
  if (S.btnRight)
    S.btnRight.position.set(S.gameW / 2 + 110, S.gameH - BTN_BOTTOM_MARGIN);

  S.overlayBg.clear();
  S.overlayBg.beginFill(0x0a1020, 0.8);
  S.overlayBg.drawRect(0, 0, S.gameW, S.gameH);
  S.overlayBg.endFill();

  S.txtMessage.position.set(S.gameW / 2, S.gameH / 2 - 20);
  S.txtRestart.position.set(S.gameW / 2, S.gameH / 2 + 50);

  positionSplashSprite(S.overlayLayer.splashIceberg);
  positionSplashSprite(S.overlayLayer.splashMermaid);
  positionSplashSprite(S.overlayLayer.splashKraken);
  positionSplashSprite(S.overlayLayer.splashPolice);
}

export function buildUI() {
  buildHUD();
  buildButtons();
  buildOverlay();
  repositionUI();
}

// ===== Game Over Screens =====
function playFailSound() {
  const snd = new Audio('audio/fail-1.mp3');
  snd.volume = 0.1;
  snd.play().catch(() => {});
}

async function showGameOverScreen({ message, splashKey, msgOffsetY = -60 }) {
  S.gameOver = true;
  S.txtMessage.text = message;
  fadeInOverlay();
  playFailSound();

  S.txtMessage.style = new PIXI.TextStyle({
    ...UI_STYLE,
    fontSize: 38,
    fontWeight: 'bold',
    fill: '#fff',
    stroke: '#000',
    strokeThickness: 6,
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 8,
    dropShadowDistance: 0,
    align: 'center',
  });
  S.txtMessage.position.set(S.gameW / 2, S.gameH / 2 + msgOffsetY);
  S.txtMessage.visible = true;

  S.txtRestart.style = new PIXI.TextStyle({
    ...UI_STYLE,
    fontSize: 22,
    fontWeight: 'normal',
    fill: '#fff',
    stroke: '#000',
    strokeThickness: 4,
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 6,
    dropShadowDistance: 0,
    align: 'center',
  });
  S.txtRestart.position.set(S.gameW / 2, S.gameH / 2 + 60);
  S.txtRestart.visible = true;

  if (S.overlayLayer.keyEnter) S.overlayLayer.keyEnter.visible = true;
  if (S.overlayLayer.txtOr) S.overlayLayer.txtOr.visible = true;
  if (S.overlayLayer.keySpace) S.overlayLayer.keySpace.visible = true;

  // Hide all splash sprites, then show the requested one
  for (const key of [
    'splashIceberg',
    'splashMermaid',
    'splashKraken',
    'splashPolice',
  ]) {
    if (S.overlayLayer[key]) S.overlayLayer[key].visible = false;
  }

  if (splashKey) {
    const spriteFile = {
      splashIceberg: 'sprites/wasted/iceberg.png',
      splashMermaid: 'sprites/wasted/mermaid.png',
      splashKraken: 'sprites/wasted/kraken.png',
      splashPolice: 'sprites/wasted/police.png',
    }[splashKey];
    if (!S.textures[splashKey]) {
      S.textures[splashKey] = await PIXI.Assets.load(spriteFile);
    }
    S.overlayLayer[splashKey].texture = S.textures[splashKey];
    S.overlayLayer[splashKey].visible = true;
  }

  repositionUI();
}

export function showBoatGameOver() {
  return showGameOverScreen({
    message: '💀 Game Over — 3 boats sunk!',
    splashKey: 'splashIceberg',
  });
}

export function showPoliceGameOver() {
  return showGameOverScreen({
    message: '🚔 Арест! Полиция захватила маяк!',
    splashKey: 'splashPolice',
  });
}

export function showMermaidGameOver() {
  return showGameOverScreen({
    message: '💀 Game Over — 3 mermaids reached the lighthouse!',
    splashKey: 'splashMermaid',
  });
}

export function showKrakenGameOver() {
  return showGameOverScreen({
    message: '🦑 Кракены захватили маяк!',
    splashKey: 'splashKraken',
  });
}

export function showGameOver() {
  if (S.overlayLayer.keyEnter) S.overlayLayer.keyEnter.visible = true;
  if (S.overlayLayer.txtOr) S.overlayLayer.txtOr.visible = true;
  if (S.overlayLayer.keySpace) S.overlayLayer.keySpace.visible = true;
  playFailSound();
  S.txtMessage.text = `💀 Game Over — ${S.score}/${WIN_SCORE} boats saved`;
  fadeInOverlay();
}

export function showWin() {
  S.txtMessage.text = `🎉 You Win! All ${WIN_SCORE} boats saved!`;
  fadeInOverlay();
}
