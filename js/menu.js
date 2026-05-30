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
import {
  renderLeaderboardScreen,
  syncCurrentUserLeaderboardDisplayName,
} from './leaderboard.js';
import { renderAchievementsScreen } from './achievements-screen.js';
import { renderShopScreen } from './shop-screen.js';
import { initAuthWidget } from './auth-ui.js';
import { currentUser, isSignedInReal, updateDisplayName } from './auth.js';
import { renderAuthorsScreen, destroyAuthorsScreen } from './authors-screen.js';
import { showIntro } from './intro.js';
import { getTutorialVideoSrc } from './tutorial-videos.js';
import {
  t,
  getLanguage,
  setLanguage,
  onLanguageChange,
  applyI18nToDOM,
} from './i18n.js';

const {
  $menuRoot,
  $menuBg,
  $menuBgMan,
  $menuMain,
  $menuHint,
  $menuBtnStart,
  $menuBtnShop,
  $menuBtnLeaderboard,
  $menuBtnAchievements,
  $menuBtnSettings,
  $menuBtnAuthors,
  $menuBtnTutorial,
  $discordLink,
  $backBtn,
  $menuSettings,
  $menuLeaderboard,
  $menuAchievements,
  $menuShop,
  $menuAuthors,
  $menuTutorial,
  $menuTutorialShell,
  $menuTutorialSkip,
  $menuTutorialSkipLabel,
  $menuSettingsLangLabel,
  $menuSettingsLangPrev,
  $menuSettingsLangValue,
  $menuSettingsLangNext,
  $menuSettingsContactBtn,
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
} = globalThis;

// ===== Menu State =====
let menuApp = null;
let $$menuItems = [];
let selectedIndex = 0;
let settingsItems = [];
let selectedSettingsIndex = 0;
let selectedSettingsKey = 'language';
let currentScreen = 'main'; // 'main' | 'shop' | 'leaderboard' | 'achievements' | 'settings' | 'authors' | 'tutorial' | null (game)
let $creditsScroll = null;
let onStartGame = null;
let backBtnEl = null;
let keyHandlerBound = false;
let i18nBound = false;
let bgManMotion = null;
let bgManMotionKeyframes = null;
let openedFromGame = false; // true when settings opened mid-game via exit-confirm popup
let menuLayoutSyncFrame = 0;
let displayNameSaveState = {
  state: null,
  labelKey: 'settings.displayNameSave',
  disabled: false,
};
let displayNameSaveResetTimer = 0;

// ===== Assets =====
const MENU_BG_FILE = 'sprites/mainmenu-bg.png';
const MENU_BG_MAN_FILE = 'sprites/mainmenu-man2.png';
const NARROW_MENU_BREAKPOINT = 720;

// ===== Main Menu Items =====
const MAIN_MENU_ACTIONS = [
  { key: 'menu.newGame', action: 'start' },
  { key: 'menu.shop', action: 'shop' },
  { key: 'menu.leaderboard', action: 'leaderboard' },
  { key: 'menu.achievements', action: 'achievements' },
  { key: 'menu.settings', action: 'settings' },
  { key: 'menu.authors', action: 'authors' },
  { key: 'menu.tutorial', action: 'tutorial' },
];

function getCreditsText() {
  return t('credits.text');
}

function cloneTemplateFirstElement(id) {
  const template = document.getElementById(id);
  const first = template?.content?.firstElementChild;
  return first ? first.cloneNode(true) : null;
}

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
  if ($menuBgMan) {
    $menuBgMan.src = MENU_BG_MAN_FILE;
  }

  initMenuButtons();
  updateSelection();
}

