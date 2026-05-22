import { playClickSound } from './sound.js';
import S from './state.js';
import {
  PERK_ICONS,
  PERK_MAX_STACKS,
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

function renderLevelBullets(container, level, maxLevel) {
  container.replaceChildren();
  const displayMax = Math.max(1, Math.floor(Number(maxLevel)) || 0);
  container.hidden = false;
  for (let i = 1; i <= displayMax; i++) {
    const dot = document.createElement('span');
    dot.className = i <= level
      ? 'perk-level-dot perk-level-dot--filled'
      : 'perk-level-dot';
    dot.textContent = '◆';
    container.appendChild(dot);
  }
}

function renderPerkCards() {
  if (!$perkPickCards) return;
  $perkPickCards.innerHTML = '';

  // Toggle grid class for debug mode (more than 3 columns)
  $perkPickCards.classList.toggle('perk-pick-cards--debug', !!S.debugMode);

  getPerkPickerVisibleIds().forEach((perkId, index) => {
    const stack = getPerkStack(perkId);
    const blockReason = getPerkBlockReason(perkId);
    const maxed = blockReason != null;
    const maxStacks = PERK_MAX_STACKS[perkId];

    const card = document.createElement('article');
    card.className = 'perk-card blur-bg';
    card.dataset.perkId = perkId;
    card.dataset.perkIndex = String(index);
    if (maxed) {
      card.classList.add('perk-card--maxed');
    }

    // Title
    const title = document.createElement('h3');
    title.className = 'perk-card-title';
    title.textContent = t(`perk.${perkId}.title`);

    // Level bullets
    const levelRow = document.createElement('div');
    levelRow.className = 'perk-card-level-row';
    const displayMax = maxStacks === Infinity
      ? 1
      : Math.max(1, Math.floor(Number(maxStacks)) || 0);
    renderLevelBullets(levelRow, stack, displayMax);

    // Large icon
    const icon = document.createElement('span');
    icon.className = 'perk-card-icon';
    icon.textContent = PERK_ICONS[perkId] || '✨';

    // Description
    const desc = document.createElement('p');
    desc.className = 'perk-card-desc';
    desc.textContent = t(`perk.${perkId}.desc`);

    // Hotkey hint
    const hotkey = document.createElement('span');
    hotkey.className = 'perk-card-hotkey hidden-mobile';
    if (index < 9) hotkey.textContent = String(index + 1);
    else if (index === 9) hotkey.textContent = '0';
    else hotkey.hidden = true;

    card.append(title, levelRow, icon, desc, hotkey);

    // Stack / maxed label
    if (maxed) {
      const maxEl = document.createElement('span');
      maxEl.className = 'perk-card-stack';
      maxEl.textContent =
        blockReason === 'fullHealth'
          ? t('perk.fullHealth')
          : t('perk.maxed');
      card.appendChild(maxEl);
    } else if (stack > 0) {
      const stackEl = document.createElement('span');
      stackEl.className = 'perk-card-stack';
      stackEl.textContent = t('perk.stack', { n: stack + 1 });
      card.appendChild(stackEl);
    }

    if (!maxed) {
      card.addEventListener('pointerdown', () => selectPerk(perkId));
    }
    $perkPickCards.appendChild(card);
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
