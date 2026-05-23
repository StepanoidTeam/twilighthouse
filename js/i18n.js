// ===== Lightweight i18n =====
// Default language is English. Stored in localStorage under 'lighthouse_lang'.
// Usage:
//   import { t, getLanguage, setLanguage, onLanguageChange } from './i18n.js';
//   t('menu.newGame')
//   t('gameOver.boats')

import { ACHIEVEMENTS_I18N } from './i18n/achievements.js';

const STORAGE_KEY = 'lighthouse_lang';
const DEFAULT_LANG = 'en';
const SUPPORTED = ['en', 'ru', 'zh'];

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
    'shop.resetConfirm':
      'Reset all shop purchases and refund all spent supplies?',
    'shop.resetCancel': 'Cancel',
    'shop.resetApply': 'Reset purchases',
    'shop.items.extra_heart.name': 'Life ring',
    'shop.items.extra_heart.desc': 'Start each run with 1 extra heart.',
    'shop.items.quality_wick.name': 'Sturdy wick',
    'shop.items.quality_wick.desc': 'Your lamp burns about 25% longer.',
    'shop.items.fresnel_lens.name': 'Fresnel lens',
    'shop.items.fresnel_lens.desc': 'The beam lasts about 20% longer.',
    'shop.items.lamp_oil_crate.name': 'Crate of lamp oil',
    'shop.items.lamp_oil_crate.desc': '+20 lamp oil reserve.',
    'shop.items.spare_generator.name': 'Spare generator',
    'shop.items.spare_generator.desc':
      'Start each night with extra lamp charge.',
    'shop.items.fast_gear.name': 'Fast drive',
    'shop.items.fast_gear.desc':
      '+10% beam rotation speed per level (max +30%). Current: +{bonus}%. Next: +{nextBonus}%.',
    'shop.items.cold_lamp.name': 'Cold lamp',
    'shop.items.cold_lamp.desc': 'The lamp burns about 12% slower.',
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
    'settings.languageHelp': "Don't see your language?",
    'settings.contactUs': 'Contact us',
    'lang.russian': 'Русский',
    'lang.english': 'English',
    'lang.chinese': '中文',
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
    'perk.pick.level': 'Level {n}',
    'perk.stack': 'Level {n}',
    'perk.better_oil.title': 'Better oil',
    'perk.better_oil.desc': 'The lamp burns longer.',
    'perk.brighter_beam.title': 'Wider beam',
    'perk.brighter_beam.desc': 'The light cone gets wider.',
    'perk.slow_cops.title': 'Slower cops',
    'perk.slow_cops.desc': 'Police boats move slower.',
    'perk.beam_width.title': 'Max beam width',
    'perk.beam_width.desc': 'Raises the beam width cap by 10° per level.',
    'perk.elastic_beam.title': 'Elastic beam',
    'perk.elastic_beam.desc':
      'While rotating, the beam briefly widens; when idle it smoothly returns to normal width.',
    'perk.siren_eye.title': "Siren's eye",
    'perk.siren_eye.desc': 'Mermaids spawn less often, but move faster.',
    'perk.experienced_keeper.title': 'Experienced keeper',
    'perk.experienced_keeper.desc': 'Earn 10% more supplies each night.',
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

  zh: {
    'menu.newGame': '新游戏',
    'menu.shop': '港口商店',
    'menu.leaderboard': '排行榜',
    'menu.achievements': '成就',
    'menu.settings': '设置',
    'menu.authors': '制作人员',
    'menu.tutorial': '玩法说明',
    'credits.text': `
🎨 概念美术

@adriaaaaana
@r1m
@lina


💻 程序员

@bobanko
@nuclme


🎲 游戏设计

@nuclme
@stepastepa
@adriaaaaana
@bobanko


🤖 AI 工具

GitHub Copilot


🎵 音乐

suno.com


🔊 音效

pixabay.com
libsounds.com


⚙️ 技术

PixiJS — 2D 渲染引擎
VS Code — 代码编辑器
Firebase — 分析与后端
Photopea — 图像编辑器


🌊 感谢游玩！🌊
`,

    'hint.main': '↑↓ / W S — 导航  •  Enter / E — 选择  •  Q — 返回',
    'hint.back': '返回',
    'hint.intro': '◀ ▶ — 翻页  •  Esc — 跳过',
    'btn.back': '返回',

    'intro.start': '开始',
    'intro.skip': '跳过',

    'leaderboard.title': '🏆 排行榜',
    'leaderboard.subtitle': '灯塔守卫者排行榜 - 看谁坚持得最久',
    'leaderboard.loading': '加载中…',
    'leaderboard.loadError': '排行榜加载失败',
    'leaderboard.empty': '还没有人上榜 - 你来当第一名吧！',
    'leaderboard.you': '（你）',
    'leaderboard.col.rank': '#',
    'leaderboard.col.name': '名字',
    'leaderboard.col.level': '等级',
    'leaderboard.col.time': '最佳时间',
    'leaderboard.col.date': '日期',

    ...ACHIEVEMENTS_I18N.zh,

    'shop.title': '港口商店',
    'shop.playerLevel': '已达到等级 {n}',
    'shop.nightsWon': '幸存夜晚数（撑到黎明）：{n}',
    'shop.wallet': '仓库储备',
    'shop.buy': '购买',
    'shop.upgrade': '升级',
    'shop.owned': '已拥有',
    'shop.maxLevel': '最高等级',
    'shop.level': 'Lv {n}/{max}',
    'shop.cantAfford': '资源不足',
    'shop.reset': '重置购买',
    'shop.resetConfirm': '重置所有商店购买并返还全部已花费资源？',
    'shop.resetCancel': '取消',
    'shop.resetApply': '重置购买',
    'shop.items.extra_heart.name': '救生圈',
    'shop.items.extra_heart.desc': '每次开局额外获得 1 点生命。',
    'shop.items.quality_wick.name': '结实灯芯',
    'shop.items.quality_wick.desc': '灯能多燃烧约 25%。',
    'shop.items.fresnel_lens.name': '菲涅尔透镜',
    'shop.items.fresnel_lens.desc': '光束持续时间增加约 20%。',
    'shop.items.lamp_oil_crate.name': '灯油箱',
    'shop.items.lamp_oil_crate.desc': '灯油储备 +20。',
    'shop.items.spare_generator.name': '备用发电机',
    'shop.items.spare_generator.desc': '每晚开始时额外获得灯塔充能。',
    'shop.items.fast_gear.name': '快速齿轮',
    'shop.items.fast_gear.desc':
      '每级提升 10% 光束转速（最高 +30%）。当前：+{bonus}%。下一级：+{nextBonus}%。',
    'shop.items.cold_lamp.name': '冷灯',
    'shop.items.cold_lamp.desc': '灯的消耗速度约慢 12%。',
    'shop.items.moonlight.name': '月光',
    'shop.items.moonlight.desc': '灯塔周围一小片区域在光束外也会微微可见。',
    'shop.items.guiding_signal.name': '引导信号',
    'shop.items.guiding_signal.desc': '走私船在黑暗中更能保持航向。',
    'shop.items.contraband_route.name': '走私航线',
    'shop.items.contraband_route.desc':
      '连续救起几艘船后，有机会获得额外稀有资源。',
    'shop.items.alarm_bell.name': '警报钟',
    'shop.items.alarm_bell.desc': '每晚第一位美人鱼会被短暂自动标记。',
    'shop.items.phosphor_water.name': '磷光水',
    'shop.items.phosphor_water.desc': '敌人离开光束后会短暂留下发光痕迹。',

    'boot.title': 'TWILIGHTHOUSE',
    'boot.loading': '正在加载 twilighthouse 资源…',
    'boot.progress': '正在加载资源 {loaded}/{total}',
    'boot.ready': '就绪',
    'boot.failed': '游戏资源加载失败',
    'boot.texture': '贴图',
    'boot.audio': '音效',
    'boot.video': '视频',
    'boot.finalizing': '正在完成启动…',
    'boot.tips': [
      '🔦 不要把光束长时间停在一个地方 - 威胁会从四面八方出现。',
      '🧜 如果美人鱼消失在黑暗中，这不代表她已经游走了。',
      '🚨 只要有一艘警船被照亮，问题就已经来了。',
      '🪔 夜晚一开始要节省灯油。到后面，每一厘米光束都很珍贵。',
      '⚓ 有时候放过一艘船，比失去灯塔更划算。',
      '🌊 注意屏幕边缘 - 危险很少从正中央出现。',
      '📦 失去走私船比想象中更容易，尤其是在慌乱时。',
      '🐙 当你被别的事分心时，克拉肯最喜欢出手。',
      '🌫 大雾里要看船灯，不要只看剪影。',
      '🔥 灯开始闪烁通常不是好兆头，后面往往会更糟。',
    ],

    'settings.title': '⚙️ 设置',
    'settings.language': '🌐 语言',
    'settings.languageHelp': '没有找到您的语言？',
    'settings.contactUs': '联系我们',
    'settings.music': '🎵 音乐',
    'settings.sfx': '🔊 音效',
    'settings.mute': '静音',
    'settings.unmute': '取消静音',
    'settings.displayName': '👤 显示名称',
    'settings.displayNamePlaceholder': '输入你的名字…',
    'settings.displayNameSave': '保存',
    'settings.displayNameSaved': '已保存！',
    'settings.displayNameError': '无法保存名称',
    'settings.displayNameGuestNote': '登录后可设置显示名称',
    'settings.displayNameAnon':
      '你当前以游客身份游玩。你的名字会显示在排行榜中。',
    'settings.displayNameEmail': '你的名字会显示在排行榜中。',
    'settings.displayNameTooShort': '名称至少需要 1 个字符',
    'settings.displayNameTooLong': '名称不能超过 30 个字符',
    'settings.displayNameSaving': '保存中…',
    'settings.displayNameEmpty': '请输入要保存的名称',
    'lang.russian': 'Русский',
    'lang.english': 'English',
    'lang.chinese': '中文',
    'profile.guest': '游客',

    'howtoplay.title': '玩法说明',
    'howtoplay.prev': '上一页',
    'howtoplay.next': '下一页',
    'howtoplay.finish': '开始游戏',
    'howtoplay.skip': '跳过',
    'howtoplay.items': [
      {
        video: 'tutorial-vids/smugglers.mp4',
        title: '走私者',
        text: '被照亮的船会被港口接纳。帮帮走私者。',
      },
      {
        video: 'tutorial-vids/cops.mp4',
        title: '警察',
        text: '不要照亮警船。在它们到达灯塔前击沉它们。',
      },
      {
        video: 'tutorial-vids/mermaid.mp4',
        title: '美人鱼',
        text: '把美人鱼吓跑！',
      },
      {
        video: 'tutorial-vids/kraken.mp4',
        title: '克拉肯',
        text: '用你的光束击退克拉肯。',
      },
    ],

    'overlay.restart': '重新开始',
    'overlay.toMenu': '返回菜单',
    'overlay.exit': '退出',
    'overlay.resume': '继续',
    'overlay.continue': '继续',
    'overlay.pressToPlayAgain': '点击重新游玩',
    'exit.confirm': '⏸️ 退出到菜单？',
    'exit.settings': '⚙️ 设置',

    'gameOver.title': '游戏结束',
    'gameOver.boats': '💀 一艘走私船沉没了！',
    'gameOver.mermaids': '🧜‍♀️ 美人鱼占领了灯塔！',
    'gameOver.police': '🚔 被逮捕了！警察占领了灯塔！',
    'gameOver.kraken': '🦑 克拉肯占领了灯塔！',
    'gameOver.pattinson': '📦 火药用光了！灯塔守卫把实习生扔下了悬崖！',
    'gameOver.score': '💀 已救下 {score}/{total} 艘船',
    'win.message': '🎉 你赢了！全部 {total} 艘船都被救下！',
    'win.messageTime': '🎉 你赢了！全部 {total} 艘船都被救下！最终时间：{time}',
    'win.title': '🎉 胜利！',
    'win.nightSubtitle': '夜晚结束了！',
    'win.statLamps': '送达的灯',
    'win.statCrates': '送达的箱子',
    'win.statTime': '最终时间',
    'resultStats.cargoTitle': '收集的货物',
    'resultStats.title': '夜间回顾',
    'resultStats.playerLevel': '达到等级',
    'resultStats.deliveredBoats': '已救下的走私船',
    'resultStats.smugglersSunk': '已击沉的走私船',
    'resultStats.sunkCops': '已击沉的警船',
    'resultStats.repelledMermaids': '已击退的美人鱼',
    'resultStats.repelledKraken': '已击退的克拉肯',
    'resultStats.copsArrived': '警船到达灯塔',
    'resultStats.mermaidsArrived': '美人鱼到达灯塔',
    'resultStats.krakensArrived': '克拉肯到达灯塔',

    'cargo.💡': '灯',
    'cargo.📦': '箱子',
    'cargo.⚙️': '零件',
    'cargo.🧨': '炸药',
    'cargo.🥃': '朗姆酒',
    'cargo.🛢️': '燃料',

    'hud.night': '夜晚',
    'hud.lesson.prefix': '教学 {n}',
    'hud.level.prefix': '等级 {n}',
    'hud.level.idle': '生存',
    'hud.xp': '经验',

    'perk.xpGain': '+{n} 经验',
    'perk.pick.title': '选择一个加成',
    'perk.pick.level': '等级 {n}',
    'perk.stack': '等级 {n}',
    'perk.better_oil.title': '更好的灯油',
    'perk.better_oil.desc': '灯能燃烧更久。',
    'perk.brighter_beam.title': '更宽的光束',
    'perk.brighter_beam.desc': '光锥变得更宽。',
    'perk.slow_cops.title': '更慢的警船',
    'perk.slow_cops.desc': '警船移动得更慢。',
    'perk.beam_width.title': '最大光束宽度',
    'perk.beam_width.desc': '每级将光束宽度上限提高 10°。',
    'perk.elastic_beam.title': '弹性光束',
    'perk.elastic_beam.desc':
      '旋转时光束会短暂变宽；静止时会平滑回到正常宽度。',
    'perk.siren_eye.title': '海妖之眼',
    'perk.siren_eye.desc': '美人鱼刷新更少，但移动更快。',
    'perk.experienced_keeper.title': '经验丰富的守卫',
    'perk.experienced_keeper.desc': '每晚获得 10% 更多资源。',
    'perk.occult_lamp.title': '秘术之灯',
    'perk.occult_lamp.desc':
      '冰山上的紫色灯会吸引美人鱼并在接触时吓跑她们。克拉肯出现得更频繁。',
    'perk.old_map.title': '旧地图',
    'perk.old_map.desc': '持续 20 秒显示所有隐藏敌人和未在光束中的走私者图标。',
    'perk.new_icebergs.title': '新冰山',
    'perk.new_icebergs.desc': '随机位置会出现 3 座新冰山。',
    'perk.maxed': '最高等级',
    'perk.fullHealth': '满血',
    'perk.repair_lighthouse.title': '修复灯塔',
    'perk.repair_lighthouse.desc': '恢复 1 颗心。',
    'perk.repair_lighthouse.healed': '+1 ❤️',

    'goal.delivered_boats.one': '护送 {n} 艘走私船',
    'goal.delivered_boats.other': '护送 {n} 艘走私船',
    'goal.sunk_cops.one': '击沉 {n} 艘警船',
    'goal.sunk_cops.other': '击沉 {n} 艘警船',
    'goal.repelled_kraken.one': '击退 {n} 只克拉肯',
    'goal.repelled_kraken.other': '击退 {n} 只克拉肯',
    'goal.repelled_mermaids.one': '击退 {n} 位美人鱼',
    'goal.repelled_mermaids.other': '击退 {n} 位美人鱼',

    'level.l1.title': '教学 1',
    'level.l1.sub': '安全地把走私船引进港口',
    'level.l2.title': '教学 2',
    'level.l2.sub': '在警船到达灯塔前击沉它们',
    'level.l3.title': '教学 3',
    'level.l3.sub': '在美人鱼到达灯塔前把她们赶走',
    'level.freeplay.title': '守夜',
    'level.freeplay.sub': '坚持到黎明',

    'auth.signIn': '登录',
    'auth.signUp': '注册',
    'auth.tabSignIn': '登录',
    'auth.tabSignUp': '注册',
    'auth.fieldName': '昵称',
    'auth.fieldEmail': '邮箱',
    'auth.fieldPassword': '密码',
    'auth.submitSignIn': '登录',
    'auth.submitSignUp': '创建账号',
    'auth.close': '关闭',

    'widget.signIn': '👤 登录',
    'widget.signOut': '🚪 退出登录',

    'err.invalidEmail': '邮箱无效',
    'err.emailInUse': '该邮箱已被注册',
    'err.weakPassword': '密码太弱（至少 6 个字符）',
    'err.wrongCreds': '邮箱或密码错误',
    'err.tooManyRequests': '尝试次数过多，请稍后再试',
    'err.network': '网络问题',
    'err.unknown': '未知错误',
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
    'shop.resetConfirm':
      'Сбросить все покупки в магазине и вернуть все потраченные ресурсы?',
    'shop.resetCancel': 'Отмена',
    'shop.resetApply': 'Сбросить покупки',
    'shop.items.extra_heart.name': 'Спасательный круг',
    'shop.items.extra_heart.desc':
      'Каждый забег начинается с 1 дополнительной жизни.',
    'shop.items.quality_wick.name': 'Надёжный фитиль',
    'shop.items.quality_wick.desc': 'Лампа горит примерно на 25% дольше.',
    'shop.items.fresnel_lens.name': 'Линза Френеля',
    'shop.items.fresnel_lens.desc': 'Луч держится примерно на 20% дольше.',
    'shop.items.lamp_oil_crate.name': 'Ящик лампового масла',
    'shop.items.lamp_oil_crate.desc': '+20 к запасу масла для лампы.',
    'shop.items.spare_generator.name': 'Запасной генератор',
    'shop.items.spare_generator.desc':
      'Начинай ночь с дополнительным зарядом лампы.',
    'shop.items.fast_gear.name': 'Быстрый привод',
    'shop.items.fast_gear.desc':
      '+10% к скорости вращения луча за уровень (макс. +30%). Сейчас: +{bonus}%. Следующий: +{nextBonus}%.',
    'shop.items.cold_lamp.name': 'Холодная лампа',
    'shop.items.cold_lamp.desc': 'Лампа расходуется примерно на 12% медленнее.',
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
    'settings.languageHelp': 'Не нашли свой язык?',
    'settings.contactUs': 'Свяжитесь с нами',
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
    'lang.chinese': '中文',

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
    'perk.pick.level': 'Уровень {n}',
    'perk.stack': 'Уровень {n}',
    'perk.better_oil.title': 'Лучшее масло',
    'perk.better_oil.desc': 'Лампа горит дольше.',
    'perk.brighter_beam.title': 'Широкий луч',
    'perk.brighter_beam.desc': 'Конус света становится шире.',
    'perk.slow_cops.title': 'Медленные копы',
    'perk.slow_cops.desc': 'Полицейские катера двигаются медленнее.',
    'perk.beam_width.title': 'Макс. ширина луча',
    'perk.beam_width.desc': 'Повышает максимум ширины луча на 10° за уровень.',
    'perk.elastic_beam.title': 'Упругий луч',
    'perk.elastic_beam.desc':
      'Во время поворота луч немного расширяется, а при остановке плавно сужается до обычной ширины.',
    'perk.siren_eye.title': 'Глаз сирены',
    'perk.siren_eye.desc': 'Русалки появляются реже, но двигаются быстрее.',
    'perk.experienced_keeper.title': 'Опытный смотритель',
    'perk.experienced_keeper.desc': 'Даёт на 10% больше ресурсов за ночь.',
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
    if (String(tag).toLowerCase().startsWith('zh')) return 'zh';
  }
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