function buildBgManMotionKeyframes() {
  return [
    {
      offset: 0,
      transform: 'translate3d(0.00%, 0.00%, 0) rotate(0deg) scale(1.004)',
    },
    {
      offset: 0.125,
      transform: 'translate3d(0.22%, -0.16%, 0) rotate(0.38deg) scale(1.007)',
    },
    {
      offset: 0.25,
      transform: 'translate3d(0.42%, -0.30%, 0) rotate(0.72deg) scale(1.009)',
    },
    {
      offset: 0.375,
      transform: 'translate3d(0.22%, -0.16%, 0) rotate(0.38deg) scale(1.007)',
    },
    {
      offset: 0.5,
      transform: 'translate3d(0.00%, 0.00%, 0) rotate(0deg) scale(1.004)',
    },
    {
      offset: 0.625,
      transform: 'translate3d(-0.22%, 0.18%, 0) rotate(-0.40deg) scale(1.001)',
    },
    {
      offset: 0.75,
      transform: 'translate3d(-0.44%, 0.34%, 0) rotate(-0.78deg) scale(0.998)',
    },
    {
      offset: 0.875,
      transform: 'translate3d(-0.22%, 0.18%, 0) rotate(-0.40deg) scale(1.001)',
    },
    {
      offset: 1,
      transform: 'translate3d(0.00%, 0.00%, 0) rotate(0deg) scale(1.004)',
    },
  ];
}

function startBgManMotion() {
  if (bgManMotion || !$menuBgMan) return;

  if (!bgManMotionKeyframes) {
    bgManMotionKeyframes = buildBgManMotionKeyframes();
  }

  bgManMotion = $menuBgMan.animate(bgManMotionKeyframes, {
    duration: 12000,
    iterations: Infinity,
    easing: 'linear',
    fill: 'both',
  });
}

function stopBgManMotion() {
  if (bgManMotion) {
    bgManMotion.cancel();
    bgManMotion = null;
  }
  if ($menuBgMan) {
    $menuBgMan.style.transform = '';
  }
}

