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
import {
  ref,
  onValue,
  off,
  query,
  orderByChild,
  limitToLast,
} from 'firebase/database';
import { db } from '../firebase';

export default function LiveFeedScreen({ route, navigation }) {
  const { deviceId } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState(null);
  const [seenKeys, setSeenKeys] = useState(new Set());

  if (!deviceId) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>No device selected</Text>
      </SafeAreaView>
    );
  }

  useEffect(() => {
    const messagesRef = query(
      ref(db, `devices/${deviceId}/messages`),
      orderByChild('timestamp'),
      limitToLast(500)
    );

    const unsub = onValue(
      messagesRef,
      (snapshot) => {
        const data = snapshot.val() || {};
        const list = Object.keys(data)
          .map((key) => ({ id: key, ...data[key] }))
          .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        const newKeys = list.filter((m) => !seenKeys.has(m.id));
        if (newKeys.length > 0) {
          setSeenKeys((prev) => {
            const next = new Set(prev);
            newKeys.forEach((m) => next.add(m.id));
            return next;
          });
          setMessages((prev) => [...newKeys, ...prev]);
        }
        setError(null);
      },
      (err) => {
        setError(err.message);
      }
    );

    return () => off(messagesRef);
  }, [deviceId, seenKeys]);

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.retryText}>Back to Devices</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (messages.length === 0) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.emptyTitle}>No Messages</Text>
        <Text style={styles.emptySub}>
          Waiting for incoming SMS on this device…
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Devices</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live SMS Feed</Text>
        <Text style={styles.deviceLabel}>Device: {deviceId}</Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.messageCard}>
            <View style={styles.msgTop}>
              <Text style={styles.sender}>{item.sender || 'Unknown'}</Text>
              <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
            </View>
            <Text style={styles.body}>{item.body || ''}</Text>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
}

function formatTime(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#38bdf8', fontWeight: '700' },
  headerTitle: { color: '#f8fafc', fontSize: 20, fontWeight: '800' },
  deviceLabel: { color: '#64748b', fontSize: 12 },
  listContent: { paddingBottom: 24 },
  messageCard: {
    backgroundColor: '#111a2e',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  msgTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sender: { color: '#38bdf8', fontSize: 14, fontWeight: '700' },
  time: { color: '#64748b', fontSize: 11 },
  body: { color: '#e2e8f0', fontSize: 14, lineHeight: 20 },
  emptyTitle: { color: '#e2e8f0', fontSize: 18, fontWeight: '700' },
  emptySub: { color: '#64748b', fontSize: 13, textAlign: 'center', marginTop: 8 },
  errorText: { color: '#f87171', fontSize: 14 },
  retryBtn: { marginTop: 16 },
  retryText: { color: '#38bdf8', fontWeight: '700' },
});
