const { withAndroidManifest } = require('@expo/config-plugins');

const PERMISSIONS = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.READ_SMS',
  'android.permission.RECEIVE_SMS',
  'android.permission.READ_PHONE_STATE',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.WAKE_LOCK',
  'android.permission.RECEIVE_BOOT_COMPLETED',
  'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
];

const withSmsSync = (config) => {
  config = withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    manifest['uses-permission'] = manifest['uses-permission'] || [];
    for (const perm of PERMISSIONS) {
      if (!manifest['uses-permission'].some((p) => p.$['android:name'] === perm)) {
        manifest['uses-permission'].push({ $: { 'android:name': perm } });
      }
    }

    const app = (manifest.application || [{}])[0];

    app.receiver = app.receiver || [];
    if (!app.receiver.some((r) => (r.$['android:name'] || '').endsWith('SmsReceiver'))) {
      app.receiver.push({
        $: {
          'android:name': 'expo.modules.smsync.SmsReceiver',
          'android:exported': 'true',
          'android:permission': 'android.permission.BROADCAST_SMS',
          'android:directBootAware': 'true',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.provider.Telephony.SMS_RECEIVED' } }],
            category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
          },
        ],
      });
    }

    if (!app.receiver.some((r) => (r.$['android:name'] || '').endsWith('BootReceiver'))) {
      app.receiver.push({
        $: {
          'android:name': 'expo.modules.smsync.BootReceiver',
          'android:exported': 'true',
          'android:directBootAware': 'true',
        },
        'intent-filter': [
          { action: [{ $: { 'android:name': 'android.intent.action.BOOT_COMPLETED' } }] },
        ],
      });
    }

    app.service = app.service || [];
    if (!app.service.some((s) => (s.$['android:name'] || '').endsWith('SmsSyncService'))) {
      app.service.push({
        $: {
          'android:name': 'expo.modules.smsync.SmsSyncService',
          'android:exported': 'false',
          'android:foregroundServiceType': 'specialUse',
        },
      });
    }

    return mod;
  });

  return config;
};

module.exports = withSmsSync;