function initMenuButtons() {
  $$menuItems = [
    $menuBtnStart,
    $menuBtnShop,
    $menuBtnLeaderboard,
    $menuBtnAchievements,
    $menuBtnSettings,
    $menuBtnAuthors,
    $menuBtnTutorial,
  ].filter(Boolean);
  for (let i = 0; i < $$menuItems.length; i++) {
    const $button = $$menuItems[i];
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

function updateSelection() {
  for (let i = 0; i < $$menuItems.length; i++) {
    const $button = $$menuItems[i];
    const isSelected = i === selectedIndex;
    $button.classList.toggle('is-selected', isSelected);
    $button.setAttribute('aria-current', isSelected ? 'true' : 'false');
  }
}

function renderMenuHint($hint, actions) {
  if (!$hint) return;
  $hint.replaceChildren();

  actions.forEach((action, index) => {
    if (index > 0) {
      const $separator = document.createElement('span');
      $separator.className = 'menu-hint-separator';
      $separator.textContent = '●';
      $hint.append($separator);
    }

    const $action = document.createElement('span');
    $action.className = 'menu-hint-action';

    action.keys.forEach((key) => {
      const $key = document.createElement('span');
      $key.className = 'hotkey';
      $key.textContent = key;
      $action.append($key);
    });

    const $text = document.createElement('span');
    $text.className = 'hint-text';
    $text.textContent = t(action.labelKey);
    $action.append($text);
    $hint.append($action);
  });
}

function renderBackOnlyHint($screen) {
  renderMenuHint($screen?.querySelector('.menu-hint'), [
    { keys: ['Q', 'esc'], labelKey: 'hint.back' },
  ]);
}

function renderMainHint() {
  renderMenuHint($menuHint, [
    { keys: ['↑', '↓', 'W', 'S'], labelKey: 'hint.navigate' },
    { keys: ['⏎', 'E'], labelKey: 'hint.select' },
  ]);
}

function renderSettingsHint() {
  renderMenuHint($menuSettings?.querySelector(':scope > .menu-hint'), [
    { keys: ['↑', '↓', 'W', 'S'], labelKey: 'hint.navigate' },
    { keys: ['←', '→', 'A', 'D'], labelKey: 'hint.change' },
    { keys: ['⏎', 'E'], labelKey: 'hint.edit' },
    { keys: ['Q', 'esc'], labelKey: 'hint.back' },
  ]);
}

function updateSettingsSelection() {
  for (let i = 0; i < settingsItems.length; i++) {
    const { row } = settingsItems[i];
    const isSelected = i === selectedSettingsIndex;
    row.classList.toggle('is-selected', isSelected);
    row.setAttribute('aria-current', isSelected ? 'true' : 'false');
  }
}

function selectSettingsIndex(index) {
  if (!settingsItems.length) return;
  selectedSettingsIndex = (index + settingsItems.length) % settingsItems.length;
  selectedSettingsKey = settingsItems[selectedSettingsIndex]?.key;
  updateSettingsSelection();
}

function initSettingsNavigation(items) {
  settingsItems = items.filter(({ row }) => row && !row.hidden);
  if (!settingsItems.length) return;

  const selectedByKeyIndex = settingsItems.findIndex(
    ({ key }) => key === selectedSettingsKey,
  );
  selectedSettingsIndex =
    selectedByKeyIndex >= 0
      ? selectedByKeyIndex
      : Math.min(selectedSettingsIndex, settingsItems.length - 1);
  selectedSettingsKey = settingsItems[selectedSettingsIndex]?.key;
  updateSettingsSelection();

  settingsItems.forEach(({ row }, index) => {
    row.onpointerover = () => {
      if (selectedSettingsIndex === index) return;
      selectedSettingsIndex = index;
      selectedSettingsKey = settingsItems[index]?.key;
      updateSettingsSelection();
      playMenuSelect();
    };
    row.onclick = () => {
      selectedSettingsIndex = index;
      selectedSettingsKey = settingsItems[index]?.key;
      updateSettingsSelection();
    };
  });
}

function changeSelectedSetting(direction) {
  const item = settingsItems[selectedSettingsIndex];
  if (!item?.change) return;
  selectedSettingsKey = item.key;
  item.change(direction);
}

function activateSelectedSetting() {
  const item = settingsItems[selectedSettingsIndex];
  if (!item?.activate) return false;
  selectedSettingsKey = item.key;
  item.activate();
  return true;
}

function hideOverlayScreens() {
  stopCreditsAnimation();
  clearTutorialState();
  settingsItems = [];
  if ($menuSettings) $menuSettings.hidden = true;
  if ($menuLeaderboard) $menuLeaderboard.hidden = true;
  if ($menuAchievements) $menuAchievements.hidden = true;
  if ($menuShop) $menuShop.hidden = true;
  if ($menuAuthors) $menuAuthors.hidden = true;
  if ($menuTutorial) $menuTutorial.hidden = true;
}

function hideMainItems() {
  if ($menuMain) $menuMain.hidden = true;
  if ($menuHint) $menuHint.hidden = true;
  hideDiscordLink();
}

function showMainItems() {
  if ($menuMain) $menuMain.hidden = false;
  if ($menuHint) $menuHint.hidden = false;
  showDiscordLink();
}

function showMainMenu() {
  hideOverlayScreens();
  showMainItems();
  hideBackBtn();
  currentScreen = 'main';
  updateSelection();
  renderMainHint();
  scheduleMenuLayoutSync();
}

// ===== HTML Back Button =====
function initBackBtn() {
  backBtnEl = $backBtn;
  backBtnEl.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    playMenuClick();
    if (openedFromGame) {
      openedFromGame = false;
      hideMenu();
    } else {
      showMainMenu();
    }
  });
}

function showBackBtn() {
  backBtnEl.classList.add('is-visible');
}

function hideBackBtn() {
  backBtnEl.classList.remove('is-visible');
}

function clearDisplayNameSaveResetTimer() {
  if (!displayNameSaveResetTimer) return;
  clearTimeout(displayNameSaveResetTimer);
  displayNameSaveResetTimer = 0;
}

