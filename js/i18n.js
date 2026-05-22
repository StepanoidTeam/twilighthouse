// ===== Lightweight i18n =====
// Default language is English. Stored in localStorage under 'lighthouse_lang'.
// Usage:
//   import { t, getLanguage, setLanguage, onLanguageChange } from './i18n.js';
//   t('menu.newGame')
//   t('gameOver.boats')

import { ACHIEVEMENTS_I18N } from './i18n/achievements.js';

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

    ...ACHIEVEMENTS_I18N.en,

    'shop.title': 'Harbor shop',
    'shop.playerLevel': 'Reached level {n}',
    'shop.nightsWon': 'Nights survived (dawn reached): {n}',
    'shop.wallet': 'Supplies in the warehouse',
    'shop.buy': 'Buy',
    'shop.upgrade': 'Upgrade',
    'shop.owned': 'Owned',
    'shop.maxLevel': 'Max level',
    'shop.level': 'Lv {n}/{max}',
    'shop.cantAfford': 'Not enough supplies',
    'shop.reset': 'Reset purchases',
    'shop.resetConfirm': 'Reset all shop purchases and refund all spent supplies?',
    'shop.resetCancel': 'Cancel',
    'shop.resetApply': 'Reset purchases',
    'shop.items.extra_heart.name': 'Life ring',
    'shop.items.extra_heart.desc':
      'Start each run with 1 extra heart.',
    'shop.items.quality_wick.name': 'Sturdy wick',
    'shop.items.quality_wick.desc':
      'Your lamp burns about 25% longer.',
    'shop.items.fresnel_lens.name': 'Fresnel lens',
    'shop.items.fresnel_lens.desc':
      'The beam lasts about 20% longer.',
    'shop.items.lamp_oil_crate.name': 'Crate of lamp oil',
    'shop.items.lamp_oil_crate.desc':
      '+20 lamp oil reserve.',
    'shop.items.spare_generator.name': 'Spare generator',
    'shop.items.spare_generator.desc':
      'Start each night with extra lamp charge.',
    'shop.items.fast_gear.name': 'Fast drive',
    'shop.items.fast_gear.desc':
      '+10% beam rotation speed per level (max +30%). Current: +{bonus}%. Next: +{nextBonus}%.',
    'shop.items.cold_lamp.name': 'Cold lamp',
    'shop.items.cold_lamp.desc':
      'The lamp burns about 12% slower.',
    'shop.items.moonlight.name': 'Moonlight',
    'shop.items.moonlight.desc':
      'A small area around the lighthouse stays slightly visible even outside the beam.',
    'shop.items.guiding_signal.name': 'Guiding signal',
    'shop.items.guiding_signal.desc':
      'Smuggler boats keep direction better in darkness.',
    'shop.items.contraband_route.name': 'Contraband route',
    'shop.items.contraband_route.desc':
      'After several saved boats in a row, there is a chance to gain an extra rare resource.',
    'shop.items.alarm_bell.name': 'Alarm bell',
    'shop.items.alarm_bell.desc':
      'The first mermaid each night is auto-marked for a brief moment.',
    'shop.items.phosphor_water.name': 'Phosphorescent water',
    'shop.items.phosphor_water.desc':
      'Enemies leave a glowing trace for a short time after leaving the beam.',

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
    'boot.tips': [
      '🔦 Don’t keep the beam in one place for too long — threats come from every side.',
      '🧜 If a mermaid disappears into darkness, it doesn’t mean she has swum away.',
      '🚨 Even one lit police boat is already a problem.',
      '🪔 Save the lamp at the start of the night. By the end, every centimeter of beam is priceless.',
      '⚓ Sometimes it is better to let one boat pass than lose the lighthouse.',
      '🌊 Watch the screen edges — danger rarely comes through the center.',
      '📦 Losing smugglers is easier than it seems, especially in panic.',
      '🐙 The kraken likes to attack when you are distracted by something else.',
      '🌫 In fog, orient by boat lights, not silhouettes.',
      '🔥 Flickering lamp is a bad sign. Usually everything gets worse after that.',
    ],

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
    'exit.settings': '⚙️ Settings',

    'gameOver.title': 'Game Over',
    'gameOver.boats': '💀 A smuggler boat sank!',
    'gameOver.mermaids': '🧜‍♀️ Mermaids captured the lighthouse!',
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
    'resultStats.playerLevel': 'Reached level',
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
    'hud.xp': 'Experience',

    'perk.xpGain': '+{n} XP',
    'perk.pick.title': 'Choose a perk',
    'perk.stack': 'Level {n}',
    'perk.better_oil.title': 'Better oil',
    'perk.better_oil.desc': 'The lamp burns longer.',
    'perk.brighter_beam.title': 'Wider beam',
    'perk.brighter_beam.desc': 'The light cone gets wider.',
    'perk.slow_cops.title': 'Slower cops',
    'perk.slow_cops.desc': 'Police boats move slower.',
    'perk.beam_width.title': 'Max beam width',
    'perk.beam_width.desc':
      'Raises the beam width cap by 10° per level.',
    'perk.siren_eye.title': "Siren's eye",
    'perk.siren_eye.desc':
      'Mermaids spawn less often, but move faster.',
    'perk.experienced_keeper.title': 'Experienced keeper',
    'perk.experienced_keeper.desc':
      'Earn 10% more supplies each night.',
    'perk.occult_lamp.title': 'Occult lamp',
    'perk.occult_lamp.desc':
      'Purple lamps on icebergs lure mermaids in and scare them away on contact. Kraken appear more often.',
    'perk.old_map.title': 'Old map',
    'perk.old_map.desc':
      'Shows icons for all hidden enemies and smugglers not in the beam for 20 seconds.',
    'perk.new_icebergs.title': 'New icebergs',
    'perk.new_icebergs.desc': '3 new icebergs appear in random spots.',
    'perk.maxed': 'Max level',
    'perk.fullHealth': 'Full health',
    'perk.repair_lighthouse.title': 'Repair the lighthouse',
    'perk.repair_lighthouse.desc': 'Restore 1 heart.',
    'perk.repair_lighthouse.healed': '+1 ❤️',

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

    ...ACHIEVEMENTS_I18N.ru,

    'shop.title': 'Прилавок в порту',
    'shop.playerLevel': 'Достигнутый уровень {n}',
    'shop.nightsWon': 'Ночей пережито (дождались рассвета): {n}',
    'shop.wallet': 'Запасы на складе',
    'shop.buy': 'Купить',
    'shop.upgrade': 'Улучшить',
    'shop.owned': 'Уже куплено',
    'shop.maxLevel': 'Макс. уровень',
    'shop.level': 'Ур. {n}/{max}',
    'shop.cantAfford': 'Не хватает товара',
    'shop.reset': 'Сбросить покупки',
    'shop.resetConfirm': 'Сбросить все покупки в магазине и вернуть все потраченные ресурсы?',
    'shop.resetCancel': 'Отмена',
    'shop.resetApply': 'Сбросить покупки',
    'shop.items.extra_heart.name': 'Спасательный круг',
    'shop.items.extra_heart.desc':
      'Каждый забег начинается с 1 дополнительной жизни.',
    'shop.items.quality_wick.name': 'Надёжный фитиль',
    'shop.items.quality_wick.desc':
      'Лампа горит примерно на 25% дольше.',
    'shop.items.fresnel_lens.name': 'Линза Френеля',
    'shop.items.fresnel_lens.desc':
      'Луч держится примерно на 20% дольше.',
    'shop.items.lamp_oil_crate.name': 'Ящик лампового масла',
    'shop.items.lamp_oil_crate.desc':
      '+20 к запасу масла для лампы.',
    'shop.items.spare_generator.name': 'Запасной генератор',
    'shop.items.spare_generator.desc':
      'Начинай ночь с дополнительным зарядом лампы.',
    'shop.items.fast_gear.name': 'Быстрый привод',
    'shop.items.fast_gear.desc':
      '+10% к скорости вращения луча за уровень (макс. +30%). Сейчас: +{bonus}%. Следующий: +{nextBonus}%.',
    'shop.items.cold_lamp.name': 'Холодная лампа',
    'shop.items.cold_lamp.desc':
      'Лампа расходуется примерно на 12% медленнее.',
    'shop.items.moonlight.name': 'Лунный свет',
    'shop.items.moonlight.desc':
      'Небольшая зона вокруг маяка остаётся слегка видимой даже вне луча.',
    'shop.items.guiding_signal.name': 'Наводящий сигнал',
    'shop.items.guiding_signal.desc':
      'Контрабандисты увереннее держат курс в темноте.',
    'shop.items.contraband_route.name': 'Контрабандный маршрут',
    'shop.items.contraband_route.desc':
      'После серии спасённых лодок появляется шанс получить дополнительный редкий ресурс.',
    'shop.items.alarm_bell.name': 'Колокол тревоги',
    'shop.items.alarm_bell.desc':
      'Первая русалка за ночь автоматически кратко отмечается.',
    'shop.items.phosphor_water.name': 'Фосфоресцирующая вода',
    'shop.items.phosphor_water.desc':
      'Враги ненадолго оставляют светящийся след после выхода из луча.',

    'boot.title': 'Маяк',
    'boot.loading': 'Загрузка игровых ресурсов…',
    'boot.progress': 'Загружаем ресурсы {loaded}/{total}',
    'boot.ready': 'Готово',
    'boot.failed': 'Не удалось загрузить ресурсы игры',
    'boot.texture': 'Текстура',
    'boot.audio': 'Звук',
    'boot.video': 'Видео',
    'boot.finalizing': 'Завершаем запуск…',
    'boot.tips': [
      '🔦 Не держи луч на одном месте слишком долго — угрозы приходят с разных сторон.',
      '🧜 Если русалка исчезла во тьме — это не значит, что она уплыла.',
      '🚨 Один освещённый полицейский катер — уже проблема.',
      '🪔 Береги лампу в начале ночи. Под конец каждый сантиметр луча на вес золота.',
      '⚓ Иногда лучше пропустить одну лодку, чем потерять маяк.',
      '🌊 Следи за краями экрана — опасность редко идёт по центру.',
      '📦 Потерять контрабандистов легче, чем кажется. Особенно в панике.',
      '🐙 Кракен любит атаковать в моменты, когда ты отвлёкся на что-то другое.',
      '🌫 В тумане ориентируйся по огням лодок, а не по силуэтам.',
      '🔥 Мигание лампы — плохой знак. Обычно после него всё становится хуже.',
    ],

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
    'exit.settings': '⚙️ Настройки',

    'gameOver.title': 'Game Over',
    'gameOver.boats': '💀 Лодка контрабандистов утонула!',
    'gameOver.mermaids': '🧜‍♀️ Русалки захватили маяк!',
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
    'resultStats.playerLevel': 'Достигнутый уровень',
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
    'hud.xp': 'Опыт',

    'perk.xpGain': '+{n} опыта',
    'perk.pick.title': 'Выбери перк',
    'perk.stack': 'Уровень {n}',
    'perk.better_oil.title': 'Лучшее масло',
    'perk.better_oil.desc': 'Лампа горит дольше.',
    'perk.brighter_beam.title': 'Широкий луч',
    'perk.brighter_beam.desc': 'Конус света становится шире.',
    'perk.slow_cops.title': 'Медленные копы',
    'perk.slow_cops.desc': 'Полицейские катера двигаются медленнее.',
    'perk.beam_width.title': 'Макс. ширина луча',
    'perk.beam_width.desc':
      'Повышает максимум ширины луча на 10° за уровень.',
    'perk.siren_eye.title': 'Глаз сирены',
    'perk.siren_eye.desc':
      'Русалки появляются реже, но двигаются быстрее.',
    'perk.experienced_keeper.title': 'Опытный смотритель',
    'perk.experienced_keeper.desc':
      'Даёт на 10% больше ресурсов за ночь.',
    'perk.occult_lamp.title': 'Оккультная лампа',
    'perk.occult_lamp.desc':
      'Фиолетовые лампы на айсбергах приманивают русалок и отпугивают их при приближении. Кракен появляется чаще.',
    'perk.old_map.title': 'Старая карта',
    'perk.old_map.desc':
      'На 20 секунд показывает иконки всех скрытых врагов и контрабандистов, не попавших в луч.',
    'perk.new_icebergs.title': 'Новые айсберги',
    'perk.new_icebergs.desc': 'В воде появляются 3 новых айсберга.',
    'perk.maxed': 'Макс. уровень',
    'perk.fullHealth': 'Полное здоровье',
    'perk.repair_lighthouse.title': 'Починить маяк',
    'perk.repair_lighthouse.desc': 'Восстанавливает 1 сердце маяка.',
    'perk.repair_lighthouse.healed': '+1 ❤️',

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
