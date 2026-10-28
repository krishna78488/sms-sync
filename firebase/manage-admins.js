#!/usr/bin/env node
/**
 * manage-admins.js
 * -------------------------------------------------------------------
 *  Grant or revoke admin access on the Firebase Realtime Database.
 *
 *  Usage:
 *    node manage-admins.js grant <ADMIN_EMAIL>
 *    node manage-admins.js revoke <ADMIN_UID>
 *    node manage-admins.js list
 *
 *  One-time setup:
 *    1. npm i firebase-admin
 *    2. Firebase Console ▸ Project settings ▸ Service accounts ▸
 *       "Generate new private key"  → save as serviceAccountKey.json
 *       in this folder (git-ignore it!).
 *    3. node manage-admins.js grant you@example.com
 * ------------------------------------------------------------------- */
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com', // <-- EDIT
});

const db = admin.database();

async function main() {
  const [cmd, arg] = process.argv.slice(2);

  switch (cmd) {
    case 'grant': {
      if (!arg) throw new Error('Usage: node manage-admins.js grant <ADMIN_EMAIL>');
      const user = await admin.auth().getUserByEmail(arg);
      await db.ref(`admins/${user.uid}`).set({
        role: 'admin',
        email: arg,
        grantedAt: admin.database.ServerValue.TIMESTAMP,
      });
      console.log(`✔ Granted admin to ${arg} (uid=${user.uid})`);
      break;
    }

    case 'revoke': {
      if (!arg) throw new Error('Usage: node manage-admins.js revoke <ADMIN_UID>');
      await db.ref(`admins/${arg}`).remove();
      console.log(`✔ Revoked admin for uid=${arg}`);
      break;
    }

    case 'list': {
      const snap = await db.ref('admins').once('value');
      const val = snap.val() || {};
      const rows = Object.entries(val);
      if (!rows.length) {
        console.log('No admins configured.');
      } else {
        console.log('Configured admins:');
        rows.forEach(([uid, info]) => console.log(`  ${uid}  ${info.email ?? ''}  (${info.role ?? 'admin'})`));
      }
      break;
    }

    default:
      console.log('Commands: grant <email> | revoke <uid> | list');
  }
  process.exit(0);
}

main().catch((e) => {
  console.error('✖', e.message);
  process.exit(1);
});
