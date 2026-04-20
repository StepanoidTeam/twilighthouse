import { PIXI, UI_STYLE, C } from './config.js';
import S from './state.js';

// ===== Menu State =====
let menuContainer = null;
let menuBg = null;
let menuItems = [];
let selectedIndex = 0;
let currentScreen = 'main'; // 'main' | 'leaderboard' | 'settings' | 'authors' | null (game)
let creditsContainer = null;
let creditsAnimId = null;
let onStartGame = null;

// ===== Menu Sprites =====
const MENU_BG_FILE = 'sprites/favicon2.png';
const CREDITS_BG_FILE = 'sprites/wasted/police.png';

// ===== Styles =====
const TITLE_STYLE = new PIXI.TextStyle({
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  fontSize: 48,
  fontWeight: 'bold',
  fill: '#fff',
  stroke: '#000',
  strokeThickness: 6,
  dropShadow: true,
  dropShadowColor: '#000',
  dropShadowBlur: 10,
  dropShadowDistance: 0,
});

const MENU_ITEM_STYLE = new PIXI.TextStyle({
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  fontSize: 26,
  fontWeight: 'bold',
  fill: '#c8d8e8',
  dropShadow: true,
  dropShadowColor: '#000',
  dropShadowBlur: 4,
  dropShadowDistance: 0,
});

const MENU_ITEM_SELECTED_STYLE = new PIXI.TextStyle({
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  fontSize: 28,
  fontWeight: 'bold',
  fill: '#ffdd44',
  dropShadow: true,
  dropShadowColor: '#000',
  dropShadowBlur: 6,
  dropShadowDistance: 0,
});

const SUB_HEADING_STYLE = new PIXI.TextStyle({
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  fontSize: 32,
  fontWeight: 'bold',
  fill: '#fff',
  stroke: '#000',
  strokeThickness: 4,
  dropShadow: true,
  dropShadowColor: '#000',
  dropShadowBlur: 8,
  dropShadowDistance: 0,
});

const CREDITS_STYLE = new PIXI.TextStyle({
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  fontSize: 20,
  fontWeight: 'normal',
  fill: '#ffffff',
  stroke: '#000',
  strokeThickness: 4,
  dropShadow: true,
  dropShadowColor: '#000',
  dropShadowBlur: 6,
  dropShadowDistance: 0,
  align: 'center',
  wordWrap: true,
  wordWrapWidth: 400,
});

const LEADERBOARD_STYLE = new PIXI.TextStyle({
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  fontSize: 18,
  fontWeight: 'normal',
  fill: '#c8d8e8',
  dropShadow: true,
  dropShadowColor: '#000',
  dropShadowBlur: 4,
  dropShadowDistance: 0,
  align: 'left',
});

