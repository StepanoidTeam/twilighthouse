import { db } from '../firebase.init.js';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from '../firebase.js';
import { currentUser, isSignedInReal } from './auth.js';
import { t } from './i18n.js';
import { resolveUserDisplayName } from './profile-store.js';

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
  const ref = doc(db, COLLECTION, uid);

  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) return false;

    const prevDisplayName = String(snap.data().displayName || '');
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
 * Submit a winning run. Stores the user's best survival time in `leaderboard/{uid}`.
 * Only writes if the new winning time is greater than the previously stored best.
 * Returns { written: boolean, best: number } or null if not signed in.
 */
export async function submitScore(survivalMs) {
  if (!currentUser) return null;
  if (!Number.isFinite(survivalMs) || survivalMs <= 0) return null;

  const uid = currentUser.uid;
  const ref = doc(db, COLLECTION, uid);

  // Read existing best
  let prevBest = 0;
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      prevBest = Number(snap.data().bestTimeMs) || 0;
    }
  } catch (e) {
    console.warn('Failed to read previous best', e);
  }

  if (prevBest > 0 && survivalMs <= prevBest) {
    return { written: false, best: prevBest };
  }

  const displayName = resolveUserDisplayName(currentUser);

  await setDoc(
    ref,
    {
      uid,
      displayName,
      bestTimeMs: Math.round(survivalMs),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return { written: true, best: Math.round(survivalMs) };
}

/**
 * Fetch top N winning entries ordered by bestTimeMs desc.
 * Returns array of { uid, displayName, bestTimeMs }.
 */
export async function fetchTopLeaderboard(n = 10) {
  const q = query(
    collection(db, COLLECTION),
    orderBy('bestTimeMs', 'desc'),
    limit(n),
  );
  const snap = await getDocs(q);
  const rows = [];
  snap.forEach((d) => {
    const data = d.data();
    rows.push({
      uid: data.uid || d.id,
      displayName: data.displayName || 'Аноним',
      bestTimeMs: Number(data.bestTimeMs) || 0,
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
    });
  });
  return rows;
}

/**
 * Fetches top N winning leaderboard entries and appends the current player's row
 * when they are outside the visible top list.
 * Returns { rows, currentUid } where each row includes a 1-based rank.
 */
export async function fetchLeaderboardView(n = 50, uid = currentUser?.uid) {
  const q = query(collection(db, COLLECTION), orderBy('bestTimeMs', 'desc'));
  const snap = await getDocs(q);
  const allRows = [];

  snap.forEach((d) => {
    const data = d.data();
    allRows.push({
      uid: data.uid || d.id,
      displayName: data.displayName || 'Аноним',
      bestTimeMs: Number(data.bestTimeMs) || 0,
      updatedAt: data.updatedAt ? data.updatedAt.toDate() : null,
    });
  });

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

function createLeaderboardHeader() {
  const $template = document.getElementById('$menuLeaderboardHeaderTemplate');
  const $header = $template?.content.firstElementChild?.cloneNode(true);

  if (!$header) {
    const $fallback = document.createElement('div');
    $fallback.className = 'menu-leaderboard-header';
    return $fallback;
  }

  const $headerRank = $header.querySelector('[data-col="rank"]');
  const $headerName = $header.querySelector('[data-col="name"]');
  const $headerTime = $header.querySelector('[data-col="time"]');
  const $headerDate = $header.querySelector('[data-col="date"]');

  if ($headerRank) $headerRank.textContent = t('leaderboard.col.rank');
  if ($headerName) $headerName.textContent = t('leaderboard.col.name');
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

  const $row = document.createElement('div');
  $row.className = `menu-leaderboard-row${entry.rank <= 3 || isMe ? ' is-highlight' : ''}`;

  const $rank = document.createElement('span');
  $rank.className = 'menu-leaderboard-rank';
  $rank.textContent = medal;

  const $name = document.createElement('span');
  $name.className = 'menu-leaderboard-name';
  $name.textContent = label;

  const $time = document.createElement('span');
  $time.className = 'menu-leaderboard-time';
  $time.textContent = formatSurvivalTime(entry.bestTimeMs);

  const $date = document.createElement('span');
  $date.className = 'menu-leaderboard-date';
  $date.textContent = formatLeaderboardDateTime(entry.updatedAt);

  $row.appendChild($rank);
  $row.appendChild($name);
  $row.appendChild($time);
  $row.appendChild($date);

  return { $row, isMe };
}

export async function renderLeaderboardScreen({ buildScreenShell, isActive }) {
  const $screen = buildScreenShell(
    t('leaderboard.title'),
    t('leaderboard.subtitle'),
  );
  if (!$screen) return;

  const $body = document.createElement('div');
  $body.className = 'menu-card menu-leaderboard';
  const $loading = document.createElement('p');
  $loading.className = 'menu-state-label';
  $loading.textContent = t('leaderboard.loading');
  $body.appendChild($loading);
  $screen.appendChild($body);

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

  $body.innerHTML = '';

  if (error) {
    const $error = document.createElement('p');
    $error.className = 'menu-state-label';
    $error.textContent = t('leaderboard.loadError');
    $body.appendChild($error);
    return;
  }

  if (leaderboardView.rows.length === 0) {
    const $empty = document.createElement('p');
    $empty.className = 'menu-state-label';
    $empty.textContent = t('leaderboard.empty');
    $body.appendChild($empty);
    return;
  }

  $body.appendChild(createLeaderboardHeader());

  const $list = document.createElement('div');
  $list.className = 'menu-leaderboard-list';
  const myUid = currentUser ? currentUser.uid : null;
  let $currentRow = null;

  for (const entry of leaderboardView.rows) {
    const { $row, isMe } = createLeaderboardRow(entry, myUid);
    if (isMe) {
      $row.dataset.currentUser = 'true';
      $currentRow = $row;
    }
    $list.appendChild($row);
  }

  $body.appendChild($list);

  if ($currentRow) {
    requestAnimationFrame(() => {
      $currentRow.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'auto',
      });
    });
  }

  if (!isSignedInReal(currentUser)) {
    const $note = document.createElement('p');
    $note.className = 'menu-card-note';
    $note.textContent = t('leaderboard.signInPrompt');
    $body.appendChild($note);
  }
}
