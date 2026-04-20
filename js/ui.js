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
  scaleToWidth,
} from './config.js';
import {
  CRASH_VOLUME,
  CRASH_SOUNDS,
  playSound,
  playRandomSound,
} from './sound.js';
import S from './state.js';
import { t } from './i18n.js';

// ===== Tooltips =====
export function playCrashSound() {
  playRandomSound(CRASH_SOUNDS, CRASH_VOLUME);
}

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
  // Ящики колумбийского, которые прячет Паттисон.
  // Каждый освещённый коп = -1 ящик. Ноль — Дефо выкидывает Паттисона.
  S.txtPolice.text = `❄️${'📦'.repeat(Math.max(0, S.crates))}`;
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

  S.txtPolice = new PIXI.Text('❄️📦📦📦', new PIXI.TextStyle(UI_STYLE));
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
  const btnWidth = 88;
  const BTN_BOTTOM_MARGIN = 80;

  // Left button
  S.btnLeft = new PIXI.Container();
  const sprLeft = new PIXI.Sprite(S.textures.button);
  sprLeft.anchor.set(0.5);
  scaleToWidth(sprLeft, btnWidth);
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
  scaleToWidth(sprRight, btnWidth);
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

  // Escape button (top-left)
  S.btnEsc = new PIXI.Container();
  const sprEsc = new PIXI.Sprite(S.textures.button);
  sprEsc.anchor.set(0.5);
  scaleToWidth(sprEsc, 60);
  S.btnEsc.addChild(sprEsc);
  const txtEsc = new PIXI.Text('Esc', {
    fontFamily: 'Segoe UI, system-ui, sans-serif',
    fontSize: 16,
    fill: '#c8d8e8',
    align: 'center',
    fontWeight: 'bold',
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 3,
    dropShadowDistance: 0,
  });
  txtEsc.anchor.set(0.5);
  txtEsc.y = -4;
  S.btnEsc.addChild(txtEsc);
  S.btnEsc.position.set(44, 28);
  S.btnEsc.interactive = true;
  S.btnEsc.buttonMode = true;
  S.btnEsc.cursor = 'pointer';
  S.btnEsc.hitArea = new PIXI.Circle(0, 0, 30);
  S.btnEsc.alpha = 0.7;
  S.btnEsc.on('pointerover', () => {
    S.btnEsc.alpha = 1;
  });
  S.btnEsc.on('pointerout', () => {
    S.btnEsc.alpha = 0.7;
  });
  S.hudLayer.addChild(S.btnEsc);
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
    t('overlay.pressToPlayAgain'),
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

  // Pattinson splash — Дефо выкидывает Паттисона: кокс кончился
  S.overlayLayer.splashPattinson = new PIXI.Sprite();
  S.overlayLayer.splashPattinson.anchor.set(0.5);
  S.overlayLayer.splashPattinson.visible = false;
  S.overlayLayer.addChildAt(S.overlayLayer.splashPattinson, 4);

  // Peremoha splash — победа: спасены все корабли
  S.overlayLayer.splashPeremoha = new PIXI.Sprite();
  S.overlayLayer.splashPeremoha.anchor.set(0.5);
  S.overlayLayer.splashPeremoha.visible = false;
  S.overlayLayer.addChildAt(S.overlayLayer.splashPeremoha, 5);

  // Кнопки для экрана поражения / подтверждения выхода
  // Left group: Enter/E — restart/confirm
  S.overlayLayer.btnActionLeft = new PIXI.Container();
  const sprActionLeft = new PIXI.Sprite(S.textures.button);
  sprActionLeft.anchor.set(0.5);
  scaleToWidth(sprActionLeft, 77);
  S.overlayLayer.btnActionLeft.addChild(sprActionLeft);
  const txtActionLeftKey = new PIXI.Text('E', {
    fontFamily: 'Segoe UI, system-ui, sans-serif',
    fontSize: 20,
    fill: '#fff',
    align: 'center',
    fontWeight: 'bold',
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 3,
    dropShadowDistance: 0,
  });
  txtActionLeftKey.anchor.set(0.5);
  txtActionLeftKey.y = -4;
  S.overlayLayer.btnActionLeft.addChild(txtActionLeftKey);
  S.overlayLayer.btnActionLeft.txtLabel = new PIXI.Text(
    t('overlay.restart'),
    new PIXI.TextStyle({
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#c8d8e8',
      dropShadow: true,
      dropShadowColor: '#000',
      dropShadowBlur: 4,
      dropShadowDistance: 0,
      align: 'center',
    }),
  );
  S.overlayLayer.btnActionLeft.txtLabel.anchor.set(0.5, 0);
  S.overlayLayer.btnActionLeft.txtLabel.y = 38;
  S.overlayLayer.btnActionLeft.addChild(S.overlayLayer.btnActionLeft.txtLabel);
  S.overlayLayer.btnActionLeft.visible = false;
  S.overlayLayer.addChild(S.overlayLayer.btnActionLeft);

  // Right group: Esc/Q — exit to menu
  S.overlayLayer.btnActionRight = new PIXI.Container();
  const sprActionRight = new PIXI.Sprite(S.textures.button);
  sprActionRight.anchor.set(0.5);
  scaleToWidth(sprActionRight, 77);
  S.overlayLayer.btnActionRight.addChild(sprActionRight);
  const txtActionRightKey = new PIXI.Text('Esc', {
    fontFamily: 'Segoe UI, system-ui, sans-serif',
    fontSize: 16,
    fill: '#c8d8e8',
    align: 'center',
    fontWeight: 'bold',
    dropShadow: true,
    dropShadowColor: '#000',
    dropShadowBlur: 3,
    dropShadowDistance: 0,
  });
  txtActionRightKey.anchor.set(0.5);
  txtActionRightKey.y = -4;
  S.overlayLayer.btnActionRight.addChild(txtActionRightKey);
  S.overlayLayer.btnActionRight.txtLabel = new PIXI.Text(
    t('overlay.toMenu'),
    new PIXI.TextStyle({
      fontFamily: 'Segoe UI, system-ui, sans-serif',
      fontSize: 16,
      fontWeight: 'bold',
      fill: '#c8d8e8',
      dropShadow: true,
      dropShadowColor: '#000',
      dropShadowBlur: 4,
      dropShadowDistance: 0,
      align: 'center',
    }),
  );
  S.overlayLayer.btnActionRight.txtLabel.anchor.set(0.5, 0);
  S.overlayLayer.btnActionRight.txtLabel.y = 38;
  S.overlayLayer.btnActionRight.addChild(
    S.overlayLayer.btnActionRight.txtLabel,
  );
  S.overlayLayer.btnActionRight.visible = false;
  S.overlayLayer.addChild(S.overlayLayer.btnActionRight);

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
  // Позиционирование кнопок действий на оверлее
  if (S.overlayLayer.btnActionLeft && S.overlayLayer.btnActionRight) {
    const keyY = S.gameH - 90;
    S.overlayLayer.btnActionLeft.position.set(S.gameW / 2 - 90, keyY);
    S.overlayLayer.btnActionRight.position.set(S.gameW / 2 + 90, keyY);
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
  if (S.btnEsc) S.btnEsc.position.set(44, 28);

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
  positionSplashSprite(S.overlayLayer.splashPattinson);
  positionSplashSprite(S.overlayLayer.splashPeremoha);
}