// ===== Lifecycle =====
export async function buildMenu(app, startGameCb) {
  menuApp = app;
  onStartGame = startGameCb;

  initMenu();
  initAuthWidget();
  startBgManMotion();
  initBackBtn();
  $menuRoot.hidden = false;
  showMainMenu();
  currentScreen = 'main';

  if (!keyHandlerBound) {
    window.addEventListener('keydown', handleMenuKey);
    keyHandlerBound = true;
  }

  if (!i18nBound) {
    onLanguageChange(() => {
      if (!$menuRoot) return;

      applyI18nToDOM();
      updateSelection();

      if (currentScreen === 'settings') showSettings();
      else if (currentScreen === 'shop') showShop();
      else if (currentScreen === 'leaderboard') showLeaderboard();
      else if (currentScreen === 'achievements') showAchievements();
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

  ensureMenuAmbient();

  const ae = document.activeElement;
  const isInput = ae?.tagName === 'INPUT';
  const isTypingInput =
    isInput && !(currentScreen === 'settings' && ae.type === 'range');
  if (
    ae &&
    (isTypingInput ||
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
  } else if (currentScreen === 'settings') {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      selectSettingsIndex(selectedSettingsIndex - 1);
      playMenuSelect();
    } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
      e.preventDefault();
      selectSettingsIndex(selectedSettingsIndex + 1);
      playMenuSelect();
    } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      e.preventDefault();
      changeSelectedSetting(-1);
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      e.preventDefault();
      changeSelectedSetting(1);
    } else if (isConfirmKey(e.code)) {
      if (activateSelectedSetting()) {
        e.preventDefault();
        playMenuClick();
      }
    } else if (isBackKey(e.code)) {
      playMenuClick();
      if (openedFromGame) {
        openedFromGame = false;
        hideMenu();
      } else {
        showMainMenu();
      }
    }
  } else if (currentScreen === 'tutorial' && tutorialState) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      e.preventDefault();
      goToStep(tutorialState.index - 1);
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      e.preventDefault();
      if (tutorialState.index < tutorialState.items.length - 1) {
        goToStep(tutorialState.index + 1);
      }
    } else if (isBackKey(e.code)) {
      playMenuClick();
      showMainMenu();
    }
  } else if (isBackKey(e.code)) {
    playMenuClick();
    if (openedFromGame) {
      openedFromGame = false;
      hideMenu();
    } else {
      showMainMenu();
    }
  }
}

function activateMenuItem() {
  const action = MAIN_MENU_ACTIONS[selectedIndex].action;
  switch (action) {
    case 'start':
      requestStartGame();
      break;
    case 'shop':
      showShop();
      break;
    case 'leaderboard':
      showLeaderboard();
      break;
    case 'achievements':
      showAchievements();
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

function requestStartGame() {
  if (!onStartGame) return false;
  const started = onStartGame();
  if (started === false) return false;
  hideMenu();
  return true;
}

// ===== Tutorial / How to Play =====
let tutorialState = null;
let tutorialSkipBound = false;

function hideTutorialScreen() {
  clearTutorialState();
  if ($menuTutorial) $menuTutorial.hidden = true;
}

function showTutorial() {
  hideMainItems();
  hideBackBtn();
  const prevScreen = currentScreen;
  const savedIndex =
    prevScreen === 'tutorial' && tutorialState ? tutorialState.index : 0;
  hideOverlayScreens();
  currentScreen = 'tutorial';
  scheduleMenuLayoutSync();

  if (!$menuTutorial || !$menuTutorialShell) return;

  const items = t('howtoplay.items');
  if (!Array.isArray(items) || items.length === 0) return;

  const startIndex = Math.min(savedIndex, items.length - 1);

  $menuTutorial.hidden = false;

  if ($menuTutorialSkipLabel) {
    $menuTutorialSkipLabel.textContent = t('howtoplay.skip');
  }
  if ($menuTutorialSkip) {
    $menuTutorialSkip.hidden = false;
    if (!tutorialSkipBound) {
      $menuTutorialSkip.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        playMenuClick();
        showMainMenu();
      });
      tutorialSkipBound = true;
    }
  }

  const $title = $menuTutorialShell.querySelector('.menu-screen-title');
  const $stepCounter = $menuTutorialShell.querySelector(
    '.howtoplay-step-counter',
  );
  const $stepTitle = $menuTutorialShell.querySelector('.howtoplay-step-title');
  const $stepText = $menuTutorialShell.querySelector('.howtoplay-step-text');
  const $video = $menuTutorialShell.querySelector('.howtoplay-video');
  const $prevBtn = $menuTutorialShell.querySelector('.howtoplay-nav-btn--prev');
  const $nextBtn = $menuTutorialShell.querySelector('.howtoplay-nav-btn--next');
  const $dots = $menuTutorialShell.querySelector('.howtoplay-dots');

  if (
    !($title instanceof HTMLElement) ||
    !($stepCounter instanceof HTMLElement) ||
    !($stepTitle instanceof HTMLElement) ||
    !($stepText instanceof HTMLElement) ||
    !($video instanceof HTMLVideoElement) ||
    !($prevBtn instanceof HTMLButtonElement) ||
    !($nextBtn instanceof HTMLButtonElement) ||
    !($dots instanceof HTMLElement)
  ) {
    return;
  }

  $title.textContent = t('howtoplay.title');

  $dots.replaceChildren();
  const $dotEls = items.map((_, i) => {
    const $d = cloneTemplateFirstElement('$howtoplayDotTemplate');
    if (!($d instanceof HTMLButtonElement)) {
      const fallback = document.createElement('button');
      fallback.type = 'button';
      fallback.className = 'howtoplay-dot';
      fallback.setAttribute('aria-label', String(i + 1));
      fallback.addEventListener('click', () => goToStep(i));
      $dots.appendChild(fallback);
      return fallback;
    }

    $d.setAttribute('aria-label', String(i + 1));
    $d.addEventListener('click', () => goToStep(i));
    $dots.appendChild($d);
    return $d;
  });

  tutorialState = {
    index: startIndex,
    items,
    $stepCounter,
    $stepTitle,
    $stepText,
    $video,
    $prevBtn,
    $nextBtn,
    $dotEls,
  };

  $prevBtn.onclick = () => {
    playMenuClick();
    goToStep(tutorialState.index - 1);
  };
  $nextBtn.onclick = () => {
    if (tutorialState.index >= tutorialState.items.length - 1) return;
    playMenuClick();
    goToStep(tutorialState.index + 1);
  };

  renderTutorialStep();
}

