/** Re-exports Firebase modular SDK (load from official CDN; no bundler). */
export { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
export {
  getAnalytics,
  isSupported,
  logEvent,
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js';
export {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
export {
  getAuth,
  getIdTokenResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js';