export function buildUI() {
  buildHUD();
  buildButtons();
  buildOverlay();
  repositionUI();
}

// ===== Game Over Screens =====
function playFailSound() {
  playSound('audio/fail-1.mp3', 0.1);
}

async function showGameOverScreen({
  message,
  splashKey,
  msgOffsetY = -60,
  playFail = true,
}) {
  S.gameOver = true;
  S.txtMessage.text = message;
  fadeInOverlay();
  if (playFail) playFailSound();

  // Hide gameplay buttons
  if (S.btnLeft) S.btnLeft.visible = false;
  if (S.btnRight) S.btnRight.visible = false;
  if (S.btnEsc) S.btnEsc.visible = false;

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

  if (S.overlayLayer.btnActionLeft) {
    S.overlayLayer.btnActionLeft.txtLabel.text = t('overlay.restart');
    S.overlayLayer.btnActionLeft.visible = true;
  }
  if (S.overlayLayer.btnActionRight) {
    S.overlayLayer.btnActionRight.txtLabel.text = t('overlay.toMenu');
    S.overlayLayer.btnActionRight.visible = true;
  }

  // Hide all splash sprites, then show the requested one
  for (const key of [
    'splashIceberg',
    'splashMermaid',
    'splashKraken',
    'splashPolice',
    'splashPattinson',
    'splashPeremoha',
  ]) {
    if (S.overlayLayer[key]) S.overlayLayer[key].visible = false;
  }

  if (splashKey) {
    const spriteFile = {
      splashIceberg: 'sprites/wasted/iceberg.png',
      splashMermaid: 'sprites/wasted/mermaid.png',
      splashKraken: 'sprites/wasted/kraken.png',
      splashPolice: 'sprites/wasted/police.png',
      splashPattinson: 'sprites/wasted/pattinson.png',
      splashPeremoha: 'sprites/wasted/peremoha.png',
    }[splashKey];
    if (!S.textures[splashKey]) {
      S.textures[splashKey] = await PIXI.Assets.load(spriteFile);
    }
    S.overlayLayer[splashKey].texture = S.textures[splashKey];
    S.overlayLayer[splashKey].visible = true;
    // Splash covers full screen — hide dark overlay behind it
    S.overlayBg.visible = false;
  }

  repositionUI();
}