function goToStep(nextIndex) {
  if (!tutorialState) return;
  const { items } = tutorialState;
  const clamped = Math.max(0, Math.min(items.length - 1, nextIndex));
  if (clamped === tutorialState.index) return;
  tutorialState.index = clamped;
  renderTutorialStep();
  playMenuSelect();
}

function renderTutorialStep() {
  if (!tutorialState) return;
  const {
    index,
    items,
    $stepCounter,
    $stepTitle,
    $stepText,
    $video,
    $prevBtn,
    $nextBtn,
    $dotEls,
  } = tutorialState;

  const item = items[index];

  $stepCounter.textContent = `${index + 1} / ${items.length}`;
  $stepTitle.textContent = item.title || '';
  $stepText.textContent = item.text || '';

  if ($video.dataset.src !== item.video) {
    $video.dataset.src = item.video;
    $video.src = getTutorialVideoSrc(item.video);
    const tryPlay = $video.play();
    if (tryPlay && typeof tryPlay.catch === 'function') {
      tryPlay.catch(() => {});
    }
  }

  const isLast = index === items.length - 1;
  $prevBtn.disabled = index === 0;
  $nextBtn.disabled = isLast;
  $nextBtn.hidden = false;
  $nextBtn.classList.remove('howtoplay-nav-btn--finish');

  $prevBtn.querySelector('.howtoplay-nav-label').textContent =
    t('howtoplay.prev');
  $nextBtn.querySelector('.howtoplay-nav-label').textContent =
    t('howtoplay.next');
  const $nextArrow = $nextBtn.querySelector('.howtoplay-nav-arrow');
  if ($nextArrow) $nextArrow.textContent = '▶';

  for (let i = 0; i < $dotEls.length; i++) {
    $dotEls[i].classList.toggle('is-active', i === index);
  }
}

function clearTutorialState() {
  if (tutorialState && tutorialState.$video) {
    try {
      tutorialState.$video.pause();
      tutorialState.$video.removeAttribute('src');
      tutorialState.$video.load();
    } catch (_) {}
  }
  tutorialState = null;
}

// ===== Leaderboard =====
async function showLeaderboard() {
  hideMainItems();
  showBackBtn();
  hideOverlayScreens();
  currentScreen = 'leaderboard';
  scheduleMenuLayoutSync();
  if ($menuLeaderboard) $menuLeaderboard.hidden = false;
  renderBackOnlyHint($menuLeaderboard);
  await renderLeaderboardScreen({
    container: $menuLeaderboard,
    isActive: () => currentScreen === 'leaderboard',
  });
}

