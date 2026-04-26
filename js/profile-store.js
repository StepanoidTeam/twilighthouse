import { db } from '../firebase.init.js';
import { doc, setDoc, serverTimestamp } from '../firebase.js';

export const PROFILES_COLLECTION = 'profiles';

export function resolveUserDisplayName(user) {
  if (!user) return 'Гость-XXXX';

  if (user.displayName && user.displayName.trim()) {
    return user.displayName.trim();
  }
  if (user.email) {
    return user.email.split('@')[0];
  }
  const tag = (user.uid || '').slice(0, 4).toUpperCase() || 'XXXX';
  return `Гость-${tag}`;
}

export async function syncUserProfileDoc(user) {
  if (!user || !user.uid) return false;

  await setDoc(
    doc(db, PROFILES_COLLECTION, user.uid),
    {
      uid: user.uid,
      displayName: resolveUserDisplayName(user),
      email: user.email || null,
      isAnonymous: user.isAnonymous === true,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return true;
}
