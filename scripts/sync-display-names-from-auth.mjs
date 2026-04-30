#!/usr/bin/env node

/**
 * Sync display names from Firebase Authentication to Firestore
 * collections: profiles and leaderboard.
 *
 * Source of truth: Firebase Auth user.displayName.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/abs/path/service-account.json \
 *   node scripts/sync-display-names-from-auth.mjs
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/abs/path/service-account.json \
 *   node scripts/sync-display-names-from-auth.mjs --write
 */

import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';

const LEADERBOARD_COLLECTION = 'leaderboard';
const PROFILES_COLLECTION = 'profiles';

function hasFlag(flagName) {
  return process.argv.includes(flagName);
}

function parseServiceAccountFromEnv() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON. Fix it or use GOOGLE_APPLICATION_CREDENTIALS.',
    );
  }
}

function parseServiceAccountFromFile() {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!path) return null;

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    const isServiceAccount =
      typeof parsed?.project_id === 'string' &&
      typeof parsed?.client_email === 'string' &&
      typeof parsed?.private_key === 'string';
    return isServiceAccount ? parsed : null;
  } catch {
    return null;
  }
}

function resolveProjectId(serviceAccount) {
  return (
    serviceAccount?.project_id ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.FIREBASE_PROJECT_ID ||
    null
  );
}

function chunk(array, size) {
  const out = [];
  for (let i = 0; i < array.length; i += size) {
    out.push(array.slice(i, i + size));
  }
  return out;
}

async function loadAuthDisplayNames(auth) {
  const byUid = new Map();
  let pageToken;

  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      const displayName =
        typeof user.displayName === 'string' ? user.displayName.trim() : '';
      if (!displayName) continue;
      byUid.set(user.uid, {
        uid: user.uid,
        displayName,
        email: user.email || null,
      });
    }
    pageToken = page.pageToken;
  } while (pageToken);

  return byUid;
}

async function commitWrites(db, writes) {
  if (!writes.length) return;

  for (const group of chunk(writes, 450)) {
    const batch = db.batch();
    for (const write of group) {
      const ref = db.collection(write.collection).doc(write.id);
      batch.set(ref, write.data, { merge: true });
    }
    await batch.commit();
  }
}

async function main() {
  const write = hasFlag('--write');
  const mode = write ? 'write' : 'dry-run';

  const serviceAccount =
    parseServiceAccountFromEnv() || parseServiceAccountFromFile();
  const credential = serviceAccount
    ? cert(serviceAccount)
    : applicationDefault();
  const projectId = resolveProjectId(serviceAccount);

  if (!projectId) {
    throw new Error(
      'Unable to detect Firebase projectId. Set FIREBASE_PROJECT_ID/GOOGLE_CLOUD_PROJECT or provide service account JSON with project_id.',
    );
  }

  initializeApp({ credential, projectId });

  const auth = getAuth();
  const db = getFirestore();

  const [authByUid, profilesSnap, leaderboardSnap] = await Promise.all([
    loadAuthDisplayNames(auth),
    db.collection(PROFILES_COLLECTION).get(),
    db.collection(LEADERBOARD_COLLECTION).get(),
  ]);

  const profilesByUid = new Map();
  for (const profileDoc of profilesSnap.docs) {
    profilesByUid.set(profileDoc.id, profileDoc.data() || {});
  }

  const summary = {
    mode,
    authUsersWithDisplayName: authByUid.size,
    leaderboardRowsChecked: 0,
    missingAuth: 0,
    profilePlanned: 0,
    leaderboardPlanned: 0,
    profileUpdated: 0,
    leaderboardUpdated: 0,
    changes: [],
  };

  const writes = [];

  for (const rowDoc of leaderboardSnap.docs) {
    summary.leaderboardRowsChecked += 1;

    const row = rowDoc.data() || {};
    const uid = row.uid || rowDoc.id;
    const authUser = authByUid.get(uid);

    if (!authUser) {
      summary.missingAuth += 1;
      continue;
    }

    const nextDisplayName = authUser.displayName;
    const prevLeaderboardDisplayName = row.displayName || null;

    if (prevLeaderboardDisplayName !== nextDisplayName) {
      summary.leaderboardPlanned += 1;
      summary.changes.push({
        uid,
        target: LEADERBOARD_COLLECTION,
        prevDisplayName: prevLeaderboardDisplayName,
        nextDisplayName,
      });
      writes.push({
        collection: LEADERBOARD_COLLECTION,
        id: rowDoc.id,
        data: {
          displayName: nextDisplayName,
        },
      });
    }

    const profile = profilesByUid.get(uid) || {};
    const prevProfileDisplayName = profile.displayName || null;
    const prevProfileEmail = profile.email || null;

    if (
      prevProfileDisplayName !== nextDisplayName ||
      prevProfileEmail !== (authUser.email || null)
    ) {
      summary.profilePlanned += 1;
      writes.push({
        collection: PROFILES_COLLECTION,
        id: uid,
        data: {
          uid,
          displayName: nextDisplayName,
          email: authUser.email || null,
          updatedAt: FieldValue.serverTimestamp(),
        },
      });
      summary.changes.push({
        uid,
        target: PROFILES_COLLECTION,
        prevDisplayName: prevProfileDisplayName,
        nextDisplayName,
      });
    }
  }

  if (write) {
    await commitWrites(db, writes);
    summary.profileUpdated = summary.profilePlanned;
    summary.leaderboardUpdated = summary.leaderboardPlanned;
  }

  if (summary.changes.length) {
    console.table(summary.changes.slice(0, 100));
  }
  console.log('[sync-display-names-from-auth] summary');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error('sync-display-names-from-auth failed:', e.message || e);
  process.exitCode = 1;
});