export function showBoatGameOver() {
  return showGameOverScreen({
    message: t('gameOver.boats', { n: S.boatsSunk }),
    splashKey: 'splashIceberg',
  });
}

export function showPoliceGameOver() {
  return showGameOverScreen({
    message: t('gameOver.police'),
    splashKey: 'splashPolice',
  });
}

export function showPattinsonGameOver() {
  return showGameOverScreen({
    message: t('gameOver.pattinson'),
    splashKey: 'splashPattinson',
  });
}

export function showMermaidGameOver() {
  return showGameOverScreen({
    message: t('gameOver.mermaids', { n: S.mermaidsArrived }),
    splashKey: 'splashMermaid',
  });
}

export function showKrakenGameOver() {
  return showGameOverScreen({
    message: t('gameOver.kraken'),
    splashKey: 'splashKraken',
  });
}

export function showGameOver() {
  // Hide gameplay buttons
  if (S.btnLeft) S.btnLeft.visible = false;
  if (S.btnRight) S.btnRight.visible = false;
  if (S.btnEsc) S.btnEsc.visible = false;

  if (S.overlayLayer.btnActionLeft) {
    S.overlayLayer.btnActionLeft.txtLabel.text = t('overlay.restart');
    S.overlayLayer.btnActionLeft.visible = true;
  }
  if (S.overlayLayer.btnActionRight) {
    S.overlayLayer.btnActionRight.txtLabel.text = t('overlay.toMenu');
    S.overlayLayer.btnActionRight.visible = true;
  }
  playFailSound();
  S.txtMessage.text = t('gameOver.score', { score: S.score, total: WIN_SCORE });
  fadeInOverlay();
}

export async function showWin() {
  await showGameOverScreen({
    message: t('win.message', { total: WIN_SCORE }),
    splashKey: 'splashPeremoha',
    msgOffsetY: -60,
    playFail: false,
  });
}

// ===== Exit Confirmation =====
export function showExitConfirm() {
  S.exitConfirm = true;

  // Hide gameplay buttons
  if (S.btnLeft) S.btnLeft.visible = false;
  if (S.btnRight) S.btnRight.visible = false;
  if (S.btnEsc) S.btnEsc.visible = false;

  S.overlayBg.visible = true;
  S.overlayLayer.visible = true;
  S.overlayLayer.alpha = 1;

  S.txtMessage.text = t('exit.confirm');
  S.txtMessage.style = new PIXI.TextStyle({
    ...UI_STYLE,
    fontSize: 36,
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
  S.txtMessage.position.set(S.gameW / 2, S.gameH / 2 - 30);
  S.txtMessage.visible = true;
  S.txtRestart.visible = false;

  // Hide splash sprites
  for (const key of [
    'splashIceberg',
    'splashMermaid',
    'splashKraken',
    'splashPolice',
    'splashPattinson',
  ]) {
    if (S.overlayLayer[key]) S.overlayLayer[key].visible = false;
  }

  if (S.overlayLayer.btnActionLeft) {
    S.overlayLayer.btnActionLeft.txtLabel.text = t('overlay.exit');
    S.overlayLayer.btnActionLeft.visible = true;
  }
  if (S.overlayLayer.btnActionRight) {
    S.overlayLayer.btnActionRight.txtLabel.text = t('overlay.resume');
    S.overlayLayer.btnActionRight.visible = true;
  }

  repositionUI();
}

export function hideExitConfirm() {
  S.exitConfirm = false;
  S.overlayLayer.visible = false;
  S.overlayLayer.alpha = 1;
  S.txtMessage.visible = false;
  S.txtRestart.visible = false;
  if (S.overlayLayer.btnActionLeft)
    S.overlayLayer.btnActionLeft.visible = false;
  if (S.overlayLayer.btnActionRight)
    S.overlayLayer.btnActionRight.visible = false;

  // Restore gameplay buttons
  if (S.btnLeft) S.btnLeft.visible = true;
  if (S.btnRight) S.btnRight.visible = true;
  if (S.btnEsc) S.btnEsc.visible = true;
}
