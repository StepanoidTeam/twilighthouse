import { db } from '../firebase.init.js';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  getDocs,
} from '../firebase.js';
import { currentUser } from './auth.js';
import { t } from './i18n.js';
import {
  resolveUserDisplayName,
  pickStoredDisplayName,
} from './profile-store.js';

const COLLECTION = 'leaderboard';

/**
 * Sync current user's displayName to leaderboard doc when the row already exists.
 * Does not create new rows and does not touch bestTimeMs / updatedAt.
 */
export async function syncCurrentUserLeaderboardDisplayName(
  user = currentUser,
) {
  if (!user || !user.uid) return false;

  const uid = user.uid;
  const nextDisplayName = resolveUserDisplayName(user);
  if (!nextDisplayName) return false;

  const ref = doc(db, COLLECTION, uid);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;

    const prevDisplayName = snap.data().displayName || null;
    if (prevDisplayName === nextDisplayName) return false;

    await setDoc(
      ref,
      {
        displayName: nextDisplayName,
      },
      { merge: true },
    );
    return true;
  } catch (e) {
    console.warn('Failed to sync leaderboard displayName', e);
    return false;
  }
}

/**
 * Submit a run. Stores the user's best (keeper level from lifetime XP, time) in `leaderboard/{uid}`.
 * Tie-break: higher level wins; at the same level, longer survival wins.
 * Returns { written, bestLevel, bestTimeMs } or null if not signed in.
 */
export async function submitScore(survivalMs, maxLevelReached = 0) {
  if (!currentUser) return null;
  if (!Number.isFinite(survivalMs) || survivalMs <= 0) return null;
  const newLevel = Math.max(
    0,
    Number.isFinite(maxLevelReached) ? Math.floor(maxLevelReached) : 0,
  );
  const newTime = Math.round(survivalMs);

  const uid = currentUser.uid;
  const ref = doc(db, COLLECTION, uid);

  let prevTime = 0;
  let prevLevel = 0;
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      prevTime = Number(snap.data().bestTimeMs) || 0;
      prevLevel = Number(snap.data().bestLevel) || 0;
    }
  } catch (e) {
    console.warn('Failed to read previous best', e);
  }

  // Записываем, если выше уровень или (тот же уровень и дольше выжили).
  const isBetter =
    newLevel > prevLevel || (newLevel === prevLevel && newTime > prevTime);

  if (!isBetter) {
    return { written: false, bestLevel: prevLevel, bestTimeMs: prevTime };
  }

  const payload = {
    uid,
    bestTimeMs: newTime,
    bestLevel: newLevel,
    updatedAt: serverTimestamp(),
  };

  const displayName = resolveUserDisplayName(currentUser);
  if (displayName) payload.displayName = displayName;

  await setDoc(ref, payload, { merge: true });

  return { written: true, bestLevel: newLevel, bestTimeMs: newTime };
}

/**
 * Fetch top N entries sorted by (bestLevel desc, bestTimeMs desc).
 * Sort is done client-side because we need a composite key and the
 * collection is small. Returns array of { uid, displayName, bestLevel, bestTimeMs }.
 */
export async function fetchTopLeaderboard(n = 10) {
  const snap = await getDocs(collection(db, COLLECTION));
  const rows = [];
  snap.forEach((d) => {
    const data = d.data();
    const uid = data.uid || d.id;
    rows.push({
      uid,
      displayName: pickStoredDisplayName(data.displayName, uid),
      bestLevel: Number(data.bestLevel) || 0,
      bestTimeMs: Number(data.bestTimeMs) || 0,
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
    });
  });
  rows.sort(compareEntries);
  return rows.slice(0, n);
}

function compareEntries(a, b) {
  if (b.bestLevel !== a.bestLevel) return b.bestLevel - a.bestLevel;
  return b.bestTimeMs - a.bestTimeMs;
}

/**
 * Fetches top N winning leaderboard entries and appends the current player's row
 * when they are outside the visible top list.
 * Returns { rows, currentUid } where each row includes a 1-based rank.
 */
export async function fetchLeaderboardView(n = 50, uid = currentUser?.uid) {
  const snap = await getDocs(collection(db, COLLECTION));
  const allRows = [];

  snap.forEach((d) => {
    const data = d.data();
    const uid = data.uid || d.id;
    allRows.push({
      uid,
      displayName: pickStoredDisplayName(data.displayName, uid),
      bestLevel: Number(data.bestLevel) || 0,
      bestTimeMs: Number(data.bestTimeMs) || 0,
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
    });
  });

  allRows.sort(compareEntries);

  const topRows = allRows.slice(0, n).map((row, index) => ({
    ...row,
    rank: index + 1,
  }));

  if (!uid) {
    return { rows: topRows, currentUid: null };
  }

  const currentInTop = topRows.some((row) => row.uid === uid);
  if (currentInTop) {
    return { rows: topRows, currentUid: uid };
  }

  const currentIndex = allRows.findIndex((row) => row.uid === uid);
  if (currentIndex === -1) {
    return { rows: topRows, currentUid: uid };
  }

  return {
    rows: [
      ...topRows,
      {
        ...allRows[currentIndex],
        rank: currentIndex + 1,
      },
    ],
    currentUid: uid,
  };
}

