import { BOAT_CARGO_TYPES } from './config.js';
import {
  loadMeta,
  tryBuy,
  SHOP_ITEMS,
  canAfford,
} from './meta-progress.js';
import { t } from './i18n.js';
import { playClickSound } from './sound.js';

function formatPriceLine(price) {
  return Object.entries(price)
    .map(([emoji, n]) => `${emoji}×${n}`)
    .join('  ');
}

function renderWallet($row, meta) {
  $row.replaceChildren();
  for (const emoji of BOAT_CARGO_TYPES) {
    const n = meta.wallet[emoji] || 0;
    const chip = document.createElement('span');
    chip.className = 'shop-wallet-chip';
    chip.innerHTML = `<span class="shop-wallet-emoji">${emoji}</span><span class="shop-wallet-count">${n}</span>`;
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
    const owned = item.once && meta.unlocks[item.unlockKey];
    const affordable = canAfford(item.price, meta);

    const card = document.createElement('article');
    card.className = 'shop-item-card blur-bg';

    const h = document.createElement('h3');
    h.className = 'shop-item-title';
    h.textContent = t(`shop.items.${item.id}.name`);

    const desc = document.createElement('p');
    desc.className = 'shop-item-desc';
    desc.textContent = t(`shop.items.${item.id}.desc`);

    const price = document.createElement('p');
    price.className = 'shop-item-price';
    price.textContent = formatPriceLine(item.price);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'menu-btn shop-buy-btn';
    btn.dataset.itemId = item.id;

    if (owned) {
      btn.disabled = true;
      btn.textContent = t('shop.owned');
      card.classList.add('shop-item-card--owned');
    } else if (!affordable) {
      btn.disabled = true;
      btn.textContent = t('shop.cantAfford');
      card.classList.add('shop-item-card--locked');
    } else {
      btn.textContent = t('shop.buy');
    }

    card.appendChild(h);
    card.appendChild(desc);
    card.appendChild(price);
    card.appendChild(btn);
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
  const $grid = container.querySelector('.shop-grid');

  if (!$title || !$nights || !$walletRow || !$grid) return;

  $title.textContent = t('shop.title');
  if ($walletLabel) $walletLabel.textContent = t('shop.wallet');

  function paint() {
    if (typeof isActive === 'function' && !isActive()) return;
    const meta = loadMeta();
    $nights.textContent = t('shop.nightsWon', { n: meta.nightsWon });
    renderWallet($walletRow, meta);
    renderGrid($grid, meta, paint);
  }

  paint();
}
