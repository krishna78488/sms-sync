import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, serverTimestamp } from 'firebase/database';

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
export const db = getDatabase(app);

export async function uploadSms(deviceId, sender, body, timestamp) {
  const messagesRef = ref(db, `devices/${deviceId}/messages`);
  await push(messagesRef, {
    sender,
    body,
    timestamp,
    uploadedAt: serverTimestamp(),
  });
}

export async function registerDevice(deviceId, model, manufacturer, androidVersion, sdk) {
  const deviceRef = ref(db, `devices/${deviceId}`);
  await push(deviceRef, {
    deviceId,
    model,
    manufacturer,
    androidVersion,
    sdk,
    registeredAt: serverTimestamp(),
    lastSeen: serverTimestamp(),
  });
}
