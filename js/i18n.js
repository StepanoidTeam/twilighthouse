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
    'menu.newGame': 'New Game',
    'menu.leaderboard': 'Leaderboard',
    'menu.settings': 'Settings',
    'menu.authors': 'Credits',
    'menu.tutorial': 'How to Play',
    'credits.text': `
🎨 Concept Artists

@adriaaaaana
@r1m
@lina


💻 Programmers

@bobanko
@nuclme


🎲 Game Designers

@nuclme
@stepastepa
@adriaaaaana
@bobanko


🤖 AI Tools

GitHub Copilot


🎵 Music

suno.com


🔊 Sounds

pixabay.com
libsounds.com


⚙️ Technologies

PixiJS — 2D rendering engine
VS Code — code editor
Firebase — analytics & backend
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
    'leaderboard.col.rank': '#',
    'leaderboard.col.name': 'имя',
    'leaderboard.col.time': 'лучшее время',
    'leaderboard.col.date': 'дата',

    // Boot loader
    'boot.title': 'TWILIGHTHOUSE',
    'boot.loading': 'Loading twilighthouse assets…',
    'boot.progress': 'Loading assets {loaded}/{total}',
    'boot.ready': 'Ready',
    'boot.failed': 'Failed to load game assets',
    'boot.texture': 'Texture',
    'boot.audio': 'Sound',
    'boot.finalizing': 'Finalizing startup…',

    // Settings
    'settings.title': '⚙️ Settings',
    'settings.language': '🌐 Language',
    'settings.music': '🎵 Music',
    'settings.sfx': '🔊 Sound FX',
    'settings.mute': 'Mute',
    'settings.unmute': 'Unmute',
    'settings.displayName': '👤 Display Name',
    'settings.displayNamePlaceholder': 'Enter your name…',
    'settings.displayNameSave': 'Save',
    'settings.displayNameSaved': 'Saved!',
    'settings.displayNameError': 'Could not save name',
    'settings.displayNameGuestNote': 'Sign in to set a display name',
    'settings.displayNameAnon':
      'You are playing as a guest. Your name will appear in the leaderboard.',
    'settings.displayNameEmail': 'Your name will appear in the leaderboard.',
    'settings.displayNameTooShort': 'Name must be at least 1 character',
    'settings.displayNameTooLong': 'Name must be 30 characters or fewer',
    'settings.displayNameSaving': 'Saving…',
    'settings.displayNameEmpty': 'Enter a name to save',
    'lang.russian': 'Русский',
    'lang.english': 'English',
    'profile.guest': 'Guest',

    // How to play
    'howtoplay.title': 'How to Play',
    'howtoplay.items': [
      {
        icon: 'sprites/icons/wreck.png',
        text: 'Rotate the beam to light up approaching boats — they use your signal to navigate safely to shore',
      },
      {
        icon: 'sprites/icons/mermaid.png',
        text: "Mermaids swim toward the lighthouse in the dark — illuminate them to scare them off. Let 3 reach you and it's over",
      },
      {
        icon: 'sprites/icons/kraken.png',
        text: 'The Kraken lurks in darkness and charges at you — shine the beam on it to drive it away',
      },
      {
        icon: 'sprites/icons/warning.png',
        text: "Police boats are different — don't light them up. Every cop you illuminate confiscates a crate. Lose all 3 and the game ends very badly",
      },
      {
        icon: 'sprites/icons/lantern.png',
        text: 'The lamp burns out over time — the beam narrows and flickers. Keep an eye on it',
      },
      { icon: 'sprites/icons/trophy.png', text: 'Save 10 boats to win' },
    ],

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
    'gameOver.pattinson':
      '📦 Out of powder! Lighthouse keeper threw intern off cliff!',
    'gameOver.score': '💀 Game Over — {score}/{total} boats saved',
    'win.message': '🎉 You Win! All {total} boats saved!',
    'win.messageTime':
      '🎉 You Win! All {total} boats saved! Final time: {time}',

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
    'menu.newGame': 'Новая игра',
    'menu.leaderboard': 'Лидерборд',
    'menu.settings': 'Настройки',
    'menu.authors': 'Авторы',
    'menu.tutorial': 'Как играть',
    'credits.text': `
