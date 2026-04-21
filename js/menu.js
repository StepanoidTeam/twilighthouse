import { playSound, WAVES_VOLUME, MUSIC_VOLUME } from './sound.js';
import { isConfirmKey, isBackKey } from './input.js';
import S from './state.js';
import { fetchTopLeaderboard, formatSurvivalTime } from './leaderboard.js';
import { showAuthWidget, hideAuthWidget } from './auth-ui.js';
import { currentUser, isSignedInReal, updateDisplayName } from './auth.js';
import { showIntro } from './intro.js';
import { t, getLanguage, setLanguage, onLanguageChange } from './i18n.js';

// ===== Menu State =====
let menuApp = null;
let $menuRoot = null;
let $menuBg = null;
let $menuTitle = null; // unused — logo is now a static <img>
let $menuMain = null;
let $menuSub = null;
let $menuHint = null;
let $$menuItems = [];
let selectedIndex = 0;
let currentScreen = 'main'; // 'main' | 'leaderboard' | 'settings' | 'authors' | null (game)
let $creditsScroll = null;
let onStartGame = null;
let backBtnEl = null;
let keyHandlerBound = false;
let i18nBound = false;

// ===== Assets =====
const MENU_BG_FILE = 'sprites/mainmenu.PNG';
const CREDITS_BG_FILE = 'sprites/wasted/police.png';

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

// ===== DOM Helpers =====
function initMenu() {
  $menuRoot = $menuOverlay;
  $menuBg = $menuRoot.querySelector('.menu-overlay-bg');
  $menuMain = $menuRoot.querySelector('.menu-main');
  $menuSub = $menuRoot.querySelector('.menu-sub');
  $menuHint = $menuRoot.querySelector('.menu-hint');

  if ($menuBg) {
    $menuBg.style.backgroundImage = `url("${MENU_BG_FILE}")`;
  }

  initMenuButtons();
  updateSelection();
}

function initMenuButtons() {
  $$menuItems = Array.from($menuMain.querySelectorAll('.menu-main-btn'));
  const labels = getMenuLabels();
  for (let i = 0; i < $$menuItems.length; i++) {
    const $button = $$menuItems[i];
    const $label = $button.querySelector('.menu-main-btn-label');
    if ($label) $label.textContent = labels[i]?.label ?? '';
    const idx = i;
    $button.addEventListener('pointerover', () => {
      if (selectedIndex === idx) return;
      selectedIndex = idx;
      updateSelection();
      playMenuSelect();
    });
    $button.addEventListener('click', () => {
      selectedIndex = idx;
      updateSelection();
      playMenuClick();
      activateMenuItem();
    });
  }
}

function renderMainMenuButtons() {
  const labels = getMenuLabels();
  for (let i = 0; i < $$menuItems.length; i++) {
    const $label = $$menuItems[i].querySelector('.menu-main-btn-label');
    if ($label) $label.textContent = labels[i]?.label ?? '';
  }
}

function updateSelection() {
  for (let i = 0; i < $$menuItems.length; i++) {
    const $button = $$menuItems[i];
    const isSelected = i === selectedIndex;
    $button.classList.toggle('is-selected', isSelected);
    $button.setAttribute('aria-current', isSelected ? 'true' : 'false');
  }
}

function setHint(text) {
  if ($menuHint) $menuHint.textContent = text;
}

function clearSubScreen() {
  if (!$menuSub) return;

  stopCreditsAnimation();
  $menuSub.innerHTML = '';
  $menuSub.hidden = true;
  $menuSub.className = 'menu-sub';
}

function hideMainItems() {
  if ($menuMain) $menuMain.hidden = true;
  if ($menuHint) $menuHint.hidden = true;
}

function showMainItems() {
  if ($menuMain) $menuMain.hidden = false;
  if ($menuHint) $menuHint.hidden = false;
  setHint(t('hint.main'));
}

function buildBackHint() {
  const $hint = document.createElement('p');
  $hint.className = 'menu-sub-hint';
  $hint.textContent = t('hint.back');
  return $hint;
}

