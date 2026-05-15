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
    'menu.shop': 'Harbor Shop',
    'menu.leaderboard': 'Leaderboard',
    'menu.achievements': 'Achievements',
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
    'hint.back': 'back',
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
    'leaderboard.col.name': 'name',
    'leaderboard.col.level': 'level',
    'leaderboard.col.time': 'best time',
    'leaderboard.col.date': 'date',

    'achievements.title': '🏅 Achievements',
    'achievements.subtitle': 'Long-term milestones for your runs',
    'achievements.progress': '{value}/{target}',
    'achievements.complete': 'Completed',
    'achievements.done': 'Unlocked',
    'achievements.locked': 'Keep going',
    'achievements.items.sunk_cops.title': 'Harbor Saboteur',
    'achievements.items.sunk_cops.desc': 'Sink 10 cop boats across all runs.',
    'achievements.items.repelled_kraken.title': 'Deep Sea Hunter',
    'achievements.items.repelled_kraken.desc':
      'Repel 3 krakens across all runs.',
    'achievements.items.repelled_mermaids.title': 'Siren Whisperer',
    'achievements.items.repelled_mermaids.desc':
      'Scare away 10 mermaids across all runs.',
    'achievements.items.delivered_boats.title': 'Harbor Master',
    'achievements.items.delivered_boats.desc':
      'Escort 20 smuggler boats to the harbor across all runs.',
    'achievements.items.nights_won.title': 'Night Watch',
    'achievements.items.nights_won.desc': 'Survive to dawn 10 times.',

    'shop.title': 'Harbor shop',
    'shop.nightsWon': 'Nights survived (dawn reached): {n}',
    'shop.wallet': 'Supplies in the warehouse',
    'shop.buy': 'Buy',
    'shop.owned': 'Owned',
    'shop.cantAfford': 'Not enough supplies',
    'shop.items.extra_heart.name': 'Spare lifebelt',
    'shop.items.extra_heart.desc':
      'Start each run with one extra heart — more room for mistakes at the lighthouse.',
    'shop.items.quality_wick.name': 'Quality wick mix',
    'shop.items.quality_wick.desc':
      'Your lamp burns out about 25% slower — a little more time before the beam fades.',

    // Boot loader
    'boot.title': 'TWILIGHTHOUSE',
    'boot.loading': 'Loading twilighthouse assets…',
    'boot.progress': 'Loading assets {loaded}/{total}',
    'boot.ready': 'Ready',
    'boot.failed': 'Failed to load game assets',
    'boot.texture': 'Texture',
    'boot.audio': 'Sound',
    'boot.video': 'Video',
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
    'howtoplay.prev': 'Prev',
    'howtoplay.next': 'Next',
    'howtoplay.finish': 'Play',
    'howtoplay.skip': 'Skip',
    'howtoplay.items': [
      {
        video: 'tutorial-vids/smugglers.mp4',
        title: 'Smugglers',
        text: 'Lit boats find the harbor safe. Help the smugglers.',
      },
      {
        video: 'tutorial-vids/cops.mp4',
        title: 'Cops',
        text: "Don't light the cops. Sink them before they reach the lighthouse.",
      },
      {
        video: 'tutorial-vids/mermaid.mp4',
        title: 'Mermaids',
        text: 'SCARE MERMAIDS AWAY!',
      },
      {
        video: 'tutorial-vids/kraken.mp4',
        title: 'Kraken',
        text: 'Repel the kraken with your beam.',
      },
    ],

    // Game over / overlay
    'overlay.restart': 'Restart',
    'overlay.toMenu': 'Menu',
    'overlay.exit': 'Exit',
    'overlay.resume': 'Resume',
    'overlay.continue': 'Continue',
    'overlay.pressToPlayAgain': 'Press to play again',
    'exit.confirm': '⏸️ Exit to menu?',

    'gameOver.title': 'Game Over',
    'gameOver.boats': '💀 {n} boats sunk!',
    'gameOver.mermaids': '💀 {n} mermaids reached the lighthouse!',
    'gameOver.police': '🚔 Arrested! Police captured the lighthouse!',
    'gameOver.kraken': '🦑 The Kraken captured the lighthouse!',
    'gameOver.pattinson':
      '📦 Out of powder! Lighthouse keeper threw intern off cliff!',
    'gameOver.score': '💀 {score}/{total} boats saved',
    'win.message': '🎉 You Win! All {total} boats saved!',
    'win.messageTime':
      '🎉 You Win! All {total} boats saved! Final time: {time}',
    'win.title': '🎉 Victory!',
    'win.nightSubtitle': 'The night is over!',
    'win.statLamps': 'Lamps delivered',
    'win.statCrates': 'Crates delivered',
    'win.statTime': 'Final time',
    'resultStats.cargoTitle': 'Collected Cargo',
    'resultStats.title': 'Night Review',
    'resultStats.deliveredBoats': 'Smugglers saved',
    'resultStats.smugglersSunk': 'Smugglers sunk',
    'resultStats.sunkCops': 'Cops sunk',
    'resultStats.repelledMermaids': 'Mermaids repelled',
    'resultStats.repelledKraken': 'Krakens repelled',
    'resultStats.copsArrived': 'Cops reached the lighthouse',
    'resultStats.mermaidsArrived': 'Mermaids reached the lighthouse',
    'resultStats.krakensArrived': 'Krakens reached the lighthouse',

    'cargo.💡': 'Lamps',
    'cargo.📦': 'Crates',
    'cargo.⚙️': 'Parts',
    'cargo.🧨': 'Dynamite',
    'cargo.🥃': 'Rum',
    'cargo.🛢️': 'Fuel',

    // Levels
    'hud.night': 'Night',
    'hud.lesson.prefix': 'Lesson {n}',
    'hud.level.prefix': 'Level {n}',
    'hud.level.idle': 'survive',

    // Goal checklist (HUD): verbs + nouns with EN plural forms (one/other)
    'goal.delivered_boats.one': 'Escort {n} smuggler',
    'goal.delivered_boats.other': 'Escort {n} smugglers',
    'goal.sunk_cops.one': 'Sink {n} cop',
    'goal.sunk_cops.other': 'Sink {n} cops',
    'goal.repelled_kraken.one': 'Repel {n} kraken',
    'goal.repelled_kraken.other': 'Repel {n} krakens',
    'goal.repelled_mermaids.one': 'Repel {n} mermaid',
    'goal.repelled_mermaids.other': 'Repel {n} mermaids',

    'level.l1.title': 'Lesson 1',
    'level.l1.sub': 'Guide smuggler boats into the harbor safely',
    'level.l2.title': 'Lesson 2',
    'level.l2.sub': 'Sink the cops before they reach the lighthouse',
    'level.l3.title': 'Lesson 3',
    'level.l3.sub': 'Scare off mermaids before they reach the lighthouse',
    'level.freeplay.title': 'Night Watch',
    'level.freeplay.sub': 'Hold out until dawn',
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
    'widget.signOut': '🚪 Sign out',

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
    'menu.shop': 'Прилавок',
    'menu.leaderboard': 'Лидерборд',
    'menu.achievements': 'Ачивки',
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
    'hint.back': 'назад',
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
    'leaderboard.col.name': 'имя',
    'leaderboard.col.level': 'уровень',
    'leaderboard.col.time': 'лучшее время',
    'leaderboard.col.date': 'дата',

    'achievements.title': '🏅 Ачивки',
    'achievements.subtitle': 'Долгие цели на все забеги',
    'achievements.progress': '{value}/{target}',
    'achievements.complete': 'Выполнено',
    'achievements.done': 'Открыто',
    'achievements.locked': 'Продолжай',
    'achievements.items.sunk_cops.title': 'Портовый диверсант',
    'achievements.items.sunk_cops.desc':
      'Потопить 10 копов за все забеги.',
    'achievements.items.repelled_kraken.title': 'Охотник на глубинных',
    'achievements.items.repelled_kraken.desc':
      'Отогнать 3 кракена за все забеги.',
    'achievements.items.repelled_mermaids.title': 'Шепот сирен',
    'achievements.items.repelled_mermaids.desc':
      'Отогнать 10 русалок за все забеги.',
    'achievements.items.delivered_boats.title': 'Хозяин порта',
    'achievements.items.delivered_boats.desc':
      'Провести 20 лодок контрабандистов в гавань за все забеги.',
    'achievements.items.nights_won.title': 'Ночной дозор',
    'achievements.items.nights_won.desc': 'Дожить до рассвета 10 раз.',

    'shop.title': 'Прилавок в порту',
    'shop.nightsWon': 'Ночей пережито (дождались рассвета): {n}',
    'shop.wallet': 'Запасы на складе',
    'shop.buy': 'Купить',
    'shop.owned': 'Уже куплено',
    'shop.cantAfford': 'Не хватает товара',
    'shop.items.extra_heart.name': 'Запасной пояс',
    'shop.items.extra_heart.desc':
      'Каждый забег начинается с одной дополнительной жизни — больше шансов удержать маяк.',
    'shop.items.quality_wick.name': 'Качественная фитильная смесь',
    'shop.items.quality_wick.desc':
      'Лампа сгорает примерно на четверть дольше — чуть больше времени, пока луч не потускнеет.',

    'boot.title': 'Маяк',
    'boot.loading': 'Загрузка игровых ресурсов…',
    'boot.progress': 'Загружаем ресурсы {loaded}/{total}',
    'boot.ready': 'Готово',
    'boot.failed': 'Не удалось загрузить ресурсы игры',
    'boot.texture': 'Текстура',
    'boot.audio': 'Звук',
    'boot.video': 'Видео',
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
    'howtoplay.prev': 'Назад',
    'howtoplay.next': 'Дальше',
    'howtoplay.finish': 'Играть',
    'howtoplay.skip': 'Пропустить',
    'howtoplay.items': [
      {
        video: 'tutorial-vids/smugglers.mp4',
        title: 'Контрабандисты',
        text: 'Освещённые лодки доходят до бухты. Помоги контрабандистам.',
      },
      {
        video: 'tutorial-vids/cops.mp4',
        title: 'Копы',
        text: 'Не свети на копов. Потопи их до маяка.',
      },
      {
        video: 'tutorial-vids/mermaid.mp4',
        title: 'Русалки',
        text: 'ОТПУГИВАЙ РУСАЛОК!',
      },
      {
        video: 'tutorial-vids/kraken.mp4',
        title: 'Кракен',
        text: 'Отгоняй кракена лучом маяка.',
      },
    ],
    'lang.english': 'English',

    'overlay.restart': 'Заново',
    'overlay.toMenu': 'В меню',
    'overlay.exit': 'Выйти',
    'overlay.resume': 'Вернуться',
    'overlay.continue': 'Продолжить',
    'overlay.pressToPlayAgain': 'Нажмите, чтобы сыграть снова',
    'exit.confirm': '⏸️ Выйти в меню?',

    'gameOver.title': 'Game Over',
    'gameOver.boats': '💀 Потоплено кораблей: {n}!',
    'gameOver.mermaids': '💀 Русалки добрались до маяка: {n}!',
    'gameOver.police': '🚔 Арест! Полиция захватила маяк!',
    'gameOver.kraken': '🦑 Кракен захватил маяк!',
    'gameOver.pattinson':
      '📦 Порошок закончился! Смотритель маяка сбросил стажера со скалы!',
    'gameOver.score': '💀 Спасено {score}/{total} кораблей',
    'win.message': '🎉 Победа! Спасены все {total} кораблей!',
    'win.messageTime':
      '🎉 Победа! Спасены все {total} кораблей! Финальное время: {time}',
    'win.title': '🎉 Победа!',
    'win.nightSubtitle': 'Ночь пережита!',
    'win.statLamps': 'Доставлено ламп',
    'win.statCrates': 'Доставлено ящиков',
    'win.statTime': 'Финальное время',
    'resultStats.cargoTitle': 'Собранные товары',
    'resultStats.title': 'Обзор ночи',
    'resultStats.deliveredBoats': 'Спасено контрабандистов',
    'resultStats.smugglersSunk': 'Потоплено контрабандистов',
    'resultStats.sunkCops': 'Потоплено копов',
    'resultStats.repelledMermaids': 'Отогнано русалок',
    'resultStats.repelledKraken': 'Отогнано кракенов',
    'resultStats.copsArrived': 'Копы достигли маяка',
    'resultStats.mermaidsArrived': 'Русалки достигли маяка',
    'resultStats.krakensArrived': 'Кракены достигли маяка',

    'cargo.💡': 'Лампы',
    'cargo.📦': 'Ящики',
    'cargo.⚙️': 'Детали',
    'cargo.🧨': 'Динамит',
    'cargo.🥃': 'Ром',
    'cargo.🛢️': 'Топливо',

    // Levels
    'hud.night': 'Ночь',
    'hud.lesson.prefix': 'Урок {n}',
    'hud.level.prefix': 'Уровень {n}',
    'hud.level.idle': 'выжить',

    // Чек-лист целей (HUD): глагол + существительное в нужной форме (1 / 2-4 / 5+)
    'goal.delivered_boats.one': 'Сопроводи {n} контрабандиста',
    'goal.delivered_boats.few': 'Сопроводи {n} контрабандиста',
    'goal.delivered_boats.many': 'Сопроводи {n} контрабандистов',
    'goal.sunk_cops.one': 'Потопи {n} копа',
    'goal.sunk_cops.few': 'Потопи {n} копа',
    'goal.sunk_cops.many': 'Потопи {n} копов',
    'goal.repelled_kraken.one': 'Отгони {n} кракена',
    'goal.repelled_kraken.few': 'Отгони {n} кракена',
    'goal.repelled_kraken.many': 'Отгони {n} кракенов',
    'goal.repelled_mermaids.one': 'Отгони {n} русалку',
    'goal.repelled_mermaids.few': 'Отгони {n} русалки',
    'goal.repelled_mermaids.many': 'Отгони {n} русалок',

    'level.l1.title': 'Урок 1',
    'level.l1.sub': 'Проводи лодки контрабандистов в гавань целыми',
    'level.l2.title': 'Урок 2',
    'level.l2.sub': 'Топи копов, пока они не добрались до маяка',
    'level.l3.title': 'Урок 3',
    'level.l3.sub': 'Отпугни русалок, прежде чем они доберутся до маяка',
    'level.freeplay.title': 'Длинная ночь',
    'level.freeplay.sub': 'Продержись до рассвета',
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
    'widget.signOut': '🚪 Выйти',

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
  return null;
}

