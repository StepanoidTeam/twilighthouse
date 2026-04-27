import { firebaseConfig } from './firebase.config.js';
import {
  getAnalytics,
  getFirestore,
  getAuth,
  isSupported,
  logEvent,
  setUserId,
  setUserProperties,
  initializeApp,
} from './firebase.js';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

/** null if Analytics is not supported in this environment (e.g. some private modes). */
export const analytics = (await isSupported()) ? getAnalytics(app) : null;

export { logEvent, setUserId, setUserProperties };
