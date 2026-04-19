/** Re-exports Firebase modular SDK (load from official CDN; no bundler). */
export { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js';
export {
  getAnalytics,
  isSupported,
  logEvent,
} from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-analytics.js';
export { getFirestore } from 'https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js';
