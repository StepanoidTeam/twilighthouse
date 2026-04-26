import {
  signIn,
  signUp,
  signOut,
  prettyAuthError,
  onAuthChange,
  isSignedInReal,
} from './auth.js';
import { t, onLanguageChange } from './i18n.js';
import { getAdminStatus } from './browser-tools.js';

const { $authModal, $authWidget } = globalThis;

let $modal = null;
let mode = 'signin'; // 'signin' | 'signup'

function build() {
  if ($modal) return $modal;

  $modal = $authModal;

  const $form = $modal.querySelector('.auth-form');
  const $title = $modal.querySelector('.auth-title');
  const $submitBtn = $modal.querySelector('.auth-submit');
  const $errorEl = $modal.querySelector('.auth-error');
  const $nameField = $modal.querySelector('.auth-field--name');
  const $$tabs = $modal.querySelectorAll('.auth-tab');
  const $closeBtn = $modal.querySelector('.auth-close');
  const [$nameSpan, $emailSpan, $passwordSpan] =
    $modal.querySelectorAll('.auth-field > span');

  function applyStaticI18n() {
    $closeBtn.title = t('auth.close');
    $nameSpan.textContent = t('auth.fieldName');
    $emailSpan.textContent = t('auth.fieldEmail');
    $passwordSpan.textContent = t('auth.fieldPassword');
    for (const $tab of $$tabs) {
      $tab.textContent =
        $tab.dataset.mode === 'signin'
          ? t('auth.tabSignIn')
          : t('auth.tabSignUp');
    }
  }

  function setMode(next) {
    mode = next;
    for (const $tab of $$tabs) {
      $tab.classList.toggle('is-active', $tab.dataset.mode === mode);
    }
    if (mode === 'signup') {
      $title.textContent = t('auth.signUp');
      $submitBtn.textContent = t('auth.submitSignUp');
      $nameField.style.display = '';
    } else {
      $title.textContent = t('auth.signIn');
      $submitBtn.textContent = t('auth.submitSignIn');
      $nameField.style.display = 'none';
    }
    $errorEl.textContent = '';
  }

  for (const $tab of $$tabs) {
    $tab.addEventListener('click', () => setMode($tab.dataset.mode));
  }

  // Rerender labels when language changes
  onLanguageChange(() => {
    applyStaticI18n();
    setMode(mode);
  });
  applyStaticI18n();

  $closeBtn.addEventListener('click', () => {
    hideAuthModal();
  });

  $modal.addEventListener('click', (e) => {
    if (e.target === $modal) hideAuthModal();
  });

  $form.addEventListener('submit', async (e) => {
    e.preventDefault();
    $errorEl.textContent = '';
    $submitBtn.disabled = true;
    const data = new FormData($form);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '');
    const name = String(data.get('name') || '').trim();
    try {
      if (mode === 'signup') {
        await signUp(email, password, name || email.split('@')[0]);
      } else {
        await signIn(email, password);
      }
      hideAuthModal();
    } catch (err) {
      $errorEl.textContent = prettyAuthError(err);
    } finally {
      $submitBtn.disabled = false;
    }
  });

  // Initial mode
  setMode('signin');

  $modal._setMode = setMode;
  return $modal;
}

export function showAuthModal(initialMode = 'signin') {
  const $modalEl = build();
  $modalEl._setMode(initialMode);
  $modalEl.classList.add('is-visible');
  const $firstInput = $modalEl.querySelector(
    initialMode === 'signup'
      ? '.auth-field--name input'
      : 'input[name="email"]',
  );
  if ($firstInput) setTimeout(() => $firstInput.focus(), 30);
}

export function hideAuthModal() {
  if ($modal) $modal.classList.remove('is-visible');
}

export async function doSignOut() {
  try {
    await signOut();
  } catch (e) {
    console.warn('signOut failed', e);
  }
}

// ===== Account widget (top-right badge in menu) =====
let $widget = null;

function buildWidget() {
  if ($widget) return $widget;

  $widget = $authWidget;

  const $signinBtn = $widget.querySelector('.auth-widget-btn--signin');
  const $signoutBtn = $widget.querySelector('.auth-widget-btn--signout');
  const $userEl = $widget.querySelector('.auth-widget-user');
  const $nameEl = $widget.querySelector('.auth-widget-name');

  function applyWidgetI18n() {
    $signinBtn.textContent = t('widget.signIn');
    $signoutBtn.textContent = t('widget.signOut');
    $signoutBtn.title = t('widget.signOut');
  }

  applyWidgetI18n();
  onLanguageChange(applyWidgetI18n);

  $signinBtn.addEventListener('click', () => showAuthModal('signin'));
  $signoutBtn.addEventListener('click', () => doSignOut());

  onAuthChange(async (user) => {
    // Анонимных юзеров не показываем в виджете — для пользователя они =
    // "не залогинен". Кнопка "Войти" остаётся видна, но счёт за ним всё
    // равно пишется в Firestore под его анонимным uid.
    if (isSignedInReal(user)) {
      $signinBtn.style.display = 'none';
      $userEl.style.display = '';
      const label =
        (user.displayName && user.displayName.trim()) ||
        (user.email ? user.email.split('@')[0] : 'Капитан');

      let displayText = `👤 ${label}`;

      // Check if user has admin claim
      try {
        const adminStatus = await getAdminStatus();
        if (adminStatus.admin) {
          displayText += ' 🛡️';
        }
      } catch (e) {
        // Silently fail if admin status check doesn't work
      }

      $nameEl.textContent = displayText;
    } else {
      $signinBtn.style.display = '';
      $userEl.style.display = 'none';
    }
  });

  return $widget;
}

export function showAuthWidget() {
  const w = buildWidget();
  w.classList.add('is-visible');
}

export function hideAuthWidget() {
  if ($widget) $widget.classList.remove('is-visible');
}
