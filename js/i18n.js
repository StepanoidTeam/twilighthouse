// ===== Lightweight i18n =====
// Default language is English. Stored in localStorage under 'lighthouse_lang'.
// Usage:
//   import { t, getLanguage, setLanguage, onLanguageChange } from './i18n.js';
//   t('menu.newGame')
//   t('gameOver.boats', { n: 3 })

const STORAGE_KEY = 'lighthouse_lang';
const DEFAULT_LANG = 'en';
const SUPPORTED = ['en', 'ru'];

const DICT = {
  en: {
    // Main menu
    'menu.newGame': '🎮  New Game',
    'menu.leaderboard': '🏆  Leaderboard',
    'menu.settings': '⚙️  Settings',
    'menu.authors': '✍️  Credits',
    'menu.tutorial': '📖  How to Play',
    'credits.text': `
🎨 Concept Artists

@adriana
@r1m
@lina


💻 Programmers

@bobanko
@noki_a
@claude


🎲 Game Designers

@noki_a
@stepastepa
@adriana
@bobanko


🤖 AI Tools

GitHub Copilot
ChatGPT
Claude


🎵 Music

suno.com


🔊 Sounds

pixabay.com
libsounds.com


⚙️ Technologies

PixiJS — 2D rendering engine
Firebase — analytics & backend
VS Code — code editor
Photopea — image editor


🌊 Thanks for playing! 🌊
`,

    // Hints
    'hint.main': '↑↓ / W S — navigate  •  Enter / E — select  •  Q — back',
    'hint.back': 'Q / Escape — back',
    'hint.intro': '◀ ▶ — pages  •  Esc — skip',
    'btn.back': 'Back',

    // Intro / comics
    'intro.start': 'Start',
    'intro.skip': 'Skip',

    // Leaderboard
    'leaderboard.title': '🏆 Leaderboard',
    'leaderboard.subtitle': 'Top lighthouse keepers — who lasted the longest',
    'leaderboard.loading': 'Loading…',
    'leaderboard.loadError': 'Failed to load leaderboard',
    'leaderboard.empty': 'No one is in the top yet — be the first!',
    'leaderboard.you': '(you)',
    'leaderboard.signInPrompt': 'Sign in to appear in the leaderboard',

    // Settings
    'settings.title': '⚙️ Settings',
    'settings.language': '🌐 Language',
    'settings.music': '🎵 Music',
    'settings.sfx': '🔊 Sound FX',
    'lang.russian': 'Русский',
    'lang.english': 'English',

    // Game over / overlay
    'overlay.restart': 'Restart',
    'overlay.toMenu': 'Menu',
    'overlay.exit': 'Exit',
    'overlay.resume': 'Resume',
    'overlay.pressToPlayAgain': 'Press to play again',
    'exit.confirm': '⏸️ Exit to menu?',

    'gameOver.boats': '💀 Game Over — {n} boats sunk!',
    'gameOver.mermaids': '💀 Game Over — {n} mermaids reached the lighthouse!',
    'gameOver.police': '🚔 Arrested! Police captured the lighthouse!',
    'gameOver.kraken': '🦑 The Kraken captured the lighthouse!',
    'gameOver.pattinson': '📦 Out of powder! Lighthouse keeper threw intern off cliff!',
    'gameOver.score': '💀 Game Over — {score}/{total} boats saved',
    'win.message': '🎉 You Win! All {total} boats saved!',

    // Auth modal
    'auth.signIn': 'Sign in',
    'auth.signUp': 'Sign up',
    'auth.tabSignIn': 'Sign in',
    'auth.tabSignUp': 'Sign up',
    'auth.fieldName': 'Nickname',
    'auth.fieldEmail': 'Email',
    'auth.fieldPassword': 'Password',
    'auth.submitSignIn': 'Sign in',
    'auth.submitSignUp': 'Create account',
    'auth.close': 'Close',

    // Auth widget
    'widget.signIn': '👤 Sign in',
    'widget.signOut': 'Sign out',

    // Auth errors
    'err.invalidEmail': 'Invalid email',
    'err.emailInUse': 'This email is already registered',
    'err.weakPassword': 'Password is too weak (min 6 characters)',
    'err.wrongCreds': 'Wrong email or password',
    'err.tooManyRequests': 'Too many attempts, try again later',
    'err.network': 'Network problem',
    'err.unknown': 'Unknown error',
  },

  ru: {
    'menu.newGame': '🎮  Новая игра',
    'menu.leaderboard': '🏆  Лидерборд',
    'menu.settings': '⚙️  Настройки',
    'menu.authors': '✍️  Авторы',
    'menu.tutorial': '📖  Как играть',
    'credits.text': `
🎨 Концепт-художники

@adriana
@r1m
@lina


💻 Программисты

@bobanko
@noki_a
@claude


🎲 Геймдизайнеры

@noki_a
@stepastepa
@adriana
@bobanko


🤖 AI-инструменты

GitHub Copilot
ChatGPT
Claude


🎵 Музыка

suno.com


🔊 Звуки

pixabay.com
libsounds.com


⚙️ Технологии

PixiJS — 2D rendering engine
Firebase — analytics & backend
VS Code — code editor
Photopea — image editor


🌊 Спасибо за игру! 🌊
`,

    'hint.main': '↑↓ / W S — навигация  •  Enter / E — выбор  •  Q — назад',
    'hint.back': 'Q / Escape — назад',
    'hint.intro': '◀ ▶ — страницы  •  Esc — пропустить',
    'btn.back': 'Назад',

    'intro.start': 'Начать',
    'intro.skip': 'Пропустить',

    'leaderboard.title': '🏆 Лидерборд',
    'leaderboard.subtitle': 'Топ смотрителей маяка — кто продержался дольше',
    'leaderboard.loading': 'Загрузка…',
    'leaderboard.loadError': 'Не удалось загрузить лидерборд',
    'leaderboard.empty': 'Пока никто не попал в топ — стань первым!',
    'leaderboard.you': '(вы)',
    'leaderboard.signInPrompt': 'Войдите, чтобы попасть в лидерборд',

    'settings.title': '⚙️ Настройки',
    'settings.language': '🌐 Язык',
    'settings.music': '🎵 Музыка',
    'settings.sfx': '🔊 Звуки',
    'lang.russian': 'Русский',
    'lang.english': 'English',

    'overlay.restart': 'Заново',
    'overlay.toMenu': 'В меню',
    'overlay.exit': 'Выйти',
    'overlay.resume': 'Вернуться',
    'overlay.pressToPlayAgain': 'Нажмите, чтобы сыграть снова',
    'exit.confirm': '⏸️ Выйти в меню?',

    'gameOver.boats': '💀 Game Over — потоплено кораблей: {n}!',
    'gameOver.mermaids': '💀 Game Over — русалки добрались до маяка: {n}!',
    'gameOver.police': '🚔 Арест! Полиция захватила маяк!',
    'gameOver.kraken': '🦑 Кракен захватил маяк!',
    'gameOver.pattinson': '📦 Порошок закончился! Смотритель маяка сбросил стажера со скалы!',
    'gameOver.score': '💀 Game Over — спасено {score}/{total} кораблей',
    'win.message': '🎉 Победа! Спасены все {total} кораблей!',

    'auth.signIn': 'Вход',
    'auth.signUp': 'Регистрация',
    'auth.tabSignIn': 'Войти',
    'auth.tabSignUp': 'Регистрация',
    'auth.fieldName': 'Ник',
    'auth.fieldEmail': 'Email',
    'auth.fieldPassword': 'Пароль',
    'auth.submitSignIn': 'Войти',
    'auth.submitSignUp': 'Зарегистрироваться',
    'auth.close': 'Закрыть',

    'widget.signIn': '👤 Войти',
    'widget.signOut': 'Выйти',

    'err.invalidEmail': 'Некорректный email',
    'err.emailInUse': 'Этот email уже зарегистрирован',
    'err.weakPassword': 'Слишком простой пароль (минимум 6 символов)',
    'err.wrongCreds': 'Неверный email или пароль',
    'err.tooManyRequests': 'Слишком много попыток, попробуйте позже',
    'err.network': 'Проблема с сетью',
    'err.unknown': 'Неизвестная ошибка',
  },
};

// ===== State =====
function readSaved() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v && SUPPORTED.includes(v)) return v;
  } catch (_) {}
  return DEFAULT_LANG;
}

let currentLang = readSaved();
const listeners = new Set();

export function getLanguage() {
  return currentLang;
}

export function setLanguage(lang) {
  if (!SUPPORTED.includes(lang)) return;
  if (lang === currentLang) return;
  currentLang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch (_) {}
  for (const fn of listeners) {
    try {
      fn(lang);
    } catch (e) {
      console.error('i18n listener error', e);
    }
  }
}

export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getSupportedLanguages() {
  return SUPPORTED.slice();
}

/** Translate key with optional {placeholder} params. */
export function t(key, params) {
  const dict = DICT[currentLang] || DICT[DEFAULT_LANG];
  let str = dict[key];
  if (str === undefined) {
    // Fall back to default language, then to the key itself
    str = (DICT[DEFAULT_LANG] && DICT[DEFAULT_LANG][key]) || key;
  }
  if (params) {
    str = str.replace(/\{(\w+)\}/g, (m, name) =>
      params[name] !== undefined ? String(params[name]) : m,
    );
  }
  return str;
}
