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

function cloneTemplateFirstElement(id) {
  const template = document.getElementById(id);
  const first = template?.content?.firstElementChild;
  return first ? first.cloneNode(true) : null;
}

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

function renderAchievementsTitle($title) {
  const icon = document.createElement('span');
  icon.className = 'menu-screen-title-icon';
  icon.textContent = '🏅';
  icon.setAttribute('aria-hidden', 'true');

  const text = document.createElement('span');
  text.className = 'menu-screen-title-text';
  text.textContent = t('achievements.title');

  const rule = document.createElement('span');
  rule.className = 'menu-screen-title-rule';
  rule.setAttribute('aria-hidden', 'true');

  $title.replaceChildren(icon, text, rule);
}

function createAchievementCard(def, progress) {
  const target = Math.max(1, Math.floor(Number(def.target)) || 1);
  const value = Math.max(0, Math.floor(Number(progress)) || 0);
  const done = value >= target;
  const ratio = Math.min(1, value / target);

  const $card = cloneTemplateFirstElement('$achievementCardTemplate');
  if (!($card instanceof HTMLElement)) return document.createElement('article');

  const $icon = $card.querySelector('.achievement-card-icon');
  const $title = $card.querySelector('.achievement-card-title');
  const $desc = $card.querySelector('.achievement-card-desc');
  const $fill = $card.querySelector('.achievement-card-fill');
  const $progressText = $card.querySelector('.achievement-card-progress-text');
  const $pointsValue = $card.querySelector('.achievement-card-points-value');
  const $debug = $card.querySelector('.achievement-debug-controls');

  $card.classList.toggle('is-complete', done);
  if ($icon) $icon.textContent = def.icon;
  if ($title) $title.textContent = t(def.titleKey);
  if ($desc) $desc.textContent = t(def.descKey);
  if ($fill) $fill.style.width = `${Math.round(ratio * 100)}%`;
  if ($progressText) {
    $progressText.textContent = t('achievements.progress', { value, target });
  }
  if ($pointsValue) {
    $pointsValue.textContent = `${Math.max(0, Math.floor(Number(def.points)) || 0)} ✦`;
  }

  if ($debug) {
    const $debugButtons = $debug.querySelectorAll('.achievement-debug-btn');
    for (const $btn of $debugButtons) {
      $btn.dataset.achievementId = def.id;
    }
  }

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
  const $debugBar = $toolbarRight?.querySelector('.achievements-debug-bar');
  const $debugLabel = $debugBar?.querySelector('.achievements-debug-label');
  const $resetAll = $debugBar?.querySelector(
    '.achievement-debug-btn--reset-all',
  );
  const $list = $body?.querySelector('.achievements-list');
  const $empty = $list?.querySelector('.achievements-empty');

  if (
    !$title ||
    !$subtitle ||
    !$body ||
    !$toolbar ||
    !$toolbarRight ||
    !$filterToggle ||
    !$totalPoints ||
    !$debugBar ||
    !$list ||
    !$empty
  )
    return;

  renderAchievementsTitle($title);
  $subtitle.textContent = t('achievements.subtitle');

  const progress = loadAchievementProgress();
  const totalPoints = getUnlockedAchievementPoints(progress);
  $totalPoints.textContent = t('achievements.total_points', {
    points: totalPoints,
  });

  $filterToggle.classList.toggle('is-active', hideCompleted);
  $filterToggle.textContent = hideCompleted
    ? t('achievements.filter.show_all')
    : t('achievements.filter.hide_completed');

  if ($debugLabel) $debugLabel.textContent = 'Debug';
  if ($resetAll) $resetAll.textContent = 'Reset all';
  $list.replaceChildren();
  $empty.hidden = true;
  $empty.textContent = t('achievements.filter.empty');
  $list.appendChild($empty);

  let visibleCount = 0;
  for (const def of ACHIEVEMENT_DEFS) {
    const currentProgress = progress[def.id] || 0;
    const done = isAchievementDone(def, currentProgress);
    if (hideCompleted && done) continue;

    const card = createAchievementCard(def, currentProgress);
    $list.insertBefore(card, $empty);
    visibleCount += 1;
  }

  if (visibleCount === 0) {
    $empty.hidden = false;
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

    if (!S.debugMode) return;
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
