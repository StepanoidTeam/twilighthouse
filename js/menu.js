import { PIXI, UI_STYLE, C, scaleToWidth } from './config.js';
import { playSound, WAVES_VOLUME } from './sound.js';
import { isConfirmKey, isBackKey } from './input.js';
import S from './state.js';
import { fetchTopLeaderboard, formatSurvivalTime } from './leaderboard.js';
import { showAuthWidget, hideAuthWidget } from './auth-ui.js';
import { currentUser, isSignedInReal } from './auth.js';
import { t, getLanguage, setLanguage, onLanguageChange } from './i18n.js';

// ===== Menu State =====
let menuContainer = null;
let menuBg = null;
let menuItems = [];
let selectedIndex = 0;
let currentScreen = 'main'; // 'main' | 'leaderboard' | 'settings' | 'authors' | null (game)
let creditsContainer = null;
let creditsAnimId = null;
let onStartGame = null;
let backBtnEl = null;

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
  fontSize: 22,
  fontWeight: 'bold',
  fill: '#c8d8e8',
  dropShadow: true,
  dropShadowColor: '#000',
  dropShadowBlur: 4,
  dropShadowDistance: 0,
});

const MENU_ITEM_SELECTED_STYLE = new PIXI.TextStyle({
  fontFamily: 'Segoe UI, system-ui, sans-serif',
  fontSize: 24,
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
const MAIN_MENU_ACTIONS = [
  { key: 'menu.newGame', action: 'start' },
  { key: 'menu.leaderboard', action: 'leaderboard' },
  { key: 'menu.settings', action: 'settings' },
  { key: 'menu.authors', action: 'authors' },
  { key: 'menu.tutorial', action: 'tutorial' },
];

function getMenuLabels() {
  return MAIN_MENU_ACTIONS.map((item) => ({
    label: t(item.key),
    action: item.action,
  }));
}

// ===== Credits Text =====
function getCreditsText() {
  return t('credits.text');
}

// ===== Sound Helpers =====
function playMenuSelect() {
  playSound('audio/menu-select.mp3', 0.15);
}

function playMenuClick() {
  playSound('audio/button-click.mp3', 0.2);
}

// ===== Helpers =====
function createMenuBtn(label, textures, isSelected) {
  const container = new PIXI.Container();

  const btnSpr = new PIXI.Sprite(textures.buttonSpace);
  btnSpr.anchor.set(0.5);
  scaleToWidth(btnSpr, 320);
  container.addChild(btnSpr);

  const txt = new PIXI.Text(
    label,
    isSelected ? MENU_ITEM_SELECTED_STYLE : MENU_ITEM_STYLE,
  );
  txt.anchor.set(0.5);
  txt.y = -20; // чуть больше отступ для крупных букв
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
  const startY = S.gameH * 0.32;
  const spacing = 110;

  const labels = getMenuLabels();
  for (let i = 0; i < labels.length; i++) {
    const item = createMenuBtn(
      labels[i].label,
      S.textures,
      i === selectedIndex,
    );
    item.position.set(S.gameW / 2, startY + i * spacing);
    menuContainer.addChild(item);
    menuItems.push(item);

    // Mouse/touch
    const idx = i;
    item.on('pointerover', () => {
      if (selectedIndex !== idx) {
        selectedIndex = idx;
        updateSelection();
        playMenuSelect();
      }
    });
    item.on('pointerdown', () => {
      selectedIndex = idx;
      updateSelection();
      playMenuClick();
      activateMenuItem();
    });
  }

  updateSelection();

  // Hint
  const hint = new PIXI.Text(t('hint.main'), HINT_STYLE);
  hint.anchor.set(0.5);
  hint.position.set(S.gameW / 2, S.gameH - 30);
  menuContainer.addChild(hint);
  menuContainer._hint = hint;

  currentScreen = 'main';

  // Account widget (DOM overlay, top-right)
  showAuthWidget();

  // Keyboard
  window.addEventListener('keydown', handleMenuKey);

  // Re-render current screen and static texts on language change
  onLanguageChange(() => {
    relabelMainMenu();
    if (menuContainer && menuContainer._hint) {
      menuContainer._hint.text = t('hint.main');
    }
    if (backBtnEl) {
      const lbl = backBtnEl.querySelector('.back-btn-label');
      if (lbl) lbl.textContent = t('btn.back');
    }
    if (currentScreen === 'settings') showSettings();
    else if (currentScreen === 'leaderboard') showLeaderboard();
    else if (currentScreen === 'authors') showAuthors();
  });
}

function relabelMainMenu() {
  const labels = getMenuLabels();
  for (let i = 0; i < menuItems.length && i < labels.length; i++) {
    const txt = menuItems[i].children[1];
    if (txt) txt.text = labels[i].label;
  }
}

function handleMenuKey(e) {
  if (!menuContainer || !menuContainer.visible) return;

  // Don't intercept keys while typing in the auth modal or other inputs
  const ae = document.activeElement;
  if (
    ae &&
    (ae.tagName === 'INPUT' ||
      ae.tagName === 'TEXTAREA' ||
      ae.isContentEditable ||
      ae.closest('.auth-modal-backdrop'))
  ) {
    return;
  }

  if (currentScreen === 'main') {
    const n = MAIN_MENU_ACTIONS.length;
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      selectedIndex = (selectedIndex - 1 + n) % n;
      updateSelection();
      playMenuSelect();
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      selectedIndex = (selectedIndex + 1) % n;
      updateSelection();
      playMenuSelect();
    } else if (isConfirmKey(e.code)) {
      playMenuClick();
      activateMenuItem();
    }
  } else {
    // Sub-screens: Q or Escape go back
    if (isBackKey(e.code)) {
      playMenuClick();
      showMainMenu();
    }
  }
}

function activateMenuItem() {
  const action = MAIN_MENU_ACTIONS[selectedIndex].action;
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
    case 'tutorial':
      showTutorial();
      break;
  }
}