const LEADERBOARD_HIGHLIGHT_STYLE = new PIXI.TextStyle({
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  fontSize: 18,
  fontWeight: 'bold',
  fill: '#ffdd44',
  dropShadow: true,
  dropShadowColor: '#000',
  dropShadowBlur: 4,
  dropShadowDistance: 0,
  align: 'left',
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

// ===== Main Menu Items =====
const MAIN_MENU = [
  { label: '🎮  Новая игра', action: 'start' },
  { label: '🏆  Лидерборд', action: 'leaderboard' },
  { label: '⚙️  Настройки', action: 'settings' },
  { label: '✍️  Авторы', action: 'authors' },
  { label: '🚪  Выход', action: 'exit' },
];

// ===== Mock Leaderboard =====
const MOCK_LEADERBOARD = [
  { name: 'Captain_Nemo', score: '12:34' },
  { name: 'LightKeeper', score: '10:22' },
  { name: 'SeaWolf', score: '09:15' },
  { name: 'OceanBreeze', score: '08:47' },
  { name: 'StormChaser', score: '07:33' },
  { name: 'WaveRider', score: '06:58' },
  { name: 'AnchorMan', score: '05:44' },
  { name: 'SaltySailor', score: '05:12' },
  { name: 'CoralHunter', score: '04:30' },
  { name: 'TideWatcher', score: '03:15' },
];

// ===== Credits Text =====
const CREDITS_TEXT = `
🎨 Художники

Volodymyr Myshko
AI-generated assets


💻 Программисты

Volodymyr Myshko
GitHub Copilot


🎲 Геймдизайн

Volodymyr Myshko


🎵 Ресурсы

PixiJS — 2D rendering engine
Firebase — analytics & backend
Freesound.org — sound effects
AI — sprite generation


🌊 Спасибо за игру! 🌊
`;

// ===== Helpers =====
function createMenuBtn(label, textures, isSelected) {
  const container = new PIXI.Container();

  const btnSpr = new PIXI.Sprite(textures.buttonSpace);
  btnSpr.anchor.set(0.5);
  btnSpr.scale.set(0.35);
  container.addChild(btnSpr);

  const txt = new PIXI.Text(
    label,
    isSelected ? MENU_ITEM_SELECTED_STYLE : MENU_ITEM_STYLE,
  );
  txt.anchor.set(0.5);
  txt.y = -10;
  container.addChild(txt);

  container.interactive = true;
  container.buttonMode = true;
  container.cursor = 'pointer';
  container.hitArea = new PIXI.Rectangle(
    -btnSpr.width / 2,
    -btnSpr.height / 2,
    btnSpr.width,
    btnSpr.height,
  );

  return container;
}

function updateSelection() {
  for (let i = 0; i < menuItems.length; i++) {
    const item = menuItems[i];
    const txt = item.children[1]; // text is second child
    const btnSpr = item.children[0]; // sprite is first

    if (i === selectedIndex) {
      txt.style = MENU_ITEM_SELECTED_STYLE;
      btnSpr.tint = 0xffffff;
      item.scale.set(1.05);
    } else {
      txt.style = MENU_ITEM_STYLE;
      btnSpr.tint = 0xaabbcc;
      item.scale.set(1.0);
    }
  }
}

function coverBackground(sprite) {
  if (!sprite || !sprite.texture || !sprite.texture.baseTexture) return;
  const tex = sprite.texture;
  const tw = tex.width;
  const th = tex.height;
  // Cover: scale to fill, no gaps
  const scale = Math.max(S.gameW / tw, S.gameH / th);
  sprite.width = tw * scale;
  sprite.height = th * scale;
  sprite.position.set(S.gameW / 2, S.gameH / 2);
}

// ===== Build Menu =====
export async function buildMenu(app, startGameCb) {
  onStartGame = startGameCb;

  menuContainer = new PIXI.Container();
  menuContainer.visible = true;
  app.stage.addChild(menuContainer);

  // Background
  const bgTex = await PIXI.Assets.load(MENU_BG_FILE);
  menuBg = new PIXI.Sprite(bgTex);
  menuBg.anchor.set(0.5);
  coverBackground(menuBg);
  menuContainer.addChild(menuBg);

  // Dim overlay
  const dim = new PIXI.Graphics();
  dim.beginFill(0x000000, 0.4);
  dim.drawRect(0, 0, S.gameW, S.gameH);
  dim.endFill();
  menuContainer.addChild(dim);
  menuContainer._dim = dim;

  // Title
  const title = new PIXI.Text('🔦 LIGHTHOUSE', TITLE_STYLE);
  title.anchor.set(0.5);
  title.position.set(S.gameW / 2, S.gameH * 0.18);
  menuContainer.addChild(title);
  menuContainer._title = title;

  // Menu buttons
  const startY = S.gameH * 0.35;
  const spacing = 95;

  for (let i = 0; i < MAIN_MENU.length; i++) {
    const item = createMenuBtn(
      MAIN_MENU[i].label,
      S.textures,
      i === selectedIndex,
    );
    item.position.set(S.gameW / 2, startY + i * spacing);
    menuContainer.addChild(item);
    menuItems.push(item);

    // Mouse/touch
    const idx = i;
    item.on('pointerover', () => {
      selectedIndex = idx;
      updateSelection();
    });
    item.on('pointerdown', () => {
      selectedIndex = idx;
      updateSelection();
      activateMenuItem();
    });
  }

  updateSelection();

  // Hint
  const hint = new PIXI.Text(
    '↑↓ / W S — навигация  •  Enter / E — выбор  •  Q — назад',
    HINT_STYLE,
  );
  hint.anchor.set(0.5);
  hint.position.set(S.gameW / 2, S.gameH - 30);
  menuContainer.addChild(hint);
  menuContainer._hint = hint;

  currentScreen = 'main';

  // Keyboard
  window.addEventListener('keydown', handleMenuKey);
}

function handleMenuKey(e) {
  if (!menuContainer || !menuContainer.visible) return;

  if (currentScreen === 'main') {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      selectedIndex = (selectedIndex - 1 + MAIN_MENU.length) % MAIN_MENU.length;
      updateSelection();
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      selectedIndex = (selectedIndex + 1) % MAIN_MENU.length;
      updateSelection();
    } else if (e.code === 'Enter' || e.code === 'KeyE') {
      activateMenuItem();
    }
  } else {
    // Sub-screens: Q or Escape go back
    if (e.code === 'KeyQ' || e.code === 'Escape') {
      showMainMenu();
    }
  }
}

function activateMenuItem() {
  const action = MAIN_MENU[selectedIndex].action;
  switch (action) {
    case 'start':
      hideMenu();
      if (onStartGame) onStartGame();
      break;
    case 'leaderboard':
      showLeaderboard();
      break;
    case 'settings':
      showSettings();
      break;
    case 'authors':
      showAuthors();
      break;
    case 'exit':
      // Reload page as "exit"
      window.location.reload();
      break;
  }
}

// ===== Sub-screen helpers =====
function clearSubScreen() {
  if (menuContainer._subScreen) {
    menuContainer.removeChild(menuContainer._subScreen);
    menuContainer._subScreen.destroy({ children: true });
    menuContainer._subScreen = null;
  }
  if (creditsAnimId) {
    cancelAnimationFrame(creditsAnimId);
    creditsAnimId = null;
  }
}

function hideMainItems() {
  for (const item of menuItems) item.visible = false;
  if (menuContainer._title) menuContainer._title.visible = false;
}

function showMainItems() {
  for (const item of menuItems) item.visible = true;
  if (menuContainer._title) menuContainer._title.visible = true;
  // Restore dim
  if (menuContainer._dim) menuContainer._dim.visible = true;
}

function showMainMenu() {
  clearSubScreen();
  showMainItems();
  currentScreen = 'main';
}

function createBackHint() {
  const hint = new PIXI.Text('Q / Escape — назад', HINT_STYLE);
  hint.anchor.set(0.5);
  hint.position.set(S.gameW / 2, S.gameH - 30);
  return hint;
}

// ===== Leaderboard =====
function showLeaderboard() {
  hideMainItems();
  clearSubScreen();
  currentScreen = 'leaderboard';

  const sub = new PIXI.Container();

  const heading = new PIXI.Text('🏆 Лидерборд', SUB_HEADING_STYLE);
  heading.anchor.set(0.5);
  heading.position.set(S.gameW / 2, S.gameH * 0.12);
  sub.addChild(heading);

  const startY = S.gameH * 0.24;
  for (let i = 0; i < MOCK_LEADERBOARD.length; i++) {
    const entry = MOCK_LEADERBOARD[i];
    const style = i < 3 ? LEADERBOARD_HIGHLIGHT_STYLE : LEADERBOARD_STYLE;
    const medal =
      i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const txt = new PIXI.Text(
      `${medal}  ${entry.name}  —  ${entry.score}`,
      style,
    );
    txt.anchor.set(0.5);
    txt.position.set(S.gameW / 2, startY + i * 36);
    sub.addChild(txt);
  }

  sub.addChild(createBackHint());
  menuContainer.addChild(sub);
  menuContainer._subScreen = sub;
}

// ===== Settings =====
function showSettings() {
  hideMainItems();
  clearSubScreen();
  currentScreen = 'settings';

  const sub = new PIXI.Container();

  const heading = new PIXI.Text('⚙️ Настройки', SUB_HEADING_STYLE);
  heading.anchor.set(0.5);
  heading.position.set(S.gameW / 2, S.gameH * 0.12);
  sub.addChild(heading);

  const cx = S.gameW / 2;
  let y = S.gameH * 0.3;

  // Music volume
  y = addSlider(sub, '🎵 Музыка', cx, y, 0.5, (val) => {
    if (S.bgMusic) S.bgMusic.volume = val;
  });

  // SFX volume
  y = addSlider(sub, '🔊 Звуки', cx, y + 20, 0.5, () => {
    // placeholder — no SFX manager yet
  });

  // Language
  y += 40;
  const langLabel = new PIXI.Text('🌐 Язык', MENU_ITEM_STYLE);
  langLabel.anchor.set(0.5);
  langLabel.position.set(cx, y);
  sub.addChild(langLabel);

  y += 40;
  const langs = ['Русский', 'English'];
  let langIdx = 0;

  const langTxt = new PIXI.Text(
    `◀  ${langs[langIdx]}  ▶`,
    MENU_ITEM_SELECTED_STYLE,
  );
  langTxt.anchor.set(0.5);
  langTxt.position.set(cx, y);
  langTxt.interactive = true;
  langTxt.buttonMode = true;
  langTxt.cursor = 'pointer';
  langTxt.on('pointerdown', () => {
    langIdx = (langIdx + 1) % langs.length;
    langTxt.text = `◀  ${langs[langIdx]}  ▶`;
  });
  sub.addChild(langTxt);

  sub.addChild(createBackHint());
  menuContainer.addChild(sub);
  menuContainer._subScreen = sub;
}

function addSlider(parent, label, cx, y, initial, onChange) {
  const lbl = new PIXI.Text(label, MENU_ITEM_STYLE);
  lbl.anchor.set(0.5);
  lbl.position.set(cx, y);
  parent.addChild(lbl);

  y += 36;
  const sliderW = 200;
  const sliderH = 8;
  const knobR = 12;

  // Track background
  const track = new PIXI.Graphics();
  track.beginFill(0x334455, 0.8);
  track.drawRoundedRect(cx - sliderW / 2, y - sliderH / 2, sliderW, sliderH, 4);
  track.endFill();
  parent.addChild(track);

  // Fill
  const fill = new PIXI.Graphics();
  parent.addChild(fill);

  // Knob
  const knob = new PIXI.Graphics();
  knob.beginFill(0xffdd44, 1);
  knob.drawCircle(0, 0, knobR);
  knob.endFill();
  knob.position.set(cx - sliderW / 2 + initial * sliderW, y);
  knob.interactive = true;
  knob.buttonMode = true;
  knob.cursor = 'pointer';
  parent.addChild(knob);

  // Value text
  const valTxt = new PIXI.Text(`${Math.round(initial * 100)}%`, HINT_STYLE);
  valTxt.anchor.set(0, 0.5);
  valTxt.position.set(cx + sliderW / 2 + 14, y);
  parent.addChild(valTxt);

  function drawFill(val) {
    fill.clear();
    fill.beginFill(0x5599cc, 0.9);
    fill.drawRoundedRect(
      cx - sliderW / 2,
      y - sliderH / 2,
      val * sliderW,
      sliderH,
      4,
    );
    fill.endFill();
  }
  drawFill(initial);

  let dragging = false;

  function updateSlider(px) {
    const val = Math.max(0, Math.min(1, (px - (cx - sliderW / 2)) / sliderW));
    knob.x = cx - sliderW / 2 + val * sliderW;
    drawFill(val);
    valTxt.text = `${Math.round(val * 100)}%`;
    onChange(val);
  }

  knob.on('pointerdown', () => {
    dragging = true;
  });

  // Use stage-level events for drag
  S.app.stage.on('pointermove', (e) => {
    if (!dragging) return;
    const pos = e.data.global;
    updateSlider(pos.x);
  });

  const stopDrag = () => {
    dragging = false;
  };
  S.app.stage.on('pointerup', stopDrag);
  S.app.stage.on('pointerupoutside', stopDrag);

  // Click on track
  track.interactive = true;
  track.buttonMode = true;
  track.cursor = 'pointer';
  track.on('pointerdown', (e) => {
    const pos = e.data.global;
    updateSlider(pos.x);
  });

  return y + 10;
}

// ===== Authors (scrolling credits) =====
async function showAuthors() {
  hideMainItems();
  clearSubScreen();
  currentScreen = 'authors';

  const sub = new PIXI.Container();

  // Background image
  const creditsBgTex = await PIXI.Assets.load(CREDITS_BG_FILE);
  const bgSprite = new PIXI.Sprite(creditsBgTex);
  bgSprite.anchor.set(0.5);
  coverBackground(bgSprite);
  sub.addChild(bgSprite);

  // Dim over background
  const dim = new PIXI.Graphics();
  dim.beginFill(0x000000, 0.5);
  dim.drawRect(0, 0, S.gameW, S.gameH);
  dim.endFill();
  sub.addChild(dim);

  // Credits text — starts below screen, scrolls up
  creditsContainer = new PIXI.Container();
  const creditsTxt = new PIXI.Text(CREDITS_TEXT, CREDITS_STYLE);
  creditsTxt.anchor.set(0.5, 0);
  creditsTxt.position.set(S.gameW / 2, 0);
  creditsContainer.addChild(creditsTxt);
  creditsContainer.y = S.gameH;
  sub.addChild(creditsContainer);

  sub.addChild(createBackHint());
  menuContainer.addChild(sub);
  menuContainer._subScreen = sub;

  // Animate credits scrolling
  const speed = 0.8; // px per frame
  const endY = -creditsTxt.height - 40;
  const animateCredits = () => {
    creditsContainer.y -= speed;
    if (creditsContainer.y < endY) {
      creditsContainer.y = S.gameH; // loop
    }
    creditsAnimId = requestAnimationFrame(animateCredits);
  };
  creditsAnimId = requestAnimationFrame(animateCredits);
}

// ===== Show / Hide =====
function hideMenu() {
  if (menuContainer) menuContainer.visible = false;
  clearSubScreen();
  currentScreen = null;
}

export function showMenu() {
  if (!menuContainer) return;
  menuContainer.visible = true;
  selectedIndex = 0;
  showMainMenu();
  currentScreen = 'main';
  repositionMenu();
}

export function isMenuVisible() {
  return menuContainer && menuContainer.visible;
}

export function repositionMenu() {
  if (!menuContainer) return;

  // Background
  if (menuBg) coverBackground(menuBg);

  // Dim
  if (menuContainer._dim) {
    menuContainer._dim.clear();
    menuContainer._dim.beginFill(0x000000, 0.4);
    menuContainer._dim.drawRect(0, 0, S.gameW, S.gameH);
    menuContainer._dim.endFill();
  }

  // Title
  if (menuContainer._title) {
    menuContainer._title.position.set(S.gameW / 2, S.gameH * 0.18);
  }

  // Buttons
  const startY = S.gameH * 0.35;
  const spacing = 95;
  for (let i = 0; i < menuItems.length; i++) {
    menuItems[i].position.set(S.gameW / 2, startY + i * spacing);
  }

  // Hint
  if (menuContainer._hint) {
    menuContainer._hint.position.set(S.gameW / 2, S.gameH - 30);
  }
}
