import {
  ACHIEVEMENT_DEFS,
  loadAchievementProgress,
  resetAllAchievementProgress,
  setAchievementProgress,
} from './achievements.js';
import { t } from './i18n.js';
import S from './state.js';

const FILTER_STORAGE_KEY = 'lighthouse_achievements_hide_completed_v1';

function loadHideCompletedFilterState() {
  try {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    return raw === '1' || raw === 'true';
  } catch (_) {
    return false;
  }
}

function saveHideCompletedFilterState(value) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(FILTER_STORAGE_KEY, value ? '1' : '0');
  } catch (_) {
    // ignore storage failures
  }
}

let hideCompleted = loadHideCompletedFilterState();

function isAchievementDone(def, progressValue) {
  const target = Math.max(1, Math.floor(Number(def?.target)) || 1);
  return Math.max(0, Math.floor(Number(progressValue)) || 0) >= target;
}

function getUnlockedAchievementPoints(progress) {
  let total = 0;
  for (const def of ACHIEVEMENT_DEFS) {
    if (!isAchievementDone(def, progress[def.id] || 0)) continue;
    total += Math.max(0, Math.floor(Number(def.points)) || 0);
  }
  return total;
}

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

  const $pointsValue = document.createElement('span');
  $pointsValue.className = 'achievement-card-points-value';
  $pointsValue.textContent = `${Math.max(0, Math.floor(Number(def.points)) || 0)} ✦`;

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
      $btn.dataset.achievementId = def.id;
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
  const $toolbar = $body?.querySelector('.achievements-toolbar');
  const $toolbarLeft = $toolbar?.querySelector('.achievements-toolbar-left');
  const $toolbarRight = $toolbar?.querySelector('.achievements-toolbar-right');
  const $filterToggle = $toolbarLeft?.querySelector('.achievements-filter-btn');
  const $totalPoints = $toolbarRight?.querySelector(
    '.achievements-total-points',
  );
  const $list = $body?.querySelector('.achievements-list');

  if (
    !$title ||
    !$subtitle ||
    !$body ||
    !$toolbar ||
    !$toolbarRight ||
    !$filterToggle ||
    !$totalPoints ||
    !$list
  )
    return;

  $title.textContent = t('achievements.title');
  $subtitle.textContent = t('achievements.subtitle');

  const progress = loadAchievementProgress();
  const debug = Boolean(S.debugMode);

  const totalPoints = getUnlockedAchievementPoints(progress);
  $totalPoints.textContent = t('achievements.total_points', {
    points: totalPoints,
  });

  $filterToggle.classList.toggle('is-active', hideCompleted);
  $filterToggle.textContent = hideCompleted
    ? t('achievements.filter.show_all')
    : t('achievements.filter.hide_completed');

  const existingDebugBar = $toolbarRight.querySelector(
    '.achievements-debug-bar',
  );
  if (existingDebugBar) existingDebugBar.remove();

  if (debug) {
    const $debugBar = document.createElement('div');
    $debugBar.className = 'achievements-debug-bar';

    const $debugLabel = document.createElement('span');
    $debugLabel.className = 'achievements-debug-label';
    $debugLabel.textContent = 'Debug';

    const $resetAll = document.createElement('button');
    $resetAll.type = 'button';
    $resetAll.className =
      'achievement-debug-btn achievement-debug-btn--reset-all';
    $resetAll.dataset.action = 'resetAll';
    $resetAll.textContent = 'Reset all';

    $debugBar.appendChild($debugLabel);
    $debugBar.appendChild($resetAll);
    $toolbarRight.insertBefore($debugBar, $totalPoints);
  }

  $list.replaceChildren();

  let visibleCount = 0;
  for (const def of ACHIEVEMENT_DEFS) {
    const currentProgress = progress[def.id] || 0;
    const done = isAchievementDone(def, currentProgress);
    if (hideCompleted && done) continue;

    $list.appendChild(createAchievementCard(def, currentProgress, { debug }));
    visibleCount += 1;
  }

  if (visibleCount === 0) {
    const $empty = document.createElement('p');
    $empty.className = 'achievements-empty';
    $empty.textContent = t('achievements.filter.empty');
    $list.appendChild($empty);
  }

  $body.onclick = (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;

    const filterBtn = target.closest('.achievements-filter-btn');
    if (filterBtn) {
      hideCompleted = !hideCompleted;
      saveHideCompletedFilterState(hideCompleted);
      renderAchievementsScreen({ container, isActive });
      return;
    }

    if (!debug) return;
    const btn = target.closest('.achievement-debug-btn');
    if (!btn) return;

    const action = btn.dataset.action;
    if (action === 'resetAll') {
      resetAllAchievementProgress();
      renderAchievementsScreen({ container, isActive });
      return;
    }

    const achievementId = btn.dataset.achievementId;
    if (!achievementId) return;
    const current = loadAchievementProgress()[achievementId] || 0;
    if (action === 'increment') {
      setAchievementProgress(achievementId, current + 1);
    } else if (action === 'decrement') {
      setAchievementProgress(achievementId, Math.max(0, current - 1));
    } else if (action === 'reset') {
      setAchievementProgress(achievementId, 0);
    }
    renderAchievementsScreen({ container, isActive });
  };

  if (typeof isActive === 'function' && !isActive()) return;
}