// ===== Tutorial (replay intro comics) =====
function showTutorial() {
  if (!menuContainer) return;
  // Hide menu UI while the intro plays — it renders over the whole screen.
  menuContainer.visible = false;
  hideBackBtn();
  hideAuthWidget();
  currentScreen = null;

  showIntro(S.app).then(() => {
    if (!menuContainer) return;
    menuContainer.visible = true;
    showMainMenu();
    showAuthWidget();
  });
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
  if (menuContainer._hint) menuContainer._hint.visible = false;
}

function showMainItems() {
  for (const item of menuItems) item.visible = true;
  if (menuContainer._title) menuContainer._title.visible = true;
  if (menuContainer._hint) menuContainer._hint.visible = true;
  // Restore dim
  if (menuContainer._dim) menuContainer._dim.visible = true;
}

function showMainMenu() {
  clearSubScreen();
  showMainItems();
  hideBackBtn();
  currentScreen = 'main';
}

function createBackHint() {
  const hint = new PIXI.Text(t('hint.back'), HINT_STYLE);
  hint.anchor.set(0.5);
  hint.position.set(S.gameW / 2, S.gameH - 30);
  return hint;
}

// ===== HTML Back Button (для тач-устройств) =====
function ensureBackBtn() {
  if (backBtnEl) return backBtnEl;
  backBtnEl = document.createElement('button');
  backBtnEl.type = 'button';
  backBtnEl.className = 'back-btn';
  backBtnEl.innerHTML = `<span class="back-btn-arrow">←</span><span class="back-btn-label">${t('btn.back')}</span>`;
  backBtnEl.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    playMenuClick();
    showMainMenu();
  });
  document.body.appendChild(backBtnEl);
  return backBtnEl;
}

function showBackBtn() {
  const el = ensureBackBtn();
  const lbl = el.querySelector('.back-btn-label');
  if (lbl) lbl.textContent = t('btn.back');
  el.classList.add('is-visible');
}

function hideBackBtn() {
  if (backBtnEl) backBtnEl.classList.remove('is-visible');
}

