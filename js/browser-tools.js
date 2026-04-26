import { db } from '../firebase.init.js';
import {
  collection,
  getDocs,
  setDoc,
  doc,
  getIdTokenResult,
} from '../firebase.js';
import {
  PROFILES_COLLECTION,
  resolveUserDisplayName,
  syncUserProfileDoc,
} from './profile-store.js';
import { currentUser } from './auth.js';

const LEADERBOARD_COLLECTION = 'leaderboard';

function getFirebaseErrorCode(error) {
  return error?.code || error?.errorInfo?.code || 'unknown';
}

function isPermissionDenied(error) {
  return getFirebaseErrorCode(error) === 'permission-denied';
}

function logSummary(summary) {
  if (summary.changes?.length) {
    console.table(summary.changes.slice(0, 50));
  }
  console.log('[leaderboard sync] summary', summary);
}

function buildProfileLike(profileData, uid) {
  return {
    uid,
    displayName: profileData.displayName || '',
    email: profileData.email || '',
  };
}

export async function getAdminStatus({ forceRefresh = false } = {}) {
  if (!currentUser) {
    return {
      signedIn: false,
      admin: false,
      claims: {},
    };
  }

  const tokenResult = await getIdTokenResult(currentUser, forceRefresh);
  return {
    signedIn: true,
    admin: tokenResult.claims.admin === true,
    claims: tokenResult.claims,
  };
}

export async function syncLeaderboardDisplayNamesFromProfiles({
  write = false,
} = {}) {
  if (write) {
    try {
      const adminStatus = await getAdminStatus({ forceRefresh: true });
      if (!adminStatus.admin) {
        const summary = {
          mode: 'write',
          checked: 0,
          missingProfile: 0,
          unchanged: 0,
          planned: 0,
          updated: 0,
          failed: 0,
          changes: [],
          blocked: true,
          errorCode: 'missing-admin-claim',
          errorMessage: 'Current user does not have admin custom claim.',
          note: 'Grant admin via custom claims, then sign out/sign in again or refresh token before running browser bulk sync.',
        };
        logSummary(summary);
        return summary;
      }
    } catch (e) {
      const summary = {
        mode: 'write',
        checked: 0,
        missingProfile: 0,
        unchanged: 0,
        planned: 0,
        updated: 0,
        failed: 0,
        changes: [],
        blocked: true,
        errorCode: getFirebaseErrorCode(e),
        errorMessage: e?.message || String(e),
        note: 'Failed to refresh auth token / read admin custom claims.',
      };
      logSummary(summary);
      return summary;
    }
  }

  let leaderboardSnap;
  let profilesSnap;

  try {
    [leaderboardSnap, profilesSnap] = await Promise.all([
      getDocs(collection(db, LEADERBOARD_COLLECTION)),
      getDocs(collection(db, PROFILES_COLLECTION)),
    ]);
  } catch (e) {
    const summary = {
      mode: write ? 'write' : 'dry-run',
      checked: 0,
      missingProfile: 0,
      unchanged: 0,
      planned: 0,
      updated: 0,
      failed: 0,
      changes: [],
      blocked: isPermissionDenied(e),
      errorCode: getFirebaseErrorCode(e),
      errorMessage: e?.message || String(e),
      note: isPermissionDenied(e)
        ? 'Client-side bulk sync is blocked by Firestore rules. Use admin flow or temporary privileged rules.'
        : 'Failed to read leaderboard/profiles for sync.',
    };
    logSummary(summary);
    return summary;
  }

  const profilesByUid = new Map();
  profilesSnap.forEach((profileDoc) => {
    profilesByUid.set(profileDoc.id, profileDoc.data() || {});
  });

  const summary = {
    mode: write ? 'write' : 'dry-run',
    checked: 0,
    missingProfile: 0,
    unchanged: 0,
    planned: 0,
    updated: 0,
    failed: 0,
    changes: [],
    blocked: false,
  };

  for (const rowDoc of leaderboardSnap.docs) {
    summary.checked += 1;
    const row = rowDoc.data() || {};
    const uid = row.uid || rowDoc.id;
    const profileData = profilesByUid.get(uid);

    if (!profileData) {
      summary.missingProfile += 1;
      continue;
    }

    const nextDisplayName = resolveUserDisplayName(
      buildProfileLike(profileData, uid),
    );
    const prevDisplayName = String(row.displayName || '');

    if (prevDisplayName === nextDisplayName) {
      summary.unchanged += 1;
      continue;
    }

    summary.planned += 1;
    summary.changes.push({ uid, prevDisplayName, nextDisplayName });

    if (!write) continue;

    try {
      await setDoc(
        doc(db, LEADERBOARD_COLLECTION, rowDoc.id),
        { displayName: nextDisplayName },
        { merge: true },
      );
      summary.updated += 1;
    } catch (e) {
      summary.failed += 1;
      if (isPermissionDenied(e)) {
        summary.blocked = true;
        summary.errorCode = getFirebaseErrorCode(e);
        summary.errorMessage = e?.message || String(e);
        summary.note =
          'Writes to other leaderboard rows are blocked by Firestore rules for browser clients.';
      }
      console.warn(`[leaderboard sync] failed for ${uid}`, e);
    }
  }

  logSummary(summary);
  return summary;
}

export async function syncMyProfileDoc() {
  if (!currentUser) return false;

  try {
    return await syncUserProfileDoc(currentUser);
  } catch (e) {
    console.warn('[profile sync] failed', e);
    return false;
  }
}

export function registerBrowserTools() {
  const tools = {
    getAdminStatus,
    syncLeaderboardDisplayNamesFromProfiles,
    syncMyProfileDoc,
  };

  globalThis.lighthouseTools = {
    ...(globalThis.lighthouseTools || {}),
    ...tools,
  };

  return globalThis.lighthouseTools;
}