/** Format ms → "M:SS" */
export function formatSurvivalTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Format Date → locale date and time */
export function formatLeaderboardDateTime(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

function cloneTemplateFirstElement(id) {
  const $template = document.getElementById(id);
  const first = $template?.content?.firstElementChild;
  return first ? first.cloneNode(true) : null;
}

function createLeaderboardHeader() {
  const $header = cloneTemplateFirstElement('$menuLeaderboardHeaderTemplate');
  if (!($header instanceof HTMLElement)) return null;

  const $headerRank = $header.querySelector('[data-col="rank"]');
  const $headerName = $header.querySelector('[data-col="name"]');
  const $headerLevel = $header.querySelector('[data-col="level"]');
  const $headerTime = $header.querySelector('[data-col="time"]');
  const $headerDate = $header.querySelector('[data-col="date"]');

  if ($headerRank) $headerRank.textContent = t('leaderboard.col.rank');
  if ($headerName) $headerName.textContent = t('leaderboard.col.name');
  if ($headerLevel) $headerLevel.textContent = t('leaderboard.col.level');
  if ($headerTime) $headerTime.textContent = t('leaderboard.col.time');
  if ($headerDate) $headerDate.textContent = t('leaderboard.col.date');

  return $header;
}

function createLeaderboardRow(entry, myUid) {
  const isMe = myUid && entry.uid === myUid;
  const medal =
    entry.rank === 1
      ? '🥇'
      : entry.rank === 2
        ? '🥈'
        : entry.rank === 3
          ? '🥉'
          : `${entry.rank}.`;
  const label = isMe
    ? `${entry.displayName} ${t('leaderboard.you')}`
    : entry.displayName;

  const $row = cloneTemplateFirstElement('$menuLeaderboardRowTemplate');
  if (!($row instanceof HTMLElement)) return { $row: null, isMe };

  $row.classList.toggle('is-highlight', entry.rank <= 3 || isMe);

  const $rank = $row.querySelector('.menu-leaderboard-rank');
  if ($rank) $rank.textContent = medal;

  const $name = $row.querySelector('.menu-leaderboard-name');
  if ($name) $name.textContent = label;

  const $level = $row.querySelector('.menu-leaderboard-level');
  if ($level) {
    // Старые записи без bestLevel — показываем 0 (как и просили).
    $level.textContent = t('hud.level.prefix', { n: entry.bestLevel || 0 });
  }

  const $time = $row.querySelector('.menu-leaderboard-time');
  if ($time) $time.textContent = formatSurvivalTime(entry.bestTimeMs);

  const $date = $row.querySelector('.menu-leaderboard-date');
  if ($date) $date.textContent = formatLeaderboardDateTime(entry.updatedAt);

  return { $row, isMe };
}

export async function renderLeaderboardScreen({ container, isActive }) {
  if (!container) return;

  const $title = container.querySelector('.menu-screen-title');
  const $subtitle = container.querySelector('.menu-screen-subtitle');
  const $body = container.querySelector('.menu-card');
  const $loading = $body?.querySelector('.menu-leaderboard-loading');
  const $error = $body?.querySelector('.menu-leaderboard-error');
  const $empty = $body?.querySelector('.menu-leaderboard-empty');
  const $headerSlot = $body?.querySelector('.menu-leaderboard-header-slot');
  const $list = $body?.querySelector('.menu-leaderboard-list');

  if (
    !$title ||
    !$subtitle ||
    !$body ||
    !$loading ||
    !$error ||
    !$empty ||
    !$headerSlot ||
    !$list
  ) {
    return;
  }

  $title.textContent = t('leaderboard.title');
  $subtitle.textContent = t('leaderboard.subtitle');

  $loading.textContent = t('leaderboard.loading');
  $error.textContent = t('leaderboard.loadError');
  $empty.textContent = t('leaderboard.empty');

  $loading.hidden = false;
  $error.hidden = true;
  $empty.hidden = true;
  $headerSlot.hidden = true;
  $list.hidden = true;
  $headerSlot.replaceChildren();
  $list.replaceChildren();

  let leaderboardView = { rows: [], currentUid: null };
  let error = null;
  try {
    await syncCurrentUserLeaderboardDisplayName(currentUser);
    leaderboardView = await fetchLeaderboardView(50, currentUser?.uid);
  } catch (e) {
    console.warn('Failed to load leaderboard', e);
    error = e;
  }

  if (!isActive()) return;

  $loading.hidden = true;

  if (error) {
    $error.hidden = false;
    return;
  }

  if (leaderboardView.rows.length === 0) {
    $empty.hidden = false;
    return;
  }

  const $header = createLeaderboardHeader();
  if (!($header instanceof HTMLElement)) return;

  $headerSlot.hidden = false;
  $headerSlot.replaceChildren($header);
  $list.hidden = false;

  const myUid = currentUser ? currentUser.uid : null;
  let $currentRow = null;

  for (const entry of leaderboardView.rows) {
    const { $row, isMe } = createLeaderboardRow(entry, myUid);
    if (!($row instanceof HTMLElement)) continue;
    if (isMe) {
      $row.classList.add('current-user');
      $row.dataset.currentUser = 'true';
      $currentRow = $row;
    }
    $list.appendChild($row);
  }

  if ($currentRow) {
    requestAnimationFrame(() => {
      $currentRow.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'auto',
      });
    });
  }
}
