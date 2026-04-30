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
import { showAuthWidget, hideAuthWidget } from './auth-ui.js';
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
  $menuOverlay,
  $menuBg,
  $menuBgMan,
  $menuMain,
  $menuSub,
  $menuHint,
  $menuBtnStart,
  $menuBtnLeaderboard,
  $menuBtnSettings,
  $menuBtnAuthors,
  $menuBtnTutorial,
  $discordLink,
  $backBtn,
  $menuSettings,
  $menuSettingsTitle,
  $menuSettingsHint,
  $menuTutorial,
  $menuTutorialShell,
  $menuTutorialSkip,
  $menuTutorialSkipLabel,
  $menuTutorialHint,
  $menuSettingsLangLabel,
  $menuSettingsLangBtn,
  $menuSettingsMusicLabel,
  $menuSettingsMusicInput,
  $menuSettingsMusicValue,
  $menuSettingsMusicMute,
  $menuSettingsSfxLabel,
  $menuSettingsSfxInput,
  $menuSettingsSfxValue,
  $menuSettingsSfxMute,
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
let bgManMotion = null;
let bgManMotionKeyframes = null;

// ===== Assets =====
const MENU_BG_FILE = 'sprites/mainmenu-bg.png';
const MENU_BG_MAN_FILE = 'sprites/mainmenu-man2.png';

// ===== First-run tutorial flag =====
const TUTORIAL_SEEN_KEY = 'lighthouse_tutorial_seen';

function hasSeenTutorial() {
  try {
    return localStorage.getItem(TUTORIAL_SEEN_KEY) === '1';
  } catch (_) {
    return false;
  }
}

function markTutorialSeen() {
  try {
    localStorage.setItem(TUTORIAL_SEEN_KEY, '1');
  } catch (_) {}
}

// ===== Main Menu Items =====
const MAIN_MENU_ACTIONS = [
  { key: 'menu.newGame', action: 'start' },
  { key: 'menu.leaderboard', action: 'leaderboard' },
  { key: 'menu.settings', action: 'settings' },
  { key: 'menu.authors', action: 'authors' },
  { key: 'menu.tutorial', action: 'tutorial' },
];

function getCreditsText() {
  return t('credits.text');
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
    $menuBtnLeaderboard,
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

function clearSubScreen() {
  if (!$menuSub) return;

  stopCreditsAnimation();
  clearTutorialState();
  $menuSub.innerHTML = '';
  $menuSub.hidden = true;
  $menuSub.className = 'menu-sub';
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

function getBackHint() {
  const template = $backHintTemplate;
  if (!template) return null;
  const $hint = template.content.cloneNode(true).firstElementChild;
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
  const $backHint = getBackHint();
  if ($backHint) $menuSub.appendChild($backHint);
  return $screen;
}

function showMainMenu() {
  clearSubScreen();
  if ($menuSettings) $menuSettings.hidden = true;
  hideTutorialScreen();
  showMainItems();
  hideBackBtn();
  currentScreen = 'main';
  updateSelection();
}

// ===== HTML Back Button =====
function initBackBtn() {
  backBtnEl = $backBtn;
  backBtnEl.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    playMenuClick();
    showMainMenu();
  });
}