🎨 Концепт-художники

@adriaaaaana
@r1m
@lina


💻 Программисты

@bobanko
@nuclme


🎲 Геймдизайнеры

@nuclme
@stepastepa
@adriaaaaana
@bobanko


🤖 AI-инструменты

GitHub Copilot


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
    'leaderboard.col.rank': '#',
    'leaderboard.col.name': 'name',
    'leaderboard.col.time': 'best time',
    'leaderboard.col.date': 'date',

    'boot.title': 'Маяк',
    'boot.loading': 'Загрузка игровых ресурсов…',
    'boot.progress': 'Загружаем ресурсы {loaded}/{total}',
    'boot.ready': 'Готово',
    'boot.failed': 'Не удалось загрузить ресурсы игры',
    'boot.texture': 'Текстура',
    'boot.audio': 'Звук',
    'boot.finalizing': 'Завершаем запуск…',

    'settings.title': '⚙️ Настройки',
    'settings.language': '🌐 Язык',
    'settings.music': '🎵 Музыка',
    'settings.sfx': '🔊 Звуки',
    'settings.mute': 'Выкл',
    'settings.unmute': 'Вкл',
    'settings.displayName': '👤 Имя в рейтинге',
    'settings.displayNamePlaceholder': 'Введите имя…',
    'settings.displayNameSave': 'Сохранить',
    'settings.displayNameSaved': 'Сохранено!',
    'settings.displayNameError': 'Не удалось сохранить имя',
    'settings.displayNameGuestNote': 'Войдите, чтобы задать имя',
    'settings.displayNameAnon':
      'Вы играете как гость. Ваше имя будет отображаться в рейтинге.',
    'settings.displayNameEmail': 'Ваше имя будет отображаться в рейтинге.',
    'settings.displayNameTooShort': 'Имя должно содержать хотя бы 1 символ',
    'settings.displayNameTooLong': 'Имя не должно превышать 30 символов',
    'settings.displayNameSaving': 'Сохранение…',
    'settings.displayNameEmpty': 'Введите имя для сохранения',
    'profile.guest': 'Гость',
    'lang.russian': 'Русский',

    // How to play
    'howtoplay.title': 'Как играть',
    'howtoplay.items': [
      {
        icon: 'sprites/icons/wreck.png',
        text: 'Поворачивай луч, чтобы освещать приближающиеся лодки — они используют твой сигнал, чтобы добраться до берега',
      },
      {
        icon: 'sprites/icons/mermaid.png',
        text: 'Русалки плывут к маяку в темноте — освети их, чтобы отпугнуть. Если 3 доберутся до маяка — конец',
      },
      {
        icon: 'sprites/icons/kraken.png',
        text: 'Кракен таится в темноте и атакует маяк — направь луч на него, чтобы отогнать',
      },
      {
        icon: 'sprites/icons/warning.png',
        text: 'Полицейские катера — другая история. Не свети на них! Каждый освещённый коп забирает ящик. Потеряешь все 3 — плохой финал',
      },
      {
        icon: 'sprites/icons/lantern.png',
        text: 'Лампа постепенно сгорает — луч сужается и мигает. Следи за ней',
      },
      { icon: 'sprites/icons/trophy.png', text: 'Спаси 10 лодок — и победишь' },
    ],
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
    'gameOver.pattinson':
      '📦 Порошок закончился! Смотритель маяка сбросил стажера со скалы!',
    'gameOver.score': '💀 Game Over — спасено {score}/{total} кораблей',
    'win.message': '🎉 Победа! Спасены все {total} кораблей!',
    'win.messageTime':
      '🎉 Победа! Спасены все {total} кораблей! Финальное время: {time}',

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
