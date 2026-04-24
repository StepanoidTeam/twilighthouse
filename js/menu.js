import {
  playSound,
  WAVES_VOLUME,
  MUSIC_VOLUME,
  syncLoopingAudio,
  getSfxVolume,
  getMusicVolume,
} from './sound.js';
import { isConfirmKey, isBackKey } from './input.js';
import S from './state.js';
import { renderLeaderboardScreen } from './leaderboard.js';
import { showAuthWidget, hideAuthWidget } from './auth-ui.js';
import { currentUser, isSignedInReal, updateDisplayName } from './auth.js';
import { renderAuthorsScreen, destroyAuthorsScreen } from './authors-screen.js';
import { showIntro } from './intro.js';
import { t, getLanguage, setLanguage, onLanguageChange } from './i18n.js';

const {
  $menuOverlay,
  $menuBg,
  $menuMain,
  $menuSub,
  $menuHint,
  $menuBtnStart,
  $menuBtnLeaderboard,
  $menuBtnSettings,
  $menuBtnAuthors,
  $menuBtnTutorial,
  $backBtn,
  $backBtnLabel,
  $menuSettings,
  $menuSettingsTitle,
  $menuSettingsHint,
  $menuSettingsLangLabel,
  $menuSettingsLangBtn,
  $menuSettingsMusicLabel,
  $menuSettingsMusicInput,
  $menuSettingsMusicValue,
  $menuSettingsSfxLabel,
  $menuSettingsSfxInput,
  $menuSettingsSfxValue,
  $menuSettingsNameLabel,
  $menuSettingsNameNote,
  $menuDisplayNameForm,
  $menuDisplayNameInput,
  $menuDisplayNameHint,
  $menuDisplayNameSave,
  $menuDisplayNameStatus,
} = globalThis;

// ===== Menu State =====
let menuApp = null;
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
function ensureMenuAmbient() {
  if (S.wavesSound) {
    void syncLoopingAudio(S.wavesSound, getSfxVolume(WAVES_VOLUME));
  }

  if (S.musicSound) {
    void syncLoopingAudio(S.musicSound, getMusicVolume(MUSIC_VOLUME));
  }
}

function playMenuSelect() {
  ensureMenuAmbient();
  playSound('audio/menu-select.mp3', 0.55);
}

function playMenuClick() {
  ensureMenuAmbient();
  playSound('audio/button-click.mp3', 0.2);
}

// ===== DOM Helpers =====
function initMenu() {
  if ($menuBg) {
    $menuBg.style.backgroundImage = `url("${MENU_BG_FILE}")`;
  }

  initMenuButtons();
  updateSelection();
}

function initMenuButtons() {
  $$menuItems = [
    $menuBtnStart,
    $menuBtnLeaderboard,
    $menuBtnSettings,
    $menuBtnAuthors,
    $menuBtnTutorial,
  ].filter(Boolean);
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
  if ($menuSettings) $menuSettings.hidden = true;
  showMainItems();
  hideBackBtn();
  currentScreen = 'main';
  updateSelection();
}

// ===== HTML Back Button =====
function initBackBtn() {
  backBtnEl = $backBtn;
  if ($backBtnLabel) $backBtnLabel.textContent = t('btn.back');
  backBtnEl.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    playMenuClick();
    showMainMenu();
  });
}