// ===== Leaderboard =====
async function showLeaderboard() {
  hideMainItems();
  clearSubScreen();
  showBackBtn();
  currentScreen = 'leaderboard';

  const sub = new PIXI.Container();

  const heading = new PIXI.Text(t('leaderboard.title'), SUB_HEADING_STYLE);
  heading.anchor.set(0.5);
  heading.position.set(S.gameW / 2, S.gameH * 0.12);
  sub.addChild(heading);

  const subtitle = new PIXI.Text(t('leaderboard.subtitle'), HINT_STYLE);
  subtitle.anchor.set(0.5);
  subtitle.position.set(S.gameW / 2, S.gameH * 0.18);
  sub.addChild(subtitle);

  // Loading placeholder
  const loading = new PIXI.Text(t('leaderboard.loading'), LEADERBOARD_STYLE);
  loading.anchor.set(0.5);
  loading.position.set(S.gameW / 2, S.gameH * 0.5);
  sub.addChild(loading);

  sub.addChild(createBackHint());
  menuContainer.addChild(sub);
  menuContainer._subScreen = sub;

  // Fetch and render
  let rows = [];
  let error = null;
  try {
    rows = await fetchTopLeaderboard(10);
  } catch (e) {
    console.warn('Failed to load leaderboard', e);
    error = e;
  }

  // User navigated away while loading
  if (currentScreen !== 'leaderboard' || menuContainer._subScreen !== sub) {
    return;
  }

  sub.removeChild(loading);
  loading.destroy();

  if (error) {
    const err = new PIXI.Text(t('leaderboard.loadError'), LEADERBOARD_STYLE);
    err.anchor.set(0.5);
    err.position.set(S.gameW / 2, S.gameH * 0.5);
    sub.addChild(err);
    return;
  }

  if (rows.length === 0) {
    const empty = new PIXI.Text(t('leaderboard.empty'), LEADERBOARD_STYLE);
    empty.anchor.set(0.5);
    empty.position.set(S.gameW / 2, S.gameH * 0.5);
    sub.addChild(empty);
    return;
  }

  const myUid = currentUser ? currentUser.uid : null;
  const startY = S.gameH * 0.26;
  for (let i = 0; i < rows.length; i++) {
    const entry = rows[i];
    const isMe = myUid && entry.uid === myUid;
    const style =
      i < 3 || isMe ? LEADERBOARD_HIGHLIGHT_STYLE : LEADERBOARD_STYLE;
    const medal =
      i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const label = isMe
      ? `${entry.displayName}  ${t('leaderboard.you')}`
      : entry.displayName;
    const txt = new PIXI.Text(
      `${medal}  ${label}  —  ${formatSurvivalTime(entry.bestTimeMs)}`,
      style,
    );
    txt.anchor.set(0.5);
    txt.position.set(S.gameW / 2, startY + i * 36);
    sub.addChild(txt);
  }

  if (!isSignedInReal(currentUser)) {
    const note = new PIXI.Text(t('leaderboard.signInPrompt'), HINT_STYLE);
    note.anchor.set(0.5);
    note.position.set(S.gameW / 2, S.gameH - 60);
    sub.addChild(note);
  }
}

// ===== Settings =====
function showSettings() {
  hideMainItems();
  clearSubScreen();
  showBackBtn();
  currentScreen = 'settings';

  const sub = new PIXI.Container();

  const heading = new PIXI.Text(t('settings.title'), SUB_HEADING_STYLE);
  heading.anchor.set(0.5);
  heading.position.set(S.gameW / 2, S.gameH * 0.12);
  sub.addChild(heading);

  const cx = S.gameW / 2;
  let y = S.gameH * 0.26;

  // Language (first — so it's easy to reach)
  const langLabel = new PIXI.Text(t('settings.language'), MENU_ITEM_STYLE);
  langLabel.anchor.set(0.5);
  langLabel.position.set(cx, y);
  sub.addChild(langLabel);

  y += 40;
  const langs = [
    { code: 'en', label: t('lang.english') },
    { code: 'ru', label: t('lang.russian') },
  ];
  let langIdx = Math.max(
    0,
    langs.findIndex((l) => l.code === getLanguage()),
  );

  const langTxt = new PIXI.Text(
    `◀  ${langs[langIdx].label}  ▶`,
    MENU_ITEM_SELECTED_STYLE,
  );
  langTxt.anchor.set(0.5);
  langTxt.position.set(cx, y);
  langTxt.interactive = true;
  langTxt.buttonMode = true;
  langTxt.cursor = 'pointer';
  langTxt.on('pointerdown', () => {
    playMenuClick();
    langIdx = (langIdx + 1) % langs.length;
    // setLanguage triggers onLanguageChange → rerenders this screen
    setLanguage(langs[langIdx].code);
  });
  sub.addChild(langTxt);

  y += 60;

  // SFX volume
  const sfxInit = S.sfxVolume != null ? S.sfxVolume : 1.0;
  y = addSlider(sub, t('settings.sfx'), cx, y, sfxInit, (val) => {
    S.sfxVolume = val;
    if (S.wavesSound)
      S.wavesSound.volume = Math.max(0, Math.min(1, WAVES_VOLUME * val));
    try {
      localStorage.setItem('lighthouse_sfx_vol', String(val));
    } catch (_) {}
  });

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
    playMenuClick();
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
    playMenuClick();
    const pos = e.data.global;
    updateSlider(pos.x);
  });

  return y + 10;
}

// ===== Authors (scrolling credits) =====
async function showAuthors() {
  hideMainItems();
  clearSubScreen();
  showBackBtn();
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
  const creditsTxt = new PIXI.Text(getCreditsText(), CREDITS_STYLE);
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
  hideBackBtn();
  currentScreen = null;
  hideAuthWidget();
}

export function showMenu() {
  if (!menuContainer) return;
  menuContainer.visible = true;
  selectedIndex = 0;
  showMainMenu();
  currentScreen = 'main';
  repositionMenu();
  showAuthWidget();
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
  const startY = S.gameH * 0.32;
  const spacing = 110;
  for (let i = 0; i < menuItems.length; i++) {
    menuItems[i].position.set(S.gameW / 2, startY + i * spacing);
  }

  // Hint
  if (menuContainer._hint) {
    menuContainer._hint.position.set(S.gameW / 2, S.gameH - 30);
  }
}
