import {
  signIn,
  signUp,
  signOut,
  prettyAuthError,
  onAuthChange,
  isSignedInReal,
} from './auth.js';
import { t, onLanguageChange } from './i18n.js';

let modal = null;
let mode = 'signin'; // 'signin' | 'signup'

function build() {
  if (modal) return modal;

  modal = document.createElement('div');
  modal.className = 'auth-modal-backdrop';
  modal.innerHTML = `
    <div class="auth-modal">
      <button class="auth-close" title="">×</button>
      <h2 class="auth-title"></h2>
      <div class="auth-tabs">
        <button class="auth-tab is-active" data-mode="signin"></button>
        <button class="auth-tab" data-mode="signup"></button>
      </div>
      <form class="auth-form">
        <label class="auth-field auth-field--name">
          <span></span>
          <input name="name" type="text" autocomplete="nickname" maxlength="24" />
        </label>
        <label class="auth-field">
          <span></span>
          <input name="email" type="email" required autocomplete="email" />
        </label>
        <label class="auth-field">
          <span></span>
          <input name="password" type="password" required minlength="6" autocomplete="current-password" />
        </label>
        <div class="auth-error" role="alert"></div>
        <button type="submit" class="auth-submit"></button>
      </form>
    </div>
  `;
  document.body.appendChild(modal);

  const form = modal.querySelector('.auth-form');
  const title = modal.querySelector('.auth-title');
  const submitBtn = modal.querySelector('.auth-submit');
  const errorEl = modal.querySelector('.auth-error');
  const nameField = modal.querySelector('.auth-field--name');
  const tabs = modal.querySelectorAll('.auth-tab');
  const closeBtn = modal.querySelector('.auth-close');
  const [nameSpan, emailSpan, passwordSpan] = modal.querySelectorAll(
    '.auth-field > span',
  );

  function applyStaticI18n() {
    closeBtn.title = t('auth.close');
    nameSpan.textContent = t('auth.fieldName');
    emailSpan.textContent = t('auth.fieldEmail');
    passwordSpan.textContent = t('auth.fieldPassword');
    for (const tab of tabs) {
      tab.textContent =
        tab.dataset.mode === 'signin'
          ? t('auth.tabSignIn')
          : t('auth.tabSignUp');
    }
  }

  function setMode(next) {
    mode = next;
    for (const tab of tabs) {
      tab.classList.toggle('is-active', tab.dataset.mode === mode);
    }
    if (mode === 'signup') {
      title.textContent = t('auth.signUp');
      submitBtn.textContent = t('auth.submitSignUp');
      nameField.style.display = '';
    } else {
      title.textContent = t('auth.signIn');
      submitBtn.textContent = t('auth.submitSignIn');
      nameField.style.display = 'none';
    }
    errorEl.textContent = '';
  }

  for (const tab of tabs) {
    tab.addEventListener('click', () => setMode(tab.dataset.mode));
  }

  // Rerender labels when language changes
  onLanguageChange(() => {
    applyStaticI18n();
    setMode(mode);
  });
  applyStaticI18n();

  modal.querySelector('.auth-close').addEventListener('click', () => {
    hideAuthModal();
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) hideAuthModal();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    submitBtn.disabled = true;
    const data = new FormData(form);
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
      errorEl.textContent = prettyAuthError(err);
    } finally {
      submitBtn.disabled = false;
    }
  });

  // Initial mode
  setMode('signin');

  modal._setMode = setMode;
  return modal;
}

export function showAuthModal(initialMode = 'signin') {
  const m = build();
  m._setMode(initialMode);
  m.classList.add('is-visible');
  const firstInput = m.querySelector(
    initialMode === 'signup'
      ? '.auth-field--name input'
      : 'input[name="email"]',
  );
  if (firstInput) setTimeout(() => firstInput.focus(), 30);
}

export function hideAuthModal() {
  if (modal) modal.classList.remove('is-visible');
}

export async function doSignOut() {
  try {
    await signOut();
  } catch (e) {
    console.warn('signOut failed', e);
  }
}

// ===== Account widget (top-right badge in menu) =====
let widget = null;

function buildWidget() {
  if (widget) return widget;

  widget = document.createElement('div');
  widget.className = 'auth-widget';
  widget.innerHTML = `
    <button class="auth-widget-btn auth-widget-btn--signin"></button>
    <div class="auth-widget-user" style="display:none">
      <span class="auth-widget-name"></span>
      <button class="auth-widget-btn auth-widget-btn--signout"></button>
    </div>
  `;
  document.body.appendChild(widget);

  const signinBtn = widget.querySelector('.auth-widget-btn--signin');
  const signoutBtn = widget.querySelector('.auth-widget-btn--signout');
  const userEl = widget.querySelector('.auth-widget-user');
  const nameEl = widget.querySelector('.auth-widget-name');

  function applyWidgetI18n() {
    signinBtn.textContent = t('widget.signIn');
    signoutBtn.textContent = t('widget.signOut');
    signoutBtn.title = t('widget.signOut');
  }

  applyWidgetI18n();
  onLanguageChange(applyWidgetI18n);

  signinBtn.addEventListener('click', () => showAuthModal('signin'));
  signoutBtn.addEventListener('click', () => doSignOut());

  onAuthChange((user) => {
    // Анонимных юзеров не показываем в виджете — для пользователя они =
    // "не залогинен". Кнопка "Войти" остаётся видна, но счёт за ним всё
    // равно пишется в Firestore под его анонимным uid.
    if (isSignedInReal(user)) {
      signinBtn.style.display = 'none';
      userEl.style.display = '';
      const label =
        (user.displayName && user.displayName.trim()) ||
        (user.email ? user.email.split('@')[0] : 'Капитан');
      nameEl.textContent = `👤 ${label}`;
    } else {
      signinBtn.style.display = '';
      userEl.style.display = 'none';
    }
  });

  return widget;
}

export function showAuthWidget() {
  const w = buildWidget();
  w.classList.add('is-visible');
}

export function hideAuthWidget() {
  if (widget) widget.classList.remove('is-visible');
}
