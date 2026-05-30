import { BOAT_CARGO_TYPES } from './config.js';
import {
  loadMeta,
  tryBuy,
  SHOP_ITEMS,
  canAfford,
  getShopItemLevel,
  isShopItemMaxed,
  hasShopPurchases,
  resetShopPurchases,
} from './meta-progress.js';
import { t } from './i18n.js';
import { playClickSound } from './sound.js';

function cloneTemplateFirstElement(id) {
  const template = document.getElementById(id);
  const first = template?.content?.firstElementChild;
  return first ? first.cloneNode(true) : null;
}

function renderLevelIndicator($row, level, maxLevel) {
  $row.replaceChildren();
  const displayMax = Math.max(1, Math.floor(Number(maxLevel)) || 0);
  $row.hidden = false;
  for (let i = 1; i <= displayMax; i++) {
    const diamond = document.createElement('span');
    diamond.className = i <= level ? 'shop-level-diamond shop-level-diamond--filled' : 'shop-level-diamond';
    diamond.textContent = '◆';
    $row.appendChild(diamond);
  }
}

function formatPriceLine(price) {
  return Object.entries(price)
    .map(([emoji, n]) => `${emoji} x ${n}`)
    .join('  ');
}

function renderWallet($row, meta) {
  $row.replaceChildren();
  for (const emoji of BOAT_CARGO_TYPES) {
    const n = meta.wallet[emoji] || 0;
    const chip = cloneTemplateFirstElement('$shopWalletChipTemplate');
    if (!(chip instanceof HTMLElement)) continue;

    const emojiEl = chip.querySelector('.shop-wallet-emoji');
    const countEl = chip.querySelector('.shop-wallet-count');
    if (emojiEl) emojiEl.textContent = emoji;
    if (countEl) countEl.textContent = String(n);

    chip.title = t(`cargo.${emoji}`);
    $row.appendChild(chip);
  }
}

/**
 * @param {HTMLElement} $grid
 * @param {ReturnType<typeof loadMeta>} meta
 * @param {() => void} onBought
 */
function renderGrid($grid, meta, onBought) {
  $grid.replaceChildren();
  let featuredSet = false;
  for (const item of SHOP_ITEMS) {
    const level = getShopItemLevel(meta, item);
    const maxed = isShopItemMaxed(meta, item);
    const affordable = canAfford(item.price, meta);

    const card = cloneTemplateFirstElement('$shopItemCardTemplate');
    if (!(card instanceof HTMLElement)) continue;

    const h = card.querySelector('.shop-item-title');
    const levelRow = card.querySelector('.shop-item-level-row');
    const iconEl = card.querySelector('.shop-item-icon');
    const desc = card.querySelector('.shop-item-desc');
    const price = card.querySelector('.shop-item-price');
    const btn = card.querySelector('.shop-buy-btn');
    if (!(btn instanceof HTMLButtonElement)) continue;

    const title = t(`shop.items.${item.id}.name`);
    if (h) h.textContent = title;

    // Level indicator (diamonds)
    const maxLevel = item.maxLevel || (item.once ? 1 : 0);
    if (levelRow) renderLevelIndicator(levelRow, level, maxLevel);

    // Large icon
    if (iconEl) {
      iconEl.textContent = item.icon || '';
    }

    if (desc) {
      desc.textContent = t(`shop.items.${item.id}.desc`, {
        level,
        max: item.maxLevel || 1,
        bonus: level * 10,
        nextBonus: Math.min((level + 1) * 10, (item.maxLevel || 1) * 10),
      });
    }
    if (price) price.textContent = formatPriceLine(item.price);

    btn.dataset.itemId = item.id;

    if (maxed) {
      btn.disabled = true;
      btn.textContent = t('shop.maxLevel');
      card.classList.add('shop-item-card--owned');
    } else if (!affordable) {
      btn.disabled = true;
      btn.textContent = t('shop.cantAfford');
      card.classList.add('shop-item-card--locked');
    } else {
      btn.disabled = false;
      btn.textContent = level > 0 ? t('shop.upgrade') : t('shop.buy');
      if (!featuredSet) {
        card.classList.add('shop-item-card--featured');
        featuredSet = true;
      }
    }

    $grid.appendChild(card);
  }

  $grid.onclick = (e) => {
    const tEl = e.target;
    if (!(tEl instanceof HTMLElement)) return;
    const btn = tEl.closest('.shop-buy-btn');
    if (!btn || btn.disabled) return;
    const itemId = btn.dataset.itemId;
    if (!itemId) return;
    const res = tryBuy(itemId);
    if (res.ok) {
      playClickSound();
      onBought();
    }
  };
}

