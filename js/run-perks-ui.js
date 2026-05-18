import { playClickSound } from './sound.js';
import S from './state.js';
import {
  PERK_IDS,
  PERK_ICONS,
  applyPerk,
  checkRunXpLevelUp,
  getPerkStack,
  setPerkPickerOpener,
} from './run-perks.js';
import { updateHUD } from './ui.js';
import { t, onLanguageChange } from './i18n.js';

const {
  $screenPerkPick,
  $perkPickTitle,
  $perkPickCards,
} = globalThis;

let perkKeyHandler = null;

function renderPerkCards() {
  if (!$perkPickCards) return;
  $perkPickCards.innerHTML = '';

  PERK_IDS.forEach((perkId, index) => {
    const stack = getPerkStack(perkId);
    const stackLabel =
      stack > 0 ? t('perk.stack', { n: stack + 1 }) : '';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'perk-card blur-bg';
    btn.dataset.perkId = perkId;
    btn.dataset.perkIndex = String(index);

    const icon = document.createElement('span');
    icon.className = 'perk-card-icon';
    icon.textContent = PERK_ICONS[perkId] || '✨';

    const title = document.createElement('span');
    title.className = 'perk-card-title';
    title.textContent = t(`perk.${perkId}.title`);

    const desc = document.createElement('span');
    desc.className = 'perk-card-desc';
    desc.textContent = t(`perk.${perkId}.desc`);

    const hotkey = document.createElement('span');
    hotkey.className = 'perk-card-hotkey hidden-mobile';
    hotkey.textContent = String(index + 1);

    btn.append(icon, title, desc, hotkey);
    if (stackLabel) {
      const stackEl = document.createElement('span');
      stackEl.className = 'perk-card-stack';
      stackEl.textContent = stackLabel;
      btn.appendChild(stackEl);
    }

    btn.addEventListener('pointerdown', () => selectPerk(perkId));
    $perkPickCards.appendChild(btn);
  });
}

function selectPerk(perkId) {
  if (!S.perkPickerOpen) return;
  playClickSound();
  applyPerk(perkId);
  closePerkPicker();
  checkRunXpLevelUp();
}

function onPerkKeyDown(e) {
  if (!S.perkPickerOpen) return;
  const key = e.key;
  if (key >= '1' && key <= '3') {
    const idx = Number(key) - 1;
    const perkId = PERK_IDS[idx];
    if (perkId) {
      e.preventDefault();
      selectPerk(perkId);
    }
    return;
  }
  if (key === 'Enter') {
    e.preventDefault();
    selectPerk(PERK_IDS[0]);
  }
}

export function openPerkPicker() {
  if (S.perkPickerOpen || S.gameOver) return;
  S.perkPickerOpen = true;
  if ($perkPickTitle) $perkPickTitle.textContent = t('perk.pick.title');
  renderPerkCards();
  if ($screenPerkPick) $screenPerkPick.hidden = false;
  if (!perkKeyHandler) {
    perkKeyHandler = onPerkKeyDown;
    window.addEventListener('keydown', perkKeyHandler);
  }
  updateHUD();
}

export function closePerkPicker() {
  S.perkPickerOpen = false;
  if ($screenPerkPick) $screenPerkPick.hidden = true;
  updateHUD();
}

export function initRunPerksUi() {
  setPerkPickerOpener(openPerkPicker);
  onLanguageChange(() => {
    if (S.perkPickerOpen) {
      if ($perkPickTitle) $perkPickTitle.textContent = t('perk.pick.title');
      renderPerkCards();
    }
  });
}
