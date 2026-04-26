#!/usr/bin/env node

/**
 * Set or clear Firebase Auth custom admin claim for a user.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/abs/path/service-account.json \
 *   node scripts/set-admin-claim.mjs --uid USER_UID
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/abs/path/service-account.json \
 *   node scripts/set-admin-claim.mjs --email user@example.com
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=/abs/path/service-account.json \
 *   node scripts/set-admin-claim.mjs --uid USER_UID --revoke
 */

import { initializeApp, applicationDefault, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

function readFlagValue(flagName) {
  const index = process.argv.indexOf(flagName);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

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

async function main() {
  const uidArg = readFlagValue('--uid');
  const emailArg = readFlagValue('--email');
  const revoke = hasFlag('--revoke');

  if (!uidArg && !emailArg) {
    throw new Error('Pass either --uid <uid> or --email <email>.');
  }

  const serviceAccount = parseServiceAccountFromEnv();
  const credential = serviceAccount
    ? cert(serviceAccount)
    : applicationDefault();
  initializeApp({ credential });

  const auth = getAuth();
  const user = uidArg
    ? await auth.getUser(uidArg)
    : await auth.getUserByEmail(emailArg);

  const nextClaims = {
    ...(user.customClaims || {}),
  };

  if (revoke) {
    delete nextClaims.admin;
  } else {
    nextClaims.admin = true;
  }

  await auth.setCustomUserClaims(user.uid, nextClaims);

  console.log(
    JSON.stringify(
      {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
        admin: !revoke,
      },
      null,
      2,
    ),
  );
  console.log(
    'Done. The user must sign out/sign in again, or refresh their ID token, before Firestore rules see the new claim.',
  );
}

main().catch((e) => {
  console.error('set-admin-claim failed:', e.message || e);
  process.exitCode = 1;
});
