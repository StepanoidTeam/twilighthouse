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
import { currentUser } from './auth.js';

const COLLECTION = 'leaderboard';

/**
 * Подбирает отображаемое имя для записи в лидерборд.
 * - Для email-юзеров: displayName, иначе часть email до @.
 * - Для анонимных: "Гость-ABCD" (4 первых символа uid в верхнем регистре).
 */
function resolveDisplayName(user) {
  if (user.displayName && user.displayName.trim()) {
    return user.displayName.trim();
  }
  if (user.email) {
    return user.email.split('@')[0];
  }
  const tag = (user.uid || '').slice(0, 4).toUpperCase() || 'XXXX';
  return `Гость-${tag}`;
}

/**
 * Submit a winning run. Stores the user's best survival time in `leaderboard/{uid}`.
 * Only writes if the new winning time beats the previously stored best.
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

  if (prevBest > 0 && survivalMs >= prevBest) {
    return { written: false, best: prevBest };
  }

  const displayName = resolveDisplayName(currentUser);

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
