import { db } from '../firebase.init.js';
import { doc, setDoc, serverTimestamp } from '../firebase.js';
import { t } from './i18n.js';

export const PROFILES_COLLECTION = 'profiles';

const GUEST_TAG_FALLBACK = 'XXXX';

// Matches legacy guest names that used to be persisted in Firestore before
// localization moved fully to the client (e.g. "Гость-AB12", "Guest-XXXX").
const LEGACY_GUEST_PATTERN = /^(Гость|Guest)-[A-Z0-9]{4}$/;

function makeGuestTag(uid) {
  const tag = (uid || '').slice(0, 4).toUpperCase();
  return tag || GUEST_TAG_FALLBACK;
}

/**
 * Returns true for legacy guest labels that were stored in the DB before
 * localization moved to the client. Such values must NOT be treated as a real
 * displayName — they should be re-derived via `formatGuestDisplayName(uid)`.
 */
export function isLegacyGuestDisplayName(name) {
  return typeof name === 'string' && LEGACY_GUEST_PATTERN.test(name);
}

/**
 * Picks a name for UI display from a value stored in the DB. If the stored
 * value is empty or matches the legacy guest format, falls back to a
 * localized guest label built from `uid`.
 */
export function pickStoredDisplayName(stored, uid) {
  if (typeof stored === 'string' && stored && !isLegacyGuestDisplayName(stored)) {
    return stored;
  }
  return formatGuestDisplayName(uid);
}

/**
 * Returns the user's real name suitable for storing in the database.
 * Picks `displayName` (trimmed) or the local part of `email`.
 * Returns `null` when the user has no real name — guest labels are NEVER
 * persisted; they are formatted on the client at render time.
 *
 * Anonymous users are allowed to have a stored displayName when they
 * explicitly set one in settings — without that, leaderboard rows for
 * guests would never reflect a custom name.
 */
export function resolveUserDisplayName(user) {
  if (!user) return null;

  const displayName =
    typeof user.displayName === 'string' ? user.displayName.trim() : '';
  if (displayName) return displayName;

  if (typeof user.email === 'string') {
    const local = user.email.split('@')[0]?.trim();
    if (local) return local;
  }

  return null;
}

/**
 * Builds a localized guest name (e.g. "Гость-AB12" / "Guest-AB12") from a uid.
 * Client-only — never store the result in the database.
 */
export function formatGuestDisplayName(uid) {
  return `${t('profile.guest')}-${makeGuestTag(uid)}`;
}

/**
 * Returns a name suitable for showing in the UI: the user's real name if known,
 * otherwise a localized guest label with a uid-based tag.
 */
export function formatUserDisplayName(user) {
  return resolveUserDisplayName(user) ?? formatGuestDisplayName(user?.uid);
}

export async function syncUserProfileDoc(user) {
  if (!user || !user.uid) return false;

  const payload = {
    uid: user.uid,
    email: user.email || null,
    isAnonymous: user.isAnonymous === true,
  };

  const displayName = resolveUserDisplayName(user);
  if (displayName) payload.displayName = displayName;

  return updateUserProfile(user, payload);
}

export async function updateUserProfile(user, data) {
  if (!user || !user.uid) return false;

  await setDoc(
    doc(db, PROFILES_COLLECTION, user.uid),
    {
      ...data,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return true;
}
