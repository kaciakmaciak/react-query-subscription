import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * Firebase Config.
 *
 * 1. Create firestore database.
 * 2. Set the `firebaseConfig` variable.
 *
 * @see https://firebase.google.com/docs/firestore/quickstart#create
 */
const firebaseConfig = {
  // add config here
};
if (Object.keys(firebaseConfig).length === 0) {
  throw new Error('Configure firebase in `src/firebase.ts`');
}

export const firebaseApp = initializeApp(firebaseConfig);

export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
