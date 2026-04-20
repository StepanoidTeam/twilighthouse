import { auth } from '../firebase.init.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
} from '../firebase.js';
import { t } from './i18n.js';

/**
 * Current signed-in user, or null.
 * Mutated by the onAuthStateChanged subscription below.
 */
export let currentUser = null;

const listeners = new Set();

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  for (const fn of listeners) {
    try {
      fn(user);
    } catch (e) {
      console.error('auth listener error', e);
    }
  }
});

/** Subscribe to auth changes. Returns an unsubscribe function. */
export function onAuthChange(fn) {
  listeners.add(fn);
  // Fire immediately with current state
  try {
    fn(currentUser);
  } catch (e) {
    console.error('auth listener error', e);
  }
  return () => listeners.delete(fn);
}

export async function signUp(email, password, displayName) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(cred.user, { displayName });
  }
  return cred.user;
}

export async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function signOut() {
  await fbSignOut(auth);
}

/** Translate Firebase auth error codes into localized user-friendly messages. */
export function prettyAuthError(err) {
  const code = err && err.code ? err.code : '';
  switch (code) {
    case 'auth/invalid-email':
      return t('err.invalidEmail');
    case 'auth/email-already-in-use':
      return t('err.emailInUse');
    case 'auth/weak-password':
      return t('err.weakPassword');
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return t('err.wrongCreds');
    case 'auth/too-many-requests':
      return t('err.tooManyRequests');
    case 'auth/network-request-failed':
      return t('err.network');
    default:
      return err && err.message ? err.message : t('err.unknown');
  }
}
