const AUTHORS_BG_FILES = [
  'sprites/wasted/police.png',
  'sprites/wasted/iceberg.png',
  'sprites/wasted/mermaid.png',
  'sprites/wasted/kraken.png',
  //   'sprites/wasted/pattinson.png',
  //   'sprites/wasted/peremoha.png',
];
const AUTHORS_ROTATE_MS = 18000;
const AUTHORS_FADE_MS = 3000;
const AUTHORS_FADE_HALF_MS = AUTHORS_FADE_MS / 2;

let activeState = null;

function clearAuthorsTimer(state) {
  if (state?.timerId) {
    window.clearTimeout(state.timerId);
    state.timerId = null;
  }
}

function cancelAuthorsAnimations(state) {
  if (!state?.animations) return;

  for (const animation of state.animations) {
    animation.cancel();
  }

  state.animations = [];
}

function restartAuthorsBackgroundPan($background) {
  $background.classList.remove('is-panning');
  $background.style.backgroundPosition = 'right center';
  void $background.offsetWidth;
  $background.classList.add('is-panning');
}

async function rotateAuthorsBackground(state) {
  const { $background, $blackout } = state;
  if (!$background || !$blackout) return;

  cancelAuthorsAnimations(state);

  const fadeToBlack = $blackout.animate([{ opacity: 0 }, { opacity: 1 }], {
    duration: AUTHORS_FADE_HALF_MS,
    easing: 'ease',
    fill: 'forwards',
  });
  state.animations = [fadeToBlack];

  try {
    await fadeToBlack.finished;
  } catch (_) {
    return;
  }

  if (activeState !== state) return;

  $blackout.style.opacity = '1';

  state.bgIndex = (state.bgIndex + 1) % AUTHORS_BG_FILES.length;
  $background.style.backgroundImage = `url("${AUTHORS_BG_FILES[state.bgIndex]}")`;
  restartAuthorsBackgroundPan($background);

  const fadeFromBlack = $blackout.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: AUTHORS_FADE_HALF_MS,
    easing: 'ease',
    fill: 'forwards',
  });
  state.animations = [fadeFromBlack];

  try {
    await fadeFromBlack.finished;
  } catch (_) {
    return;
  }

  if (activeState !== state) return;
  $blackout.style.opacity = '0';
  state.animations = [];
}

function queueAuthorsRotation(state) {
  clearAuthorsTimer(state);

  if (AUTHORS_BG_FILES.length < 2) return;

  state.timerId = window.setTimeout(async () => {
    if (activeState !== state) return;

    await rotateAuthorsBackground(state);

    if (activeState === state) {
      queueAuthorsRotation(state);
    }
  }, AUTHORS_ROTATE_MS);
}

export function destroyAuthorsScreen() {
  const state = activeState;
  if (!state) return;

  clearAuthorsTimer(state);
  cancelAuthorsAnimations(state);
  activeState = null;
}

export function renderAuthorsScreen({ container, creditsText }) {
  destroyAuthorsScreen();
  if (!container) return;

  container.hidden = false;

  const $background = container.querySelector('.menu-authors-bg');
  const $dim = container.querySelector('.menu-authors-dim');
  const $blackout = container.querySelector('.menu-authors-blackout');
  const $scroll = container.querySelector('.menu-authors-scroll');
  const $creditsText = container.querySelector('.menu-authors-text');

  if (!$background || !$dim || !$scroll || !$creditsText) return;

  $background.style.backgroundImage = `url("${AUTHORS_BG_FILES[0]}")`;
  restartAuthorsBackgroundPan($background);

  if ($blackout) {
    $blackout.style.opacity = '0';
  }

  $creditsText.textContent = creditsText;

  activeState = {
    container,
    $background,
    $blackout,
    bgIndex: 0,
    timerId: null,
    animations: [],
  };

  queueAuthorsRotation(activeState);
}
