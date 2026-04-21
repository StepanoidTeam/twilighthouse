import { playSound, WAVES_VOLUME, MUSIC_VOLUME } from './sound.js';
import { isConfirmKey, isBackKey } from './input.js';
import S from './state.js';
import { fetchTopLeaderboard, formatSurvivalTime } from './leaderboard.js';
import { showAuthWidget, hideAuthWidget } from './auth-ui.js';
import { currentUser, isSignedInReal, updateDisplayName } from './auth.js';
import { showIntro } from './intro.js';
import { t, getLanguage, setLanguage, onLanguageChange } from './i18n.js';
import { SPLASH_IMAGES } from './ui.js';

// ===== Menu State =====
let menuApp = null;
let $menuRoot = null;
let $creditsScroll = null;
let onStartGame = null;
let backBtnEl = null;
let $$menuItems = [];
let selectedIndex = 0;
let currentScreen = 'main'; // 'main' | 'leaderboard' | 'settings' | 'authors' | null (game)
let keyHandlerBound = false;
let i18nBound = false;

// ===== Credits Slideshow =====
let creditsInterval = null;
let creditsIndex = 0;
const creditsImages = Object.values(SPLASH_IMAGES);

// ===== Assets =====
const MENU_BG_FILE = 'sprites/mainmenu.PNG';

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
  if ($menuAuthors) $menuAuthors.hidden = true;
  if ($menuTutorial) $menuTutorial.hidden = true;
  if ($menuSettings) $menuSettings.hidden = true;
  if ($menuLeaderboard) $menuLeaderboard.hidden = true;
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

  clearSubScreen();
  if (!$menuTutorial) return;

  $menuTutorial.hidden = false;

  const $title = $menuTutorial.querySelector('.menu-screen-title');
  if ($title) $title.textContent = t('howtoplay.title');

  const $card = $menuTutorial.querySelector('.menu-howtoplay');
  if ($card) {
    $card.innerHTML = ''; // Clear existing items
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
  }

  const $hint = $menuTutorial.querySelector('.menu-sub-hint');
  if ($hint) $hint.textContent = t('hint.back');
}

// ===== Leaderboard =====
async function showLeaderboard() {
  hideMainItems();
  showBackBtn();
  currentScreen = 'leaderboard';
  setHint(t('hint.back'));

  clearSubScreen();
  if (!$menuLeaderboard) return;

  $menuLeaderboard.hidden = false;

  const $title = $menuLeaderboard.querySelector('.menu-screen-title');
  if ($title) $title.textContent = t('leaderboard.title');

  const $subtitle = $menuLeaderboard.querySelector('.menu-screen-subtitle');
  if ($subtitle) $subtitle.textContent = t('leaderboard.subtitle');

  const $body = $menuLeaderboard.querySelector('.menu-card');
  const $loading = $body.querySelector('.menu-state-label');
  const $list = $body.querySelector('.menu-leaderboard-list');

  $loading.textContent = t('leaderboard.loading');
  $list.innerHTML = '';

  let rows = [];
  let error = null;
  try {
    rows = await fetchTopLeaderboard(10);
  } catch (e) {
    console.warn('Failed to load leaderboard', e);
    error = e;
  }

  if (currentScreen !== 'leaderboard') return;

  if (error) {
    $loading.textContent = t('leaderboard.loadError');
    return;
  }

  if (rows.length === 0) {
    $loading.textContent = t('leaderboard.empty');
    return;
  }

  $loading.textContent = '';

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

  const $hint = $menuLeaderboard.querySelector('.menu-sub-hint');
  if ($hint) $hint.textContent = t('hint.back');
}

