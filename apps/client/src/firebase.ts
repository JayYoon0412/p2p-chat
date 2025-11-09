import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: 'AIzaSyDWJG_1GYIKcUNP-9y1hHZxxqg0g2qaKJM',
  authDomain: 'p2p-chat-12afe.firebaseapp.com',
  projectId: 'p2p-chat-12afe',
  storageBucket: 'p2p-chat-12afe.firebasestorage.app',
  messagingSenderId: '103837122950',
  appId: '1:103837122950:web:b064e74fbdecc87dc22c07',
};

export function getDb() {
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getFirestore(app);
}
