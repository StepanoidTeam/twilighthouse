import {
  ACHIEVEMENT_DEFS,
  loadAchievementProgress,
  resetAllAchievementProgress,
  setAchievementProgress,
} from './meta-progress.js';
import { t } from './i18n.js';
import S from './state.js';

function createAchievementCard(def, progress, { debug = false } = {}) {
  const target = Math.max(1, Math.floor(Number(def.target)) || 1);
  const value = Math.max(0, Math.floor(Number(progress)) || 0);
  const done = value >= target;
  const ratio = Math.min(1, value / target);

  const $card = document.createElement('article');
  $card.className = `achievement-card${done ? ' is-complete' : ''}`;

  const $icon = document.createElement('span');
  $icon.className = 'achievement-card-icon';
  $icon.textContent = def.icon;

  const $main = document.createElement('div');
  $main.className = 'achievement-card-main';

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

  const $track = document.createElement('div');
  $track.className = 'achievement-card-track';

  const $fill = document.createElement('div');
  $fill.className = 'achievement-card-fill';
  $fill.style.width = `${Math.round(ratio * 100)}%`;

  $track.appendChild($fill);

  const $progress = document.createElement('div');
  $progress.className = 'achievement-card-progress';
  $progress.appendChild($track);

  const $progressText = document.createElement('span');
  $progressText.className = 'achievement-card-progress-text';
  $progressText.textContent = t('achievements.progress', { value, target });
  $progress.appendChild($progressText);

  const $points = document.createElement('aside');
  $points.className = 'achievement-card-points';

  const $pointsLabel = document.createElement('span');
  $pointsLabel.className = 'achievement-card-points-label';
  $pointsLabel.textContent = t('achievements.points');

  const $pointsValue = document.createElement('span');
  $pointsValue.className = 'achievement-card-points-value';
  $pointsValue.textContent = `${Math.max(0, Math.floor(Number(def.points)) || 0)} ✦`;

  $points.appendChild($pointsLabel);
  $points.appendChild($pointsValue);

  $main.appendChild($copy);
  $main.appendChild($progress);

  if (debug) {
    const $debug = document.createElement('div');
    $debug.className = 'achievement-debug-controls';

    for (const [label, action] of [
      ['−', 'decrement'],
      ['+', 'increment'],
      ['0', 'reset'],
    ]) {
      const $btn = document.createElement('button');
      $btn.type = 'button';
      $btn.className = 'achievement-debug-btn';
      $btn.dataset.goalKey = def.goalKey;
      $btn.dataset.action = action;
      $btn.textContent = label;
      $debug.appendChild($btn);
    }

    $main.appendChild($debug);
  }

  $card.appendChild($icon);
  $card.appendChild($main);
  $card.appendChild($points);

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
  const debug = Boolean(S.debugMode);

  $body.replaceChildren();

  if (debug) {
    const $debugBar = document.createElement('div');
    $debugBar.className = 'achievements-debug-bar';

    const $debugLabel = document.createElement('span');
    $debugLabel.className = 'achievements-debug-label';
    $debugLabel.textContent = 'Debug';

    const $resetAll = document.createElement('button');
    $resetAll.type = 'button';
    $resetAll.className = 'achievement-debug-btn achievement-debug-btn--reset-all';
    $resetAll.dataset.action = 'resetAll';
    $resetAll.textContent = 'Reset all';

    $debugBar.appendChild($debugLabel);
    $debugBar.appendChild($resetAll);
    $body.appendChild($debugBar);
  }

  const $list = document.createElement('div');
  $list.className = 'achievements-list';

  for (const def of ACHIEVEMENT_DEFS) {
    $list.appendChild(
      createAchievementCard(def, progress[def.goalKey] || 0, { debug }),
    );
  }

  $body.appendChild($list);

  if (debug) {
    $body.onclick = (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest('.achievement-debug-btn');
      if (!btn) return;

      const action = btn.dataset.action;
      if (action === 'resetAll') {
        resetAllAchievementProgress();
        renderAchievementsScreen({ container, isActive });
        return;
      }

      const goalKey = btn.dataset.goalKey;
      if (!goalKey) return;
      const current = loadAchievementProgress()[goalKey] || 0;
      if (action === 'increment') {
        setAchievementProgress(goalKey, current + 1);
      } else if (action === 'decrement') {
        setAchievementProgress(goalKey, Math.max(0, current - 1));
      } else if (action === 'reset') {
        setAchievementProgress(goalKey, 0);
      }
      renderAchievementsScreen({ container, isActive });
    };
  } else {
    $body.onclick = null;
  }

  if (typeof isActive === 'function' && !isActive()) return;
}