// ===== Settings =====
function showSettings() {
  hideMainItems();
  showBackBtn();
  currentScreen = 'settings';
  setHint(t('hint.back'));

  clearSubScreen();
  if (!$menuSettings) return;

  $menuSettings.hidden = false;

  const $title = $menuSettings.querySelector('.menu-screen-title');
  if ($title) $title.textContent = t('settings.title');

  const $card = $menuSettings.querySelector('.menu-settings');
  if (!$card) return;

  // Language row
  const $langRow = $card.querySelector('.menu-setting-row');
  const $langLabel = $langRow.querySelector('.menu-setting-label');
  const $langBtn = $langRow.querySelector('.menu-setting-toggle');

  $langLabel.textContent = t('settings.language');

  const langs = [
    { code: 'en', label: t('lang.english') },
    { code: 'ru', label: t('lang.russian') },
  ];
  let langIdx = Math.max(
    0,
    langs.findIndex((lang) => lang.code === getLanguage()),
  );

  $langBtn.textContent = `◀ ${langs[langIdx].label} ▶`;
  $langBtn.addEventListener('click', () => {
    playMenuClick();
    langIdx = (langIdx + 1) % langs.length;
    setLanguage(langs[langIdx].code);
  });

  // Music row
  const $musicRow = $card.querySelector('.menu-setting-row--slider');
  const $musicLabel = $musicRow.querySelector('.menu-setting-label');
  const $musicInput = $musicRow.querySelector('input');
  const $musicValue = $musicRow.querySelector('.menu-slider-value');

  $musicLabel.textContent = t('settings.music');

  const initialMusic = S.musicVolume != null ? S.musicVolume : 0.5;
  $musicInput.value = String(Math.round(initialMusic * 100));
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

  // SFX row
  const $sfxRow = $card.querySelectorAll('.menu-setting-row--slider')[1];
  const $sfxLabel = $sfxRow.querySelector('.menu-setting-label');
  const $sfxInput = $sfxRow.querySelector('input');
  const $sfxValue = $sfxRow.querySelector('.menu-slider-value');

  $sfxLabel.textContent = t('settings.sfx');

  const initialSfx = S.sfxVolume != null ? S.sfxVolume : 1;
  $sfxInput.value = String(Math.round(initialSfx * 100));
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

  // Display Name row
  const $nameRow = $card.querySelector('.menu-setting-row--name');
  const $nameLabel = $nameRow.querySelector('.menu-setting-label');
  const $nameGroup = $nameRow.querySelector('.menu-setting-name-group');
  const $nameInput = $nameGroup.querySelector('.menu-setting-name-input');
  const $nameHint = $nameGroup.querySelector('.menu-setting-name-hint');
  const $nameActions = $nameGroup.querySelector('.menu-setting-name-actions');
  const $nameSaveBtn = $nameActions.querySelector('.menu-setting-name-save');
  const $nameStatus = $nameActions.querySelector('.menu-setting-name-status');

  $nameLabel.textContent = t('settings.displayName');

  if (!currentUser) {
    $nameGroup.hidden = true;
    const $note = document.createElement('span');
    $note.className = 'menu-setting-note';
    $note.textContent = t('settings.displayNameGuestNote');
    $nameRow.appendChild($note);
  } else {
    $nameGroup.hidden = false;
    const isAnon = currentUser.isAnonymous === true;
    const currentName =
      (currentUser.displayName && currentUser.displayName.trim()) || '';

    $nameInput.value = currentName;
    $nameInput.placeholder = t('settings.displayNamePlaceholder');
    $nameHint.textContent = isAnon
      ? t('settings.displayNameAnon')
      : t('settings.displayNameEmail');
    $nameSaveBtn.textContent = t('settings.displayNameSave');

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
  }

  const $hint = $menuSettings.querySelector('.menu-sub-hint');
  if ($hint) $hint.textContent = t('hint.back');
}

// ===== Authors =====
async function showAuthors() {
  hideMainItems();
  showBackBtn();
  currentScreen = 'authors';
  setHint(t('hint.back'));

  clearSubScreen();
  if (!$menuAuthors) return;

  $menuAuthors.hidden = false;

  const $authorsBg = $menuAuthors.querySelector('.menu-authors-bg');
  if ($authorsBg) {
    // Start slideshow instead of static background
    startCreditsSlideshow($authorsBg);
  }

  $creditsScroll = $menuAuthors.querySelector('.menu-authors-scroll');
  const $creditsText = $menuAuthors.querySelector('.menu-authors-text');
  if ($creditsText) $creditsText.textContent = getCreditsText();

  const $hint = $menuAuthors.querySelector('.menu-sub-hint');
  if ($hint) $hint.textContent = t('hint.back');

  startCreditsAnimation();
}

function startCreditsSlideshow($bg) {
  creditsIndex = 0;
  updateCreditsBackground($bg);
  creditsInterval = setInterval(() => {
    creditsIndex = (creditsIndex + 1) % creditsImages.length;
    updateCreditsBackground($bg);
  }, 10000); // 5 seconds
}

function updateCreditsBackground($bg) {
  if (!$bg) return;
  // Fade out
  $bg.style.opacity = '0';
  setTimeout(() => {
    $bg.style.backgroundImage = `url("${creditsImages[creditsIndex]}")`;
    // Fade in
    $bg.style.opacity = '1';
  }, 1000); // Half of transition time
}

function stopCreditsSlideshow() {
  if (creditsInterval) {
    clearInterval(creditsInterval);
    creditsInterval = null;
  }
}

function startCreditsAnimation() {
  // CSS animation handles scrolling — nothing to do here
}

function stopCreditsAnimation() {
  stopCreditsSlideshow();
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