/**
 * @param {{ container: HTMLElement | null, isActive?: () => boolean }} opts
 */
export function renderShopScreen({ container, isActive }) {
  if (!container) return;

  const $title = container.querySelector('.menu-screen-title');
  const $walletLabel = container.querySelector('.shop-wallet-label');
  const $walletRow = container.querySelector('.shop-wallet-row');
  const $stockTitle = container.querySelector('.shop-stock-title');
  const $infoTitle = container.querySelector('.shop-info-title');
  const $infoText = container.querySelector('.shop-info-text');
  const $resetBtn = container.querySelector('.shop-reset-btn');
  const $resetConfirm = container.querySelector('.shop-reset-confirm');
  const $resetConfirmText = container.querySelector('.shop-reset-confirm-text');
  const $resetConfirmCancel = container.querySelector('.shop-reset-confirm-cancel');
  const $resetConfirmApply = container.querySelector('.shop-reset-confirm-apply');
  const $grid = container.querySelector('.shop-grid');

  if (!$title || !$walletRow || !$grid || !$resetBtn) return;

  $title.textContent = t('shop.title');
  if ($walletLabel) $walletLabel.textContent = t('shop.wallet');
  if ($stockTitle) $stockTitle.textContent = t('shop.stockTitle');
  if ($infoTitle) $infoTitle.textContent = t('shop.infoTitle');
  if ($infoText) $infoText.textContent = t('shop.infoText');

  function paint() {
    if (typeof isActive === 'function' && !isActive()) return;
    const meta = loadMeta();
    $resetBtn.textContent = t('shop.reset');
    $resetBtn.disabled = !hasShopPurchases(meta);
    if ($resetConfirmText) $resetConfirmText.textContent = t('shop.resetConfirm');
    if ($resetConfirmCancel) $resetConfirmCancel.textContent = t('shop.resetCancel');
    if ($resetConfirmApply) $resetConfirmApply.textContent = t('shop.resetApply');
    renderWallet($walletRow, meta);
    renderGrid($grid, meta, paint);
  }

  function closeResetConfirm() {
    if ($resetConfirm instanceof HTMLElement) {
      $resetConfirm.hidden = true;
    }
  }

  function tryResetPurchases() {
    const res = resetShopPurchases();
    if (!res.ok) return;
    playClickSound();
    closeResetConfirm();
    paint();
  }

  $resetBtn.onclick = () => {
    const meta = loadMeta();
    if (!hasShopPurchases(meta)) return;
    if ($resetConfirm instanceof HTMLElement) {
      $resetConfirm.hidden = false;
      return;
    }
    tryResetPurchases();
  };

  if ($resetConfirmCancel instanceof HTMLButtonElement) {
    $resetConfirmCancel.onclick = closeResetConfirm;
  }
  if ($resetConfirmApply instanceof HTMLButtonElement) {
    $resetConfirmApply.onclick = tryResetPurchases;
  }
  if ($resetConfirm instanceof HTMLElement) {
    $resetConfirm.onclick = (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (target === $resetConfirm || target.classList.contains('shop-reset-confirm-backdrop')) {
        closeResetConfirm();
      }
    };
  }

  paint();
}