// ===== Achievements =====
function showAchievements() {
  hideMainItems();
  showBackBtn();
  hideOverlayScreens();
  currentScreen = 'achievements';
  scheduleMenuLayoutSync();
  if ($menuAchievements) $menuAchievements.hidden = false;
  renderBackOnlyHint($menuAchievements);
  renderAchievementsScreen({
    container: $menuAchievements,
    isActive: () => currentScreen === 'achievements',
  });
}

export async function openLeaderboard() {
  showMenu();
  await showLeaderboard();
}

// ===== Shop =====
function showShop() {
  hideMainItems();
  showBackBtn();
  hideOverlayScreens();
  currentScreen = 'shop';
  scheduleMenuLayoutSync();
  if ($menuShop) $menuShop.hidden = false;
  renderBackOnlyHint($menuShop);
  renderShopScreen({
    container: $menuShop,
    isActive: () => currentScreen === 'shop',
  });
}

// ===== Settings =====
function showSettings() {
  hideMainItems();
  showBackBtn();
  hideOverlayScreens();
  currentScreen = 'settings';
  scheduleMenuLayoutSync();
  if (!$menuSettings) return;

  $menuSettings.hidden = false;
  renderSettingsHint();

  const langs = [
    { code: 'en', label: t('lang.english') },
    { code: 'ru', label: t('lang.russian') },
    { code: 'zh', label: t('lang.chinese') },
  ];
  let langIdx = Math.max(
    0,
    langs.findIndex((lang) => lang.code === getLanguage()),
  );

  if (
    !$menuSettingsLangLabel ||
    !$menuSettingsLangPrev ||
    !$menuSettingsLangValue ||
    !$menuSettingsLangNext
  )
    return;

  function renderSettingsLanguage() {
    $menuSettingsLangValue.textContent = langs[langIdx].label;
  }

  function pageSettingsLanguage(direction) {
    playMenuClick();
    selectedSettingsKey = 'language';
    langIdx = (langIdx + direction + langs.length) % langs.length;
    renderSettingsLanguage();
    setLanguage(langs[langIdx].code);
  }

  renderSettingsLanguage();
  $menuSettingsLangPrev.onclick = () => pageSettingsLanguage(-1);
  $menuSettingsLangNext.onclick = () => pageSettingsLanguage(1);

  if ($menuSettingsContactBtn) {
    $menuSettingsContactBtn.onclick = () => {
      playMenuClick();
      const contactUrl = $discordLink?.href || 'https://discord.gg/dZerNr27B';
      window.open(contactUrl, '_blank', 'noopener');
    };
  }

  if (
    !$menuSettingsMusicLabel ||
    !$menuSettingsMusicInput ||
    !$menuSettingsMusicValue
  )
    return;

  const initialMusic = S.musicVolume != null ? S.musicVolume : 0.5;

  function syncSettingsRangeFill(input) {
    const min = Number(input.min || 0);
    const max = Number(input.max || 100);
    const value = Number(input.value || 0);
    const percent = ((value - min) / (max - min || 1)) * 100;
    input.style.setProperty('--menu-range-value', `${percent}%`);
  }

  function applyMusicVolume(val) {
    $menuSettingsMusicInput.value = String(Math.round(val * 100));
    syncSettingsRangeFill($menuSettingsMusicInput);
    $menuSettingsMusicValue.textContent = `${$menuSettingsMusicInput.value}%`;
    S.musicVolume = val;
    if (S.musicSound) {
      void syncLoopingAudio(S.musicSound, MUSIC_VOLUME * val);
    }
    try {
      localStorage.setItem('lighthouse_music_vol', String(val));
    } catch (_) {}
  }

  $menuSettingsMusicInput.value = String(Math.round(initialMusic * 100));
  syncSettingsRangeFill($menuSettingsMusicInput);
  $menuSettingsMusicValue.textContent = `${$menuSettingsMusicInput.value}%`;

  $menuSettingsMusicInput.oninput = () => {
    applyMusicVolume(Number($menuSettingsMusicInput.value) / 100);
  };

  function changeMusicVolume(direction) {
    playMenuClick();
    const currentValue = Number.isFinite(S.musicVolume)
      ? S.musicVolume
      : initialMusic;
    const nextValue = Math.max(0, Math.min(1, currentValue + direction * 0.05));
    applyMusicVolume(nextValue);
  }

  if (
    !$menuSettingsSfxLabel ||
    !$menuSettingsSfxInput ||
    !$menuSettingsSfxValue
  )
    return;

  const initialSfx = S.sfxVolume != null ? S.sfxVolume : 1;

  function applySfxVolume(val) {
    $menuSettingsSfxInput.value = String(Math.round(val * 100));
    syncSettingsRangeFill($menuSettingsSfxInput);
    $menuSettingsSfxValue.textContent = `${$menuSettingsSfxInput.value}%`;
    S.sfxVolume = val;
    if (S.wavesSound) {
      void syncLoopingAudio(S.wavesSound, WAVES_VOLUME * val);
    }
    try {
      localStorage.setItem('lighthouse_sfx_vol', String(val));
    } catch (_) {}
  }

  $menuSettingsSfxInput.value = String(Math.round(initialSfx * 100));
  syncSettingsRangeFill($menuSettingsSfxInput);
  $menuSettingsSfxValue.textContent = `${$menuSettingsSfxInput.value}%`;

  $menuSettingsSfxInput.oninput = () => {
    applySfxVolume(Number($menuSettingsSfxInput.value) / 100);
  };

  function changeSfxVolume(direction) {
    playMenuClick();
    const currentValue = Number.isFinite(S.sfxVolume)
      ? S.sfxVolume
      : initialSfx;
    const nextValue = Math.max(0, Math.min(1, currentValue + direction * 0.05));
    applySfxVolume(nextValue);
  }

  // ===== Display Name =====
  if (!$menuSettingsNameLabel || !$menuSettingsNameNote) return;

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
      !$menuDisplayNameSave
    ) {
      return;
    }

    const isAnon = currentUser.isAnonymous === true;
    const currentName =
      (currentUser.displayName && currentUser.displayName.trim()) || '';

    $menuDisplayNameForm.hidden = false;
    $menuDisplayNameInput.value = currentName;

    function setDisplayNameSaveState(
      state,
      labelKey = 'settings.displayNameSave',
      disabled = false,
    ) {
      displayNameSaveState = {
        state,
        labelKey,
        disabled,
      };
      $menuDisplayNameSave.classList.remove(
        'is-saving',
        'is-success',
        'is-error',
      );
      if (state) $menuDisplayNameSave.classList.add(state);
      $menuDisplayNameSave.textContent = t(labelKey);
      $menuDisplayNameSave.disabled = disabled;
    }

    function resetDisplayNameSaveState() {
      clearDisplayNameSaveResetTimer();
      setDisplayNameSaveState(null, 'settings.displayNameSave', false);
    }

    setDisplayNameSaveState(
      displayNameSaveState.state,
      displayNameSaveState.labelKey,
      displayNameSaveState.disabled,
    );
    $menuDisplayNameInput.oninput = () => {
      if (!$menuDisplayNameSave.disabled) resetDisplayNameSaveState();
    };

    $menuDisplayNameForm.onsubmit = async (e) => {
      e.preventDefault();
      if ($menuDisplayNameSave.disabled) return;
      clearDisplayNameSaveResetTimer();

      const name = $menuDisplayNameInput.value.trim();
      if (!name) {
        setDisplayNameSaveState('is-error', 'settings.displayNameEmpty', false);
        return;
      }
      if (name.length > 30) {
        setDisplayNameSaveState(
          'is-error',
          'settings.displayNameTooLong',
          false,
        );
        return;
      }
      setDisplayNameSaveState('is-saving', 'settings.displayNameSaving', true);
      try {
        await updateDisplayName(name);

        // Keep leaderboard row name in sync when possible, but do not fail
        // the profile name update UX if this optional sync is blocked by rules.
        const synced = await syncCurrentUserLeaderboardDisplayName();
        if (!synced) {
          console.info('Leaderboard displayName sync skipped or unchanged');
        }

        setDisplayNameSaveState(
          'is-success',
          'settings.displayNameSaved',
          false,
        );
        $menuDisplayNameInput.blur();
        displayNameSaveResetTimer = setTimeout(() => {
          if (
            displayNameSaveState.state === 'is-success' &&
            displayNameSaveState.labelKey === 'settings.displayNameSaved'
          ) {
            resetDisplayNameSaveState();
          }
        }, 2000);
        console.log(`👤 Display name saved: ${name}`);
      } catch (e) {
        console.warn('Display name update failed', e);
        setDisplayNameSaveState('is-error', 'settings.displayNameError', false);
      }
    };
  }

  initSettingsNavigation([
    {
      key: 'language',
      row: $menuSettingsLangLabel.closest('.menu-setting-row'),
      change: pageSettingsLanguage,
    },
    {
      key: 'music',
      row: $menuSettingsMusicLabel.closest('.menu-setting-row'),
      change: changeMusicVolume,
    },
    {
      key: 'sfx',
      row: $menuSettingsSfxLabel.closest('.menu-setting-row'),
      change: changeSfxVolume,
    },
    {
      key: 'name',
      row:
        $menuDisplayNameForm && !$menuDisplayNameForm.hidden
          ? $menuDisplayNameForm
          : null,
      activate: () => {
        $menuDisplayNameInput?.focus();
        $menuDisplayNameInput?.select();
      },
    },
  ]);
}

