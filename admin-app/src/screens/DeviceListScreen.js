import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../firebase';

export default function DeviceListScreen({ navigation }) {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const devicesRef = ref(db, 'devices');

    const unsub = onValue(
      devicesRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.keys(data).map((deviceId) => ({
          id: deviceId,
          ...data[deviceId],
        }));
        setDevices(list);
        setError(null);
      },
      (err) => {
        setError(err.message);
      }
    );

    return () => off(devicesRef);
  }, []);

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </SafeAreaView>
    );
  }

  if (devices.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyTitle}>No Devices</Text>
        <Text style={styles.emptySub}>
          No target devices registered yet. Install the User App and tap Start.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Connected Devices</Text>
        <Text style={styles.headerSub}>
          {devices.length} device{devices.length === 1 ? '' : 's'} online
        </Text>
      </View>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.deviceRow}
            onPress={() => navigation.navigate('LiveFeed', { deviceId: item.id })}
          >
            <View style={styles.rowInfo}>
              <Text style={styles.deviceId}>{item.id}</Text>
              <View style={styles.statusContainer}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>Active</Text>
              </View>
            </View>
            <Text style={styles.rowTime}>
              {new Date(item.lastSeen || 0).toLocaleString()}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10 },
  headerTitle: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },
  headerSub: { color: '#64748b', fontSize: 13, marginTop: 2 },
  listContent: { paddingBottom: 24 },
  deviceRow: {
    backgroundColor: '#111a2e',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  rowInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  deviceId: { color: '#38bdf8', fontSize: 15, fontWeight: '700', flex: 1, marginRight: 12 },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginRight: 6 },
  statusText: { color: '#22c55e', fontSize: 12, fontWeight: '600' },
  rowTime: { color: '#64748b', fontSize: 12 },
  emptyTitle: { color: '#e2e8f0', fontSize: 18, fontWeight: '700' },
  emptySub: { color: '#64748b', fontSize: 13, textAlign: 'center', marginTop: 8 },
  errorText: { color: '#f87171', fontSize: 14 },
});
