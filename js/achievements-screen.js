import { ACHIEVEMENT_DEFS, loadAchievementProgress } from './meta-progress.js';
import { t } from './i18n.js';

function createAchievementCard(def, progress) {
  const target = Math.max(1, Math.floor(Number(def.target)) || 1);
  const value = Math.max(0, Math.floor(Number(progress)) || 0);
  const done = value >= target;
  const ratio = Math.min(1, value / target);

  const $card = document.createElement('article');
  $card.className = `achievement-card${done ? ' is-complete' : ''}`;

  const $header = document.createElement('div');
  $header.className = 'achievement-card-header';

  const $icon = document.createElement('span');
  $icon.className = 'achievement-card-icon';
  $icon.textContent = def.icon;

  const $copy = document.createElement('div');
  $copy.className = 'achievement-card-copy';

  const $title = document.createElement('h3');
  $title.className = 'achievement-card-title';
  $title.textContent = t(def.titleKey);

  const $desc = document.createElement('p');
  $desc.className = 'achievement-card-desc';
  $desc.textContent = t(def.descKey);

  $copy.appendChild($title);
  $copy.appendChild($desc);

  const $badge = document.createElement('span');
  $badge.className = 'achievement-card-badge';
  $badge.textContent = done
    ? t('achievements.complete')
    : t('achievements.progress', { value, target });

  $header.appendChild($icon);
  $header.appendChild($copy);
  $header.appendChild($badge);

  const $track = document.createElement('div');
  $track.className = 'achievement-card-track';

  const $fill = document.createElement('div');
  $fill.className = 'achievement-card-fill';
  $fill.style.width = `${Math.round(ratio * 100)}%`;

  $track.appendChild($fill);

  const $foot = document.createElement('div');
  $foot.className = 'achievement-card-foot';
  $foot.textContent = done ? t('achievements.done') : t('achievements.locked');

  $card.appendChild($header);
  $card.appendChild($track);
  $card.appendChild($foot);

  return $card;
}

export function renderAchievementsScreen({ container, isActive }) {
  if (!container) return;

  const $title = container.querySelector('.menu-screen-title');
  const $subtitle = container.querySelector('.menu-screen-subtitle');
  const $body = container.querySelector('.menu-card');

  if (!$title || !$subtitle || !$body) return;

  $title.textContent = t('achievements.title');
  $subtitle.textContent = t('achievements.subtitle');

  const progress = loadAchievementProgress();

  $body.replaceChildren();

  const $list = document.createElement('div');
  $list.className = 'achievements-list';

  for (const def of ACHIEVEMENT_DEFS) {
    $list.appendChild(createAchievementCard(def, progress[def.goalKey] || 0));
  }

  $body.appendChild($list);

  if (typeof isActive === 'function' && !isActive()) return;
}
