import { auth } from '../firebase.init.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut as fbSignOut,
  onAuthStateChanged,
  updateProfile,
} from '../firebase.js';
import { t } from './i18n.js';
import { syncUserProfileDoc } from './profile-store.js';

/**
 * Current signed-in user, or null.
 * Mutated by the onAuthStateChanged subscription below.
 *
 * Может быть анонимным (user.isAnonymous === true) — тогда у юзера есть uid
 * для записи в Firestore, но нет email/displayName. Email/password-логин
 * показывается как "настоящий" пользователь (см. isSignedInReal).
 */
export let currentUser = null;

const listeners = new Set();

/** True если юзер реально залогинен (не аноним). */
export function isSignedInReal(user = currentUser) {
  return !!user && user.isAnonymous !== true;
}

let anonSignInTried = false;

onAuthStateChanged(auth, (user) => {
  currentUser = user;

  if (user) {
    void syncUserProfileDoc(user).catch((e) => {
      console.warn('profile doc sync failed', e);
    });
  }

  for (const fn of listeners) {
    try {
      fn(user);
    } catch (e) {
      console.error('auth listener error', e);
    }
  }

  // Если юзера нет — один раз логинимся анонимно, чтобы у нас был uid
  // для записи в Firestore (лидерборд и т.п.).
  if (!user && !anonSignInTried) {
    anonSignInTried = true;
    signInAnonymously(auth).catch((e) => {
      console.warn('Anonymous sign-in failed', e);
    });
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

/** Update displayName for the current user in Firebase Auth. */
export async function updateDisplayName(name) {
  if (!currentUser) throw new Error('Not signed in');
  await updateProfile(currentUser, { displayName: name });
  await syncUserProfileDoc(currentUser);
  // Re-trigger listeners so widgets update
  for (const fn of listeners) {
    try {
      fn(currentUser);
    } catch (e) {
      console.error('auth listener error', e);
    }
  }
}

export async function signOut() {
  await fbSignOut(auth);
  // После выхода сразу логинимся анонимно, чтобы оставалась возможность
  // писать в Firestore (личный uid для будущих сабмитов).
  try {
    await signInAnonymously(auth);
  } catch (e) {
    console.warn('Re-auth as anonymous after sign-out failed', e);
  }
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