function buildScreenShell(title, subtitle = '') {
  clearSubScreen();
  if (!$menuSub) return null;

  $menuSub.hidden = false;
  $menuSub.className = 'menu-sub menu-screen';

  const $screen = document.createElement('div');
  $screen.className = 'menu-screen-shell';

  const $heading = document.createElement('h2');
  $heading.className = 'menu-screen-title';
  $heading.textContent = title;
  $screen.appendChild($heading);

  if (subtitle) {
    const $subtitle = document.createElement('p');
    $subtitle.className = 'menu-screen-subtitle';
    $subtitle.textContent = subtitle;
    $screen.appendChild($subtitle);
  }

  $menuSub.appendChild($screen);
  $menuSub.appendChild(buildBackHint());
  return $screen;
}

function showMainMenu() {
  clearSubScreen();
  showMainItems();
  hideBackBtn();
  currentScreen = 'main';
  updateSelection();
}

// ===== HTML Back Button =====
function initBackBtn() {
  backBtnEl = $backBtn;
  backBtnEl.querySelector('.back-btn-label').textContent = t('btn.back');
  backBtnEl.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    playMenuClick();
    showMainMenu();
  });
}

function showBackBtn() {
  const lbl = backBtnEl.querySelector('.back-btn-label');
  if (lbl) lbl.textContent = t('btn.back');
  backBtnEl.classList.add('is-visible');
}

function hideBackBtn() {
  backBtnEl.classList.remove('is-visible');
}

// ===== Lifecycle =====
export async function buildMenu(app, startGameCb) {
  menuApp = app;
  onStartGame = startGameCb;

  initMenu();
  initBackBtn();
  $menuRoot.hidden = false;
  showMainMenu();
  currentScreen = 'main';

  showAuthWidget();

  if (!keyHandlerBound) {
    window.addEventListener('keydown', handleMenuKey);
    keyHandlerBound = true;
  }

  if (!i18nBound) {
    onLanguageChange(() => {
      if (!$menuRoot) return;

      renderMainMenuButtons();
      updateSelection();
      setHint(currentScreen === 'main' ? t('hint.main') : t('hint.back'));

      if (backBtnEl) {
        const lbl = backBtnEl.querySelector('.back-btn-label');
        if (lbl) lbl.textContent = t('btn.back');
      }

      if (currentScreen === 'settings') showSettings();
      else if (currentScreen === 'leaderboard') showLeaderboard();
      else if (currentScreen === 'authors') showAuthors();
      else if (currentScreen === 'tutorial') showTutorial();
      else if (currentScreen === 'main') showMainMenu();
    });
    i18nBound = true;
  }

  repositionMenu();
}