function showBackBtn() {
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
  startBgManMotion();
  initBackBtn();
  $menuOverlay.hidden = false;
  showMainMenu();
  currentScreen = 'main';

  showAuthWidget();

  // Новых игроков сразу ведём на экран "Как играть": главное меню остаётся
  // под низом, по Back игрок попадает на пункт Tutorial с уже прокрученным
  // выделением.
  if (!hasSeenTutorial()) {
    const tutorialIdx = MAIN_MENU_ACTIONS.findIndex(
      (item) => item.action === 'tutorial',
    );
    if (tutorialIdx >= 0) {
      selectedIndex = tutorialIdx;
      updateSelection();
    }
    markTutorialSeen();
    showTutorial();
  }

  if (!keyHandlerBound) {
    window.addEventListener('keydown', handleMenuKey);
    keyHandlerBound = true;
  }

  if (!i18nBound) {
    onLanguageChange(() => {
      if (!$menuOverlay) return;

      applyI18nToDOM();
      updateSelection();

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
  } else if (currentScreen === 'tutorial' && tutorialState) {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      e.preventDefault();
      goToStep(tutorialState.index - 1);
    } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      e.preventDefault();
      if (tutorialState.index >= tutorialState.items.length - 1) {
        playMenuClick();
        finishTutorial();
      } else {
        goToStep(tutorialState.index + 1);
      }
    } else if (isBackKey(e.code)) {
      playMenuClick();
      showMainMenu();
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
let tutorialState = null;
let tutorialSkipBound = false;

function hideTutorialScreen() {
  clearTutorialState();
  if ($menuTutorial) $menuTutorial.hidden = true;
  if ($menuTutorialShell) $menuTutorialShell.innerHTML = '';
}

function showTutorial() {
  hideMainItems();
  hideBackBtn();
  const prevScreen = currentScreen;
  const savedIndex =
    prevScreen === 'tutorial' && tutorialState ? tutorialState.index : 0;
  clearSubScreen();
  currentScreen = 'tutorial';

  if (!$menuTutorial || !$menuTutorialShell) return;

  const items = t('howtoplay.items');
  if (!Array.isArray(items) || items.length === 0) return;

  const startIndex = Math.min(savedIndex, items.length - 1);

  $menuTutorial.hidden = false;
  $menuTutorialShell.innerHTML = '';

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

  const $title = document.createElement('h2');
  $title.className = 'menu-screen-title';
  $title.textContent = t('howtoplay.title');
  $menuTutorialShell.appendChild($title);

  const $card = document.createElement('div');
  $card.className = 'menu-card menu-howtoplay blur-bg';

  const $stepHeader = document.createElement('div');
  $stepHeader.className = 'howtoplay-step-header';

  const $stepCounter = document.createElement('span');
  $stepCounter.className = 'howtoplay-step-counter';
  $stepHeader.appendChild($stepCounter);

  const $stepTitle = document.createElement('h3');
  $stepTitle.className = 'howtoplay-step-title';
  $stepHeader.appendChild($stepTitle);

  const $stepText = document.createElement('p');
  $stepText.className = 'howtoplay-step-text';
  $stepHeader.appendChild($stepText);

  $card.appendChild($stepHeader);

  const $videoWrap = document.createElement('div');
  $videoWrap.className = 'howtoplay-video-wrap';

  const $video = document.createElement('video');
  $video.className = 'howtoplay-video';
  $video.muted = true;
  $video.autoplay = true;
  $video.loop = true;
  $video.playsInline = true;
  $video.setAttribute('playsinline', '');
  $video.setAttribute('muted', '');
  $video.preload = 'auto';
  $videoWrap.appendChild($video);

  $card.appendChild($videoWrap);

  const $controls = document.createElement('div');
  $controls.className = 'howtoplay-controls';

  const $prevBtn = document.createElement('button');
  $prevBtn.type = 'button';
  $prevBtn.className = 'menu-btn howtoplay-nav-btn howtoplay-nav-btn--prev';
  $prevBtn.innerHTML =
    '<span class="howtoplay-nav-arrow">◀</span>' +
    '<span class="howtoplay-nav-label"></span>';

  const $dots = document.createElement('div');
  $dots.className = 'howtoplay-dots';
  const $dotEls = items.map((_, i) => {
    const $d = document.createElement('button');
    $d.type = 'button';
    $d.className = 'howtoplay-dot';
    $d.setAttribute('aria-label', String(i + 1));
    $d.addEventListener('click', () => goToStep(i));
    $dots.appendChild($d);
    return $d;
  });

  const $nextBtn = document.createElement('button');
  $nextBtn.type = 'button';
  $nextBtn.className = 'menu-btn howtoplay-nav-btn howtoplay-nav-btn--next';
  $nextBtn.innerHTML =
    '<span class="howtoplay-nav-label"></span>' +
    '<span class="howtoplay-nav-arrow">▶</span>';

  $controls.appendChild($prevBtn);
  $controls.appendChild($dots);
  $controls.appendChild($nextBtn);
  $card.appendChild($controls);

  $menuTutorialShell.appendChild($card);

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

  $prevBtn.addEventListener('click', () => {
    playMenuClick();
    goToStep(tutorialState.index - 1);
  });
  $nextBtn.addEventListener('click', () => {
    playMenuClick();
    if (tutorialState.index >= tutorialState.items.length - 1) {
      finishTutorial();
    } else {
      goToStep(tutorialState.index + 1);
    }
  });

  renderTutorialStep();
}

function finishTutorial() {
  hideMenu();
  if (onStartGame) onStartGame();
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
  $nextBtn.disabled = false;
  $nextBtn.classList.toggle('howtoplay-nav-btn--finish', isLast);

  $prevBtn.querySelector('.howtoplay-nav-label').textContent =
    t('howtoplay.prev');
  $nextBtn.querySelector('.howtoplay-nav-label').textContent = t(
    isLast ? 'howtoplay.finish' : 'howtoplay.next',
  );
  const $nextArrow = $nextBtn.querySelector('.howtoplay-nav-arrow');
  if ($nextArrow) $nextArrow.textContent = isLast ? '▶▶' : '▶';

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
  currentScreen = 'leaderboard';
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

  clearSubScreen();
  if (!$menuSettings) return;

  $menuSettings.hidden = false;

  const langs = [
    { code: 'en', label: t('lang.english') },
    { code: 'ru', label: t('lang.russian') },
  ];
  let langIdx = Math.max(
    0,
    langs.findIndex((lang) => lang.code === getLanguage()),
  );

  if (!$menuSettingsLangLabel || !$menuSettingsLangBtn) return;
  $menuSettingsLangBtn.textContent = `◀ ${langs[langIdx].label} ▶`;
  $menuSettingsLangBtn.onclick = () => {
    playMenuClick();
    langIdx = (langIdx + 1) % langs.length;
    setLanguage(langs[langIdx].code);
  };

  if (
    !$menuSettingsMusicLabel ||
    !$menuSettingsMusicInput ||
    !$menuSettingsMusicValue ||
    !$menuSettingsMusicMute
  )
    return;

  const initialMusic = S.musicVolume != null ? S.musicVolume : 0.5;
  let lastMusicVolume = initialMusic > 0 ? initialMusic : 0.5;

  function renderMusicMuteLabel(value) {
    $menuSettingsMusicMute.textContent = t(
      value <= 0 ? 'settings.unmute' : 'settings.mute',
    );
  }

  function applyMusicVolume(val) {
    if (val > 0) lastMusicVolume = val;
    $menuSettingsMusicInput.value = String(Math.round(val * 100));
    $menuSettingsMusicValue.textContent = `${$menuSettingsMusicInput.value}%`;
    renderMusicMuteLabel(val);
    S.musicVolume = val;
    if (S.musicSound) {
      void syncLoopingAudio(S.musicSound, MUSIC_VOLUME * val);
    }
    try {
      localStorage.setItem('lighthouse_music_vol', String(val));
    } catch (_) {}
  }

  $menuSettingsMusicInput.value = String(Math.round(initialMusic * 100));
  $menuSettingsMusicValue.textContent = `${$menuSettingsMusicInput.value}%`;
  renderMusicMuteLabel(initialMusic);

  $menuSettingsMusicInput.oninput = () => {
    applyMusicVolume(Number($menuSettingsMusicInput.value) / 100);
  };

  $menuSettingsMusicMute.onclick = () => {
    playMenuClick();
    if (S.musicVolume <= 0) {
      applyMusicVolume(lastMusicVolume > 0 ? lastMusicVolume : 0.5);
    } else {
      applyMusicVolume(0);
    }
  };

  if (
    !$menuSettingsSfxLabel ||
    !$menuSettingsSfxInput ||
    !$menuSettingsSfxValue ||
    !$menuSettingsSfxMute
  )
    return;

  const initialSfx = S.sfxVolume != null ? S.sfxVolume : 1;
  let lastSfxVolume = initialSfx > 0 ? initialSfx : 1;

  function renderSfxMuteLabel(value) {
    $menuSettingsSfxMute.textContent = t(
      value <= 0 ? 'settings.unmute' : 'settings.mute',
    );
  }

  function applySfxVolume(val) {
    if (val > 0) lastSfxVolume = val;
    $menuSettingsSfxInput.value = String(Math.round(val * 100));
    $menuSettingsSfxValue.textContent = `${$menuSettingsSfxInput.value}%`;
    renderSfxMuteLabel(val);
    S.sfxVolume = val;
    if (S.wavesSound) {
      void syncLoopingAudio(S.wavesSound, WAVES_VOLUME * val);
    }
    try {
      localStorage.setItem('lighthouse_sfx_vol', String(val));
    } catch (_) {}
  }

  $menuSettingsSfxInput.value = String(Math.round(initialSfx * 100));
  $menuSettingsSfxValue.textContent = `${$menuSettingsSfxInput.value}%`;
  renderSfxMuteLabel(initialSfx);

  $menuSettingsSfxInput.oninput = () => {
    applySfxVolume(Number($menuSettingsSfxInput.value) / 100);
  };

  $menuSettingsSfxMute.onclick = () => {
    playMenuClick();
    if (S.sfxVolume <= 0) {
      applySfxVolume(lastSfxVolume > 0 ? lastSfxVolume : 1);
    } else {
      applySfxVolume(0);
    }
  };

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

        // Keep leaderboard row name in sync when possible, but do not fail
        // the profile name update UX if this optional sync is blocked by rules.
        const synced = await syncCurrentUserLeaderboardDisplayName();
        if (!synced) {
          console.info('Leaderboard displayName sync skipped or unchanged');
        }

        $menuDisplayNameStatus.textContent = t('settings.displayNameSaved');
        $menuDisplayNameStatus.className =
          'menu-setting-name-status is-success';
        console.log(`👤 Display name saved: ${name}`);
      } catch (e) {
        console.warn('Display name update failed', e);
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

  clearSubScreen();
  if (!$menuSub) return;

  renderAuthorsScreen({
    container: $menuSub,
    creditsText: getCreditsText(),
    backHint: getBackHint(),
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
function showDiscordLink() {
  if ($discordLink) $discordLink.classList.add('is-visible');
}

function hideDiscordLink() {
  if ($discordLink) $discordLink.classList.remove('is-visible');
}

function hideMenu() {
  if ($menuOverlay) $menuOverlay.hidden = true;
  stopBgManMotion();
  clearSubScreen();
  if ($menuSettings) $menuSettings.hidden = true;
  hideTutorialScreen();
  hideBackBtn();
  currentScreen = null;
  hideAuthWidget();
  hideDiscordLink();
}

export function showMenu() {
  if (!$menuOverlay) return;
  $menuOverlay.hidden = false;
  startBgManMotion();
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
