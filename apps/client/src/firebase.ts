import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    'AIzaSyA6XLbDuwyHtuNfcH563s5a4trIdhy3r2o',
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    'p2p-messaging-a1df8.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'p2p-messaging-a1df8',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    'p2p-messaging-a1df8.firebasestorage.app',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '830784360605',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    '1:830784360605:web:819bc921c3aa1476874474',
};

export function getDb() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getFirestore(app);
}