// Pick a default based on browser/OS language. Russian wins if any of the
// user's preferred locales is Russian; everything else falls back to English.
function detectSystemLanguage() {
  const candidates = [
    ...(Array.isArray(navigator?.languages) ? navigator.languages : []),
    navigator?.language,
  ].filter(Boolean);
  for (const tag of candidates) {
    if (String(tag).toLowerCase().startsWith('ru')) return 'ru';
  }
  return DEFAULT_LANG;
}

let currentLang = readSaved() ?? detectSystemLanguage();
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
  applyI18nToDOM();
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

/**
 * Pick the CLDR-style plural category for a count in the current language.
 * Returns one of: 'one' | 'few' | 'many' | 'other'.
 *   - ru: 1, 21, 31...   → 'one'
 *         2-4, 22-24...  → 'few'
 *         0, 5-20, 25-30 → 'many'
 *   - en (and default):  1 → 'one', else → 'other'
 */
export function pluralCategory(n, lang = currentLang) {
  const v = Math.abs(Math.trunc(n));
  if (lang === 'ru') {
    const mod10 = v % 10;
    const mod100 = v % 100;
    if (mod10 === 1 && mod100 !== 11) return 'one';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
    return 'many';
  }
  return v === 1 ? 'one' : 'other';
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

/** Apply translations to all elements with data-i18n attribute */
export function applyI18nToDOM() {
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    element.textContent = t(key);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    const key = element.getAttribute('data-i18n-placeholder');
    element.placeholder = t(key);
  });
}
