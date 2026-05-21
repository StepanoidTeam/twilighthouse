import { playClickSound } from './sound.js';
import S from './state.js';
import {
  PERK_ICONS,
  applyPerk,
  checkRunXpLevelUp,
  getPerkStack,
  canSelectPerkInPicker,
  getPerkBlockReason,
  getPerkPickerVisibleIds,
  rollPerkPickerOffer,
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

  getPerkPickerVisibleIds().forEach((perkId, index) => {
    const stack = getPerkStack(perkId);
    const blockReason = getPerkBlockReason(perkId);
    const maxed = blockReason != null;
    const stackLabel =
      stack > 0 ? t('perk.stack', { n: stack + 1 }) : '';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'perk-card blur-bg';
    btn.dataset.perkId = perkId;
    btn.dataset.perkIndex = String(index);
    if (maxed) {
      btn.disabled = true;
      btn.classList.add('perk-card--maxed');
    }

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
    if (index < 9) hotkey.textContent = String(index + 1);
    else if (index === 9) hotkey.textContent = '0';
    else hotkey.hidden = true;

    btn.append(icon, title, desc, hotkey);
    if (stackLabel && !maxed) {
      const stackEl = document.createElement('span');
      stackEl.className = 'perk-card-stack';
      stackEl.textContent = stackLabel;
      btn.appendChild(stackEl);
    }
    if (maxed) {
      const maxEl = document.createElement('span');
      maxEl.className = 'perk-card-stack';
      maxEl.textContent =
        blockReason === 'fullHealth'
          ? t('perk.fullHealth')
          : t('perk.maxed');
      btn.appendChild(maxEl);
    }

    btn.addEventListener('pointerdown', () => selectPerk(perkId));
    $perkPickCards.appendChild(btn);
  });
}

function selectPerk(perkId) {
  if (!S.perkPickerOpen || !canSelectPerkInPicker(perkId)) return;
  playClickSound();
  applyPerk(perkId);
  closePerkPicker();
  checkRunXpLevelUp();
}

function onPerkKeyDown(e) {
  if (!S.perkPickerOpen) return;
  const visible = getPerkPickerVisibleIds();
  const key = e.key;
  if (key >= '1' && key <= '9') {
    const idx = Number(key) - 1;
    const perkId = visible[idx];
    if (perkId && canSelectPerkInPicker(perkId)) {
      e.preventDefault();
      selectPerk(perkId);
    }
    return;
  }
  if (key === '0') {
    const perkId = visible[9];
    if (perkId && canSelectPerkInPicker(perkId)) {
      e.preventDefault();
      selectPerk(perkId);
    }
  }
  if (key === 'Enter') {
    const firstAvailable = visible.find((id) => canSelectPerkInPicker(id));
    if (firstAvailable) {
      e.preventDefault();
      selectPerk(firstAvailable);
    }
  }
}

export function openPerkPicker() {
  if (S.perkPickerOpen || S.gameOver) return;
  if (!S.debugMode) {
    rollPerkPickerOffer();
    if (!S.perkPickerOffer.length) return;
  }
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
  S.perkPickerOffer = [];
  if ($screenPerkPick) $screenPerkPick.hidden = true;
  updateHUD();
}

/** Re-roll offer and re-render when debug is toggled while the picker is open. */
export function refreshPerkPickerOnDebugChange() {
  if (!S.perkPickerOpen) return;
  if (!S.debugMode) {
    rollPerkPickerOffer();
    if (!S.perkPickerOffer.length) {
      closePerkPicker();
      checkRunXpLevelUp();
      return;
    }
  }
  renderPerkCards();
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
