import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyApezRSTtEJeBLYsfrFO10v6Nwd1ZTE5pE',
  authDomain: 'sms-fo.firebaseapp.com',
  databaseURL: 'https://sms-fo-default-rtdb.firebaseio.com',
  projectId: 'sms-fo',
  storageBucket: 'sms-fo.firebasestorage.app',
  messagingSenderId: '701815231003',
  appId: '1:701815231003:web:0ad04ea4f9891ed9bc5ebe',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);
export default app;
