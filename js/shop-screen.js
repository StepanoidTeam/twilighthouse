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
import { getLevelFromXp } from './player-level.js';
import { t } from './i18n.js';
import { playClickSound } from './sound.js';

function cloneTemplateFirstElement(id) {
  const template = document.getElementById(id);
  const first = template?.content?.firstElementChild;
  return first ? first.cloneNode(true) : null;
}

function renderLevelIndicator($row, level, maxLevel) {
  $row.replaceChildren();
  if (!maxLevel || maxLevel <= 1) {
    $row.hidden = true;
    return;
  }
  $row.hidden = false;
  for (let i = 1; i <= maxLevel; i++) {
    const diamond = document.createElement('span');
    diamond.className = i <= level ? 'shop-level-diamond shop-level-diamond--filled' : 'shop-level-diamond';
    diamond.textContent = '◆';
    $row.appendChild(diamond);
  }
}

function formatPriceLine(price) {
  return Object.entries(price)
    .map(([emoji, n]) => `${emoji}×${n}`)
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
  const $nights = container.querySelector('.shop-nights-line');
  const $walletLabel = container.querySelector('.shop-wallet-label');
  const $walletRow = container.querySelector('.shop-wallet-row');
  const $resetBtn = container.querySelector('.shop-reset-btn');
  const $grid = container.querySelector('.shop-grid');

  if (!$title || !$nights || !$walletRow || !$grid || !$resetBtn) return;

  $title.textContent = t('shop.title');
  if ($walletLabel) $walletLabel.textContent = t('shop.wallet');

  function paint() {
    if (typeof isActive === 'function' && !isActive()) return;
    const meta = loadMeta();
    $nights.textContent = `${t('shop.playerLevel', { n: getLevelFromXp(meta.totalXp || 0) })} · ${t('shop.nightsWon', { n: meta.nightsWon })}`;
    $resetBtn.textContent = t('shop.reset');
    $resetBtn.disabled = !hasShopPurchases(meta);
    renderWallet($walletRow, meta);
    renderGrid($grid, meta, paint);
  }

  $resetBtn.onclick = () => {
    const meta = loadMeta();
    if (!hasShopPurchases(meta)) return;
    const res = resetShopPurchases();
    if (!res.ok) return;
    playClickSound();
    paint();
  };

  paint();
}