// ===== Authors =====
async function showAuthors() {
  hideMainItems();
  showBackBtn();
  hideOverlayScreens();
  currentScreen = 'authors';
  scheduleMenuLayoutSync();
  if (!$menuAuthors) return;

  $menuAuthors.hidden = false;
  renderBackOnlyHint($menuAuthors);

  renderAuthorsScreen({
    container: $menuAuthors,
    creditsText: getCreditsText(),
  });
  $creditsScroll = $menuAuthors.querySelector('.menu-authors-scroll');
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
function showDiscordLink() {
  if ($discordLink) $discordLink.classList.add('is-visible');
}

function hideDiscordLink() {
  if ($discordLink) $discordLink.classList.remove('is-visible');
}

function hideMenu() {
  if ($menuRoot) $menuRoot.hidden = true;
  stopBgManMotion();
  hideOverlayScreens();
  hideBackBtn();
  currentScreen = null;
  openedFromGame = false;
  hideDiscordLink();
}

export function showMenu() {
  if (!$menuRoot) return;
  $menuRoot.hidden = false;
  startBgManMotion();
  selectedIndex = 0;
  showMainMenu();
  currentScreen = 'main';
  repositionMenu();
}

export function showSettingsFromGame() {
  if (!$menuRoot) return;
  openedFromGame = true;
  $menuRoot.hidden = false;
  startBgManMotion();
  repositionMenu();
  showSettings();
}

export function isMenuVisible() {
  return Boolean($menuRoot && !$menuRoot.hidden);
}

export function repositionMenu() {
  if (!$menuRoot) return;

  $menuRoot.style.setProperty('--menu-vw', `${S.gameW}px`);
  $menuRoot.style.setProperty('--menu-vh', `${S.gameH}px`);
  scheduleMenuLayoutSync();
}

function scheduleMenuLayoutSync() {
  if (menuLayoutSyncFrame) {
    cancelAnimationFrame(menuLayoutSyncFrame);
  }

  menuLayoutSyncFrame = requestAnimationFrame(() => {
    menuLayoutSyncFrame = 0;
    syncMainMenuLayout();
  });
}

function syncMainMenuLayout() {
  if (!$menuRoot || !$menuMain) return;

  const viewportWidth =
    S.gameW || window.innerWidth || document.documentElement.clientWidth;
  const isNarrowScreen = viewportWidth <= NARROW_MENU_BREAKPOINT;
  const isSubScreen = currentScreen !== null && currentScreen !== 'main';
  const mainMenuWidth = $menuMain.getBoundingClientRect().width;
  const canShowKeeper =
    isNarrowScreen &&
    (isSubScreen ||
      (currentScreen === 'main' &&
        !$menuMain.hidden &&
        mainMenuWidth > 0 &&
        mainMenuWidth <= viewportWidth / 2));

  $menuRoot.classList.toggle('menu-overlay--subscreen', isSubScreen);
  $menuRoot.classList.toggle('menu-overlay--show-keeper', canShowKeeper);
}