function handleMenuKey(e) {
  if (!$menuRoot || $menuRoot.hidden) return;

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
  } else if (isBackKey(e.code)) {
    playMenuClick();
    showMainMenu();
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

// ===== Tutorial / How to Play =====
function showTutorial() {
  hideMainItems();
  showBackBtn();
  currentScreen = 'tutorial';
  setHint(t('hint.back'));

  const $screen = buildScreenShell(t('howtoplay.title'));
  if (!$screen) return;

  const $card = document.createElement('div');
  $card.className = 'menu-card menu-howtoplay';

  const items = t('howtoplay.items');
  for (const item of items) {
    const $row = document.createElement('div');
    $row.className = 'howtoplay-row';

    const $icon = document.createElement('span');
    $icon.className = 'howtoplay-icon';
    if (item.icon.includes('/')) {
      const $img = document.createElement('img');
      $img.src = item.icon;
      $img.alt = '';
      $img.setAttribute('aria-hidden', 'true');
      $icon.appendChild($img);
    } else {
      $icon.textContent = item.icon;
    }

    const $text = document.createElement('span');
    $text.className = 'howtoplay-text';
    $text.textContent = item.text;

    $row.appendChild($icon);
    $row.appendChild($text);
    $card.appendChild($row);
  }

  $screen.appendChild($card);
}

// ===== Leaderboard =====
async function showLeaderboard() {
  hideMainItems();
  showBackBtn();
  currentScreen = 'leaderboard';
  setHint(t('hint.back'));

  const $screen = buildScreenShell(
    t('leaderboard.title'),
    t('leaderboard.subtitle'),
  );
  if (!$screen) return;

  const $body = document.createElement('div');
  $body.className = 'menu-card menu-leaderboard';
  const $loading = document.createElement('p');
  $loading.className = 'menu-state-label';
  $loading.textContent = t('leaderboard.loading');
  $body.appendChild($loading);
  $screen.appendChild($body);

  let rows = [];
  let error = null;
  try {
    rows = await fetchTopLeaderboard(10);
  } catch (e) {
    console.warn('Failed to load leaderboard', e);
    error = e;
  }

  if (currentScreen !== 'leaderboard') return;

  $body.innerHTML = '';

  if (error) {
    const $error = document.createElement('p');
    $error.className = 'menu-state-label';
    $error.textContent = t('leaderboard.loadError');
    $body.appendChild($error);
    return;
  }

  if (rows.length === 0) {
    const $empty = document.createElement('p');
    $empty.className = 'menu-state-label';
    $empty.textContent = t('leaderboard.empty');
    $body.appendChild($empty);
    return;
  }

  const $list = document.createElement('div');
  $list.className = 'menu-leaderboard-list';
  const myUid = currentUser ? currentUser.uid : null;

  for (let i = 0; i < rows.length; i++) {
    const entry = rows[i];
    const isMe = myUid && entry.uid === myUid;
    const medal =
      i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    const label = isMe
      ? `${entry.displayName} ${t('leaderboard.you')}`
      : entry.displayName;

    const $row = document.createElement('div');
    $row.className = `menu-leaderboard-row${i < 3 || isMe ? ' is-highlight' : ''}`;

    const $rank = document.createElement('span');
    $rank.className = 'menu-leaderboard-rank';
    $rank.textContent = medal;

    const $name = document.createElement('span');
    $name.className = 'menu-leaderboard-name';
    $name.textContent = label;

    const $time = document.createElement('span');
    $time.className = 'menu-leaderboard-time';
    $time.textContent = formatSurvivalTime(entry.bestTimeMs);

    const $date = document.createElement('span');
    $date.className = 'menu-leaderboard-date';
    $date.textContent = entry.updatedAt
      ? entry.updatedAt.toLocaleString(undefined, {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '';

    $row.appendChild($rank);
    $row.appendChild($name);
    $row.appendChild($time);
    $row.appendChild($date);
    $list.appendChild($row);
  }

  $body.appendChild($list);
}

// ===== Settings =====
function showSettings() {
  hideMainItems();
  showBackBtn();
  currentScreen = 'settings';
  setHint(t('hint.back'));

  const $screen = buildScreenShell(t('settings.title'));
  if (!$screen) return;

  const $card = document.createElement('div');
  $card.className = 'menu-card menu-settings';

  const langs = [
    { code: 'en', label: t('lang.english') },
    { code: 'ru', label: t('lang.russian') },
  ];
  let langIdx = Math.max(
    0,
    langs.findIndex((lang) => lang.code === getLanguage()),
  );

  const $langRow = document.createElement('div');
  $langRow.className = 'menu-setting-row';

  const $langLabel = document.createElement('span');
  $langLabel.className = 'menu-setting-label';
  $langLabel.textContent = t('settings.language');
  $langRow.appendChild($langLabel);

  const $langBtn = document.createElement('button');
  $langBtn.type = 'button';
  $langBtn.className = 'menu-setting-toggle';
  $langBtn.textContent = `◀ ${langs[langIdx].label} ▶`;
  $langBtn.addEventListener('click', () => {
    playMenuClick();
    langIdx = (langIdx + 1) % langs.length;
    setLanguage(langs[langIdx].code);
  });
  $langRow.appendChild($langBtn);

  $card.appendChild($langRow);

  const $musicRow = document.createElement('div');
  $musicRow.className = 'menu-setting-row menu-setting-row--slider';

  const $musicLabel = document.createElement('span');
  $musicLabel.className = 'menu-setting-label';
  $musicLabel.textContent = t('settings.music');
  $musicRow.appendChild($musicLabel);

  const $musicControl = document.createElement('div');
  $musicControl.className = 'menu-slider';

  const initialMusic = S.musicVolume != null ? S.musicVolume : 0.5;
  const $musicInput = document.createElement('input');
  $musicInput.type = 'range';
  $musicInput.min = '0';
  $musicInput.max = '100';
  $musicInput.step = '1';
  $musicInput.value = String(Math.round(initialMusic * 100));

  const $musicValue = document.createElement('span');
  $musicValue.className = 'menu-slider-value';
  $musicValue.textContent = `${$musicInput.value}%`;

  $musicInput.addEventListener('input', () => {
    const val = Number($musicInput.value) / 100;
    $musicValue.textContent = `${$musicInput.value}%`;
    S.musicVolume = val;
    if (S.musicSound) {
      S.musicSound.volume = Math.max(0, Math.min(1, MUSIC_VOLUME * val));
    }
    try {
      localStorage.setItem('lighthouse_music_vol', String(val));
    } catch (_) {}
  });

  $musicControl.appendChild($musicInput);
  $musicControl.appendChild($musicValue);
  $musicRow.appendChild($musicControl);
  $card.appendChild($musicRow);

  const $sfxRow = document.createElement('div');
  $sfxRow.className = 'menu-setting-row menu-setting-row--slider';

  const $sfxLabel = document.createElement('span');
  $sfxLabel.className = 'menu-setting-label';
  $sfxLabel.textContent = t('settings.sfx');
  $sfxRow.appendChild($sfxLabel);

  const $sfxControl = document.createElement('div');
  $sfxControl.className = 'menu-slider';

  const initialSfx = S.sfxVolume != null ? S.sfxVolume : 1;
  const $sfxInput = document.createElement('input');
  $sfxInput.type = 'range';
  $sfxInput.min = '0';
  $sfxInput.max = '100';
  $sfxInput.step = '1';
  $sfxInput.value = String(Math.round(initialSfx * 100));

  const $sfxValue = document.createElement('span');
  $sfxValue.className = 'menu-slider-value';
  $sfxValue.textContent = `${$sfxInput.value}%`;

  $sfxInput.addEventListener('input', () => {
    const val = Number($sfxInput.value) / 100;
    $sfxValue.textContent = `${$sfxInput.value}%`;
    S.sfxVolume = val;
    if (S.wavesSound) {
      S.wavesSound.volume = Math.max(0, Math.min(1, WAVES_VOLUME * val));
    }
    try {
      localStorage.setItem('lighthouse_sfx_vol', String(val));
    } catch (_) {}
  });

  $sfxControl.appendChild($sfxInput);
  $sfxControl.appendChild($sfxValue);
  $sfxRow.appendChild($sfxControl);
  $card.appendChild($sfxRow);

  // ===== Display Name =====
  const $nameRow = document.createElement('div');
  $nameRow.className = 'menu-setting-row menu-setting-row--name';

  const $nameLabel = document.createElement('span');
  $nameLabel.className = 'menu-setting-label';
  $nameLabel.textContent = t('settings.displayName');
  $nameRow.appendChild($nameLabel);

  if (!currentUser) {
    const $note = document.createElement('span');
    $note.className = 'menu-setting-note';
    $note.textContent = t('settings.displayNameGuestNote');
    $nameRow.appendChild($note);
  } else {
    const isAnon = currentUser.isAnonymous === true;
    const currentName =
      (currentUser.displayName && currentUser.displayName.trim()) || '';

    const $nameGroup = document.createElement('div');
    $nameGroup.className = 'menu-setting-name-group';

    const $nameInput = document.createElement('input');
    $nameInput.type = 'text';
    $nameInput.className = 'menu-setting-name-input';
    $nameInput.maxLength = 30;
    $nameInput.value = currentName;
    $nameInput.placeholder = t('settings.displayNamePlaceholder');

    const $nameHint = document.createElement('p');
    $nameHint.className = 'menu-setting-name-hint';
    $nameHint.textContent = isAnon
      ? t('settings.displayNameAnon')
      : t('settings.displayNameEmail');

    const $nameActions = document.createElement('div');
    $nameActions.className = 'menu-setting-name-actions';

    const $nameSaveBtn = document.createElement('button');
    $nameSaveBtn.type = 'button';
    $nameSaveBtn.className = 'menu-setting-name-save';
    $nameSaveBtn.textContent = t('settings.displayNameSave');

    const $nameStatus = document.createElement('span');
    $nameStatus.className = 'menu-setting-name-status';

    $nameSaveBtn.addEventListener('click', async () => {
      const name = $nameInput.value.trim();
      if (!name) {
        $nameStatus.textContent = t('settings.displayNameEmpty');
        $nameStatus.className = 'menu-setting-name-status is-error';
        return;
      }
      if (name.length > 30) {
        $nameStatus.textContent = t('settings.displayNameTooLong');
        $nameStatus.className = 'menu-setting-name-status is-error';
        return;
      }
      $nameSaveBtn.disabled = true;
      $nameStatus.textContent = t('settings.displayNameSaving');
      $nameStatus.className = 'menu-setting-name-status';
      try {
        await updateDisplayName(name);
        $nameStatus.textContent = t('settings.displayNameSaved');
        $nameStatus.className = 'menu-setting-name-status is-success';
        console.log(`👤 Display name saved: ${name}`);
      } catch (e) {
        console.warn('updateDisplayName failed', e);
        $nameStatus.textContent = t('settings.displayNameError');
        $nameStatus.className = 'menu-setting-name-status is-error';
      } finally {
        $nameSaveBtn.disabled = false;
      }
    });

    $nameActions.appendChild($nameSaveBtn);
    $nameActions.appendChild($nameStatus);
    $nameGroup.appendChild($nameInput);
    $nameGroup.appendChild($nameHint);
    $nameGroup.appendChild($nameActions);
    $nameRow.appendChild($nameGroup);
  }

  $card.appendChild($nameRow);

  $screen.appendChild($card);
}

// ===== Authors =====
async function showAuthors() {
  hideMainItems();
  showBackBtn();
  currentScreen = 'authors';
  setHint(t('hint.back'));

  clearSubScreen();
  if (!$menuSub) return;

  $menuSub.hidden = false;
  $menuSub.className = 'menu-sub menu-authors';
  $menuSub.innerHTML = `
    <div class="menu-authors-bg"></div>
    <div class="menu-authors-dim"></div>
    <div class="menu-authors-scroll">
      <pre class="menu-authors-text"></pre>
    </div>
  `;
  $menuSub.appendChild(buildBackHint());

  const $authorsBg = $menuSub.querySelector('.menu-authors-bg');
  if ($authorsBg) {
    $authorsBg.style.backgroundImage = `url("${CREDITS_BG_FILE}")`;
  }

  $creditsScroll = $menuSub.querySelector('.menu-authors-scroll');
  const $creditsText = $menuSub.querySelector('.menu-authors-text');
  if ($creditsText) $creditsText.textContent = getCreditsText();
  startCreditsAnimation();
}

function startCreditsAnimation() {
  // CSS animation handles scrolling — nothing to do here
}

function stopCreditsAnimation() {
  $creditsScroll = null;
}

// ===== Show / Hide =====
function hideMenu() {
  if ($menuRoot) $menuRoot.hidden = true;
  clearSubScreen();
  hideBackBtn();
  currentScreen = null;
  hideAuthWidget();
}

export function showMenu() {
  if (!$menuRoot) return;
  $menuRoot.hidden = false;
  selectedIndex = 0;
  showMainMenu();
  currentScreen = 'main';
  repositionMenu();
  showAuthWidget();
}

export function isMenuVisible() {
  return Boolean($menuRoot && !$menuRoot.hidden);
}

export function repositionMenu() {
  if (!$menuRoot) return;

  $menuRoot.style.setProperty('--menu-vw', `${S.gameW}px`);
  $menuRoot.style.setProperty('--menu-vh', `${S.gameH}px`);
}