function showBackBtn() {
  if ($backBtnLabel) $backBtnLabel.textContent = t('btn.back');
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
  $menuOverlay.hidden = false;
  showMainMenu();
  currentScreen = 'main';

  showAuthWidget();

  if (!keyHandlerBound) {
    window.addEventListener('keydown', handleMenuKey);
    keyHandlerBound = true;
  }

  if (!i18nBound) {
    onLanguageChange(() => {
      if (!$menuOverlay) return;

      renderMainMenuButtons();
      updateSelection();
      setHint(currentScreen === 'main' ? t('hint.main') : t('hint.back'));

      if (backBtnEl && $backBtnLabel) $backBtnLabel.textContent = t('btn.back');

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
  if (!$menuOverlay || $menuOverlay.hidden) return;

  ensureMenuAmbient();

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
  await renderLeaderboardScreen({
    buildScreenShell,
    isActive: () => currentScreen === 'leaderboard',
  });
}

export async function openLeaderboard() {
  showMenu();
  await showLeaderboard();
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

  if ($menuSettingsTitle) $menuSettingsTitle.textContent = t('settings.title');
  if ($menuSettingsHint) $menuSettingsHint.textContent = t('hint.back');

  const langs = [
    { code: 'en', label: t('lang.english') },
    { code: 'ru', label: t('lang.russian') },
  ];
  let langIdx = Math.max(
    0,
    langs.findIndex((lang) => lang.code === getLanguage()),
  );

  if (!$menuSettingsLangLabel || !$menuSettingsLangBtn) return;
  $menuSettingsLangLabel.textContent = t('settings.language');
  $menuSettingsLangBtn.textContent = `◀ ${langs[langIdx].label} ▶`;
  $menuSettingsLangBtn.onclick = () => {
    playMenuClick();
    langIdx = (langIdx + 1) % langs.length;
    setLanguage(langs[langIdx].code);
  };

  if (
    !$menuSettingsMusicLabel ||
    !$menuSettingsMusicInput ||
    !$menuSettingsMusicValue
  )
    return;
  $menuSettingsMusicLabel.textContent = t('settings.music');

  const initialMusic = S.musicVolume != null ? S.musicVolume : 0.5;
  $menuSettingsMusicInput.value = String(Math.round(initialMusic * 100));
  $menuSettingsMusicValue.textContent = `${$menuSettingsMusicInput.value}%`;

  $menuSettingsMusicInput.oninput = () => {
    const val = Number($menuSettingsMusicInput.value) / 100;
    $menuSettingsMusicValue.textContent = `${$menuSettingsMusicInput.value}%`;
    S.musicVolume = val;
    if (S.musicSound) {
      void syncLoopingAudio(S.musicSound, MUSIC_VOLUME * val);
    }
    try {
      localStorage.setItem('lighthouse_music_vol', String(val));
    } catch (_) {}
  };

  if (
    !$menuSettingsSfxLabel ||
    !$menuSettingsSfxInput ||
    !$menuSettingsSfxValue
  )
    return;
  $menuSettingsSfxLabel.textContent = t('settings.sfx');

  const initialSfx = S.sfxVolume != null ? S.sfxVolume : 1;
  $menuSettingsSfxInput.value = String(Math.round(initialSfx * 100));
  $menuSettingsSfxValue.textContent = `${$menuSettingsSfxInput.value}%`;

  $menuSettingsSfxInput.oninput = () => {
    const val = Number($menuSettingsSfxInput.value) / 100;
    $menuSettingsSfxValue.textContent = `${$menuSettingsSfxInput.value}%`;
    S.sfxVolume = val;
    if (S.wavesSound) {
      void syncLoopingAudio(S.wavesSound, WAVES_VOLUME * val);
    }
    try {
      localStorage.setItem('lighthouse_sfx_vol', String(val));
    } catch (_) {}
  };

  // ===== Display Name =====
  if (!$menuSettingsNameLabel || !$menuSettingsNameNote) return;
  $menuSettingsNameLabel.textContent = t('settings.displayName');

  if (!currentUser) {
    $menuSettingsNameNote.textContent = t('settings.displayNameGuestNote');
    $menuSettingsNameNote.hidden = false;
    if ($menuDisplayNameForm) $menuDisplayNameForm.hidden = true;
  } else {
    $menuSettingsNameNote.hidden = true;
    if (
      !$menuDisplayNameForm ||
      !$menuDisplayNameInput ||
      !$menuDisplayNameHint ||
      !$menuDisplayNameSave ||
      !$menuDisplayNameStatus
    ) {
      return;
    }

    const isAnon = currentUser.isAnonymous === true;
    const currentName =
      (currentUser.displayName && currentUser.displayName.trim()) || '';

    $menuDisplayNameForm.hidden = false;
    $menuDisplayNameInput.value = currentName;
    $menuDisplayNameInput.placeholder = t('settings.displayNamePlaceholder');

    $menuDisplayNameHint.textContent = isAnon
      ? t('settings.displayNameAnon')
      : t('settings.displayNameEmail');
    $menuDisplayNameSave.textContent = t('settings.displayNameSave');

    $menuDisplayNameStatus.textContent = '';
    $menuDisplayNameStatus.className = 'menu-setting-name-status';

    $menuDisplayNameForm.onsubmit = async (e) => {
      e.preventDefault();

      const name = $menuDisplayNameInput.value.trim();
      if (!name) {
        $menuDisplayNameStatus.textContent = t('settings.displayNameEmpty');
        $menuDisplayNameStatus.className = 'menu-setting-name-status is-error';
        return;
      }
      if (name.length > 30) {
        $menuDisplayNameStatus.textContent = t('settings.displayNameTooLong');
        $menuDisplayNameStatus.className = 'menu-setting-name-status is-error';
        return;
      }
      $menuDisplayNameSave.disabled = true;
      $menuDisplayNameStatus.textContent = t('settings.displayNameSaving');
      $menuDisplayNameStatus.className = 'menu-setting-name-status';
      try {
        await updateDisplayName(name);
        $menuDisplayNameStatus.textContent = t('settings.displayNameSaved');
        $menuDisplayNameStatus.className =
          'menu-setting-name-status is-success';
        console.log(`👤 Display name saved: ${name}`);
      } catch (e) {
        console.warn('updateDisplayName failed', e);
        $menuDisplayNameStatus.textContent = t('settings.displayNameError');
        $menuDisplayNameStatus.className = 'menu-setting-name-status is-error';
      } finally {
        $menuDisplayNameSave.disabled = false;
      }
    };
  }
}

// ===== Authors =====
async function showAuthors() {
  hideMainItems();
  showBackBtn();
  currentScreen = 'authors';
  setHint(t('hint.back'));

  clearSubScreen();
  if (!$menuSub) return;

  renderAuthorsScreen({
    container: $menuSub,
    creditsText: getCreditsText(),
    backHint: buildBackHint(),
  });
  $creditsScroll = $menuSub.querySelector('.menu-authors-scroll');
  startCreditsAnimation();
}

function startCreditsAnimation() {
  // authors screen animation is managed by authors-screen.js
}

function stopCreditsAnimation() {
  destroyAuthorsScreen();
  $creditsScroll = null;
}

// ===== Show / Hide =====
function hideMenu() {
  if ($menuOverlay) $menuOverlay.hidden = true;
  clearSubScreen();
  if ($menuSettings) $menuSettings.hidden = true;
  hideBackBtn();
  currentScreen = null;
  hideAuthWidget();
}

export function showMenu() {
  if (!$menuOverlay) return;
  $menuOverlay.hidden = false;
  selectedIndex = 0;
  showMainMenu();
  currentScreen = 'main';
  repositionMenu();
  showAuthWidget();
}

export function isMenuVisible() {
  return Boolean($menuOverlay && !$menuOverlay.hidden);
}

export function repositionMenu() {
  if (!$menuOverlay) return;

  $menuOverlay.style.setProperty('--menu-vw', `${S.gameW}px`);
  $menuOverlay.style.setProperty('--menu-vh', `${S.gameH}px`);
}
