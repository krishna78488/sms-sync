import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ref,
  query,
  orderByChild,
  limitToLast,
  onChildAdded,
  get,
} from 'firebase/database';
import { signOut } from 'firebase/auth';
import { auth, db } from '../firebase';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */
const PAGE_SIZE = 500;

function formatTs(ts) {
  if (!ts) return '—';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

function relative(ts) {
  if (!ts) return '';
  const diff = Date.now() - ts;
  if (diff < 0) return 'just now';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function parseDateInput(s) {
  if (!s) return null;
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

/* ------------------------------------------------------------------ */
/* Message card                                                        */
/* ------------------------------------------------------------------ */
function MessageCard({ item }) {
  const [expanded, setExpanded] = useState(false);
  const longBody = (item.body ?? '').length > 140;
  const shown =
    longBody && !expanded ? `${item.body.slice(0, 140)}…` : item.body ?? '';

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={longBody ? 0.7 : 1}
      onPress={() => longBody && setExpanded((v) => !v)}
    >
      <View style={styles.cardTop}>
        <Text style={styles.sender}>{item.sender || 'Unknown sender'}</Text>
        <Text style={styles.time}>{relative(item.timestamp)}</Text>
      </View>

      <Text style={styles.body}>{shown}</Text>

      <View style={styles.cardBottom}>
        <Text style={styles.meta}>
          {formatTs(item.timestamp)}
        </Text>
        <Text style={styles.device} numberOfLines={1}>
          {item.deviceModel || 'Unknown device'} · {item.deviceId?.slice(0, 8) || '????????'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */
export default function DashboardScreen() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const seenIds = useRef(new Set());

  /* -------- real-time subscription (latest PAGE_SIZE messages) -------- */
  useEffect(() => {
    const q = query(ref(db, 'messages'), orderByChild('timestamp'), limitToLast(PAGE_SIZE));
    setError(null);

    const unsub = onChildAdded(
      q,
      (snap) => {
        const id = snap.key;
        if (seenIds.current.has(id)) return;
        seenIds.current.add(id);
        const val = snap.val() ?? {};
        setMessages((prev) => [{ id, ...val }, ...prev]);
        setLoading(false);
      },
      (err) => {
        setError(
          err?.code === 'PERMISSION_DENIED'
            ? 'Permission denied — this admin account is not enabled. Set /admins/<uid> = true.'
            : (err?.message ?? 'Stream error')
        );
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  /* -------- manual pull-to-refresh (force a server round-trip) -------- */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const snap = await get(query(ref(db, 'messages'), orderByChild('timestamp'), limitToLast(PAGE_SIZE)));
      if (snap.exists()) {
        const rows = [];
        snap.forEach((child) => {
          if (!seenIds.current.has(child.key)) {
            seenIds.current.add(child.key);
            rows.push({ id: child.key, ...child.val() });
          }
        });
        if (rows.length) {
          setMessages((prev) => [...rows, ...prev].sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0)));
        }
      }
    } catch (e) {
      /* swallow — UI keeps the existing cache */
    } finally {
      setRefreshing(false);
    }
  }, []);

  /* -------- search + date filtering -------- */
  const fromTs = useMemo(() => parseDateInput(dateFrom), [dateFrom]);
  const toTs = useMemo(() => {
    const t = parseDateInput(dateTo);
    return t === null ? null : t + 86400000 - 1; // inclusive end-of-day
  }, [dateTo]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (needle) {
        const inSender = (m.sender ?? '').toLowerCase().includes(needle);
        const inBody = (m.body ?? '').toLowerCase().includes(needle);
        const inDevice = (m.deviceModel ?? '').toLowerCase().includes(needle);
        const inId = (m.deviceId ?? '').toLowerCase().includes(needle);
        if (!inSender && !inBody && !inDevice && !inId) return false;
      }
      if (fromTs !== null && (m.timestamp ?? 0) < fromTs) return false;
      if (toTs !== null && (m.timestamp ?? 0) > toTs) return false;
      return true;
    });
  }, [messages, search, fromTs, toTs]);

  const uniqueDevices = useMemo(
    () => new Set(messages.map((m) => m.deviceId).filter(Boolean)).size,
    [messages]
  );

  const clearFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
  };

  const logout = () => signOut(auth);

  /* -------- render -------- */

  if (loading) {
    return (
      <SafeAreaView style={[styles.root, styles.center]}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Connecting to live feed…</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Live Feed</Text>
          <Text style={styles.headerSub}>
            {messages.length} message{messages.length === 1 ? '' : 's'} ·{' '}
            {uniqueDevices} device{uniqueDevices === 1 ? '' : 's'}
          </Text>
        </View>
        <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Search + filter toggle */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search sender, body, device…"
          placeholderTextColor="#475569"
        />
        <TouchableOpacity
          style={[styles.filterBtn, showFilters && styles.filterBtnActive]}
          onPress={() => setShowFilters((v) => !v)}
        >
          <Text style={[styles.filterBtnText, showFilters && styles.filterBtnTextActive]}>
            Filter
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date range */}
      {showFilters && (
        <View style={styles.filterRow}>
          <TextInput
            style={styles.dateInput}
            value={dateFrom}
            onChangeText={setDateFrom}
            placeholder="From YYYY-MM-DD"
            placeholderTextColor="#475569"
          />
          <TextInput
            style={styles.dateInput}
            value={dateTo}
            onChangeText={setDateTo}
            placeholder="To YYYY-MM-DD"
            placeholderTextColor="#475569"
          />
          <TouchableOpacity onPress={clearFilters} style={styles.clearBtn}>
            <Text style={styles.clearBtnText}>Reset</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Result counter */}
      {(search || dateFrom || dateTo) && (
        <Text style={styles.counter}>
          Showing {filtered.length} of {messages.length}
        </Text>
      )}

      {error && <Text style={styles.errorBanner}>{error}</Text>}

      {/* Feed */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MessageCard item={item} />}
        contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No messages</Text>
            <Text style={styles.emptySub}>
              {search || dateFrom || dateTo
                ? 'Nothing matches the current filters.'
                : 'Waiting for the first message from a registered device…'}
            </Text>
          </View>
        }
        initialNumToRender={25}
        windowSize={11}
        removeClippedSubviews={Platform.OS === 'android'}
      />
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f172a' },
  center: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#64748b', marginTop: 14 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  headerTitle: { color: '#f8fafc', fontSize: 22, fontWeight: '800' },
  headerSub: { color: '#64748b', fontSize: 12.5, marginTop: 2 },

  logoutBtn: {
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  logoutText: { color: '#94a3b8', fontWeight: '600', fontSize: 13 },

  searchRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  searchInput: {
    flex: 1,
    backgroundColor: '#111a2e',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    color: '#f1f5f9',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  filterBtn: {
    justifyContent: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterBtnText: { color: '#94a3b8', fontWeight: '600' },
  filterBtnTextActive: { color: '#fff' },

  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  dateInput: {
    flex: 1,
    backgroundColor: '#111a2e',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: '#f1f5f9',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  clearBtn: { justifyContent: 'center', paddingHorizontal: 12 },
  clearBtnText: { color: '#38bdf8', fontWeight: '600', fontSize: 13 },

  counter: { color: '#64748b', fontSize: 12, paddingHorizontal: 18, marginBottom: 8 },

  errorBanner: {
    color: '#fca5a5',
    backgroundColor: '#451a1a',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 10,
    borderRadius: 10,
    fontSize: 12.5,
  },

  card: {
    backgroundColor: '#111a2e',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sender: { color: '#38bdf8', fontSize: 15, fontWeight: '700', flex: 1, marginRight: 8 },
  time: { color: '#64748b', fontSize: 11.5 },

  body: { color: '#e2e8f0', fontSize: 14, lineHeight: 20, marginTop: 8 },

  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    gap: 12,
  },
  meta: { color: '#64748b', fontSize: 11 },
  device: { color: '#475569', fontSize: 11, flex: 1, textAlign: 'right' },

  empty: { alignItems: 'center', paddingTop: 70, paddingHorizontal: 30 },
  emptyTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: '700' },
  emptySub: { color: '#64748b', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
});
