import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ComplaintCard } from '../components/ComplaintCard';
import { SummaryCard } from '../components/SummaryCard';
import { api } from '../services/api';
import { pendingActionCount } from '../services/database';
import { synchronizePendingActions } from '../services/offline';
import { colors } from '../theme';
import type { AppUser, Complaint, ComplaintStatus } from '../types';
import { statusLabel } from '../types';

const filters: { value?: ComplaintStatus; label: string }[] = [
  { label: 'All' },
  { value: 'Assigned', label: 'Assigned' },
  { value: 'Reached', label: 'Reached' },
  { value: 'In_Progress', label: 'In Progress' },
  { value: 'Resolved', label: 'Resolved' },
];

interface HomeScreenProps {
  user: AppUser;
  onOpenComplaint: (id: string) => void;
  onLogout: () => void;
}

export function HomeScreen({ user, onOpenComplaint, onLogout }: HomeScreenProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [filter, setFilter] = useState<ComplaintStatus | undefined>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pending, setPending] = useState(0);
  const [error, setError] = useState('');
  const firstLoad = useRef(true);

  const load = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true);
      setError('');
      try {
        setComplaints(await api.listComplaints(filter));
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Could not load assigned complaints.',
        );
      } finally {
        setPending(await pendingActionCount().catch(() => 0));
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filter],
  );

  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false;
      void (async () => {
        await synchronizePendingActions().catch(() => ({ synced: 0, failed: 1 }));
        await load();
      })();
    } else {
      void load();
    }
  }, [load]);

  async function syncNow() {
    if (syncing) return;
    setSyncing(true);
    const result = await synchronizePendingActions();
    await load(false);
    setSyncing(false);
    Alert.alert(
      result.failed > 0 ? 'Synchronization incomplete' : 'Synchronization complete',
      result.failed > 0
        ? `${result.synced} update(s) synced; ${result.failed} update is still pending.`
        : `${result.synced} pending update(s) synchronized.`,
    );
  }

  function confirmLogout() {
    Alert.alert('Sign out?', `You are signed in as ${user.name}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: onLogout },
    ]);
  }

  const active = complaints.filter((item) => item.status !== 'Resolved').length;
  const resolved = complaints.filter((item) => item.status === 'Resolved').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Field Operations</Text>
          <Text style={styles.headerSubtitle}>Assigned leakage response</Text>
        </View>
        <Pressable
          accessibilityLabel="Synchronize offline work"
          disabled={syncing}
          onPress={() => void syncNow()}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          {syncing ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Ionicons color={colors.primary} name="sync" size={23} />
          )}
          {pending > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pending > 9 ? '9+' : pending}</Text>
            </View>
          ) : null}
        </Pressable>
        <Pressable
          accessibilityLabel="Sign out"
          onPress={confirmLogout}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          <Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[colors.primary]}
            onRefresh={() => {
              setRefreshing(true);
              void load(false);
            }}
            refreshing={refreshing}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.officerRow}>
          <Ionicons color={colors.primaryMid} name="shield-checkmark" size={16} />
          <Text style={styles.officerText}>
            {user.name} · {user.officerId}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <SummaryCard
            color={colors.primary}
            icon="construct-outline"
            label="Active jobs"
            value={active}
          />
          <SummaryCard
            color={colors.blue}
            icon="checkmark-circle-outline"
            label="Completed"
            value={resolved}
          />
          <SummaryCard
            color={colors.warning}
            icon="cloud-upload-outline"
            label="Pending sync"
            value={pending}
          />
        </View>

        <View style={styles.listTitleRow}>
          <Text style={styles.listTitle}>My assigned complaints</Text>
          <Text style={styles.jobCount}>{complaints.length} jobs</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.filters}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {filters.map((item) => {
            const selected = filter === item.value;
            return (
              <Pressable
                key={item.label}
                onPress={() => setFilter(item.value)}
                style={({ pressed }) => [
                  styles.filter,
                  selected && styles.filterSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[styles.filterText, selected && styles.filterTextSelected]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons color={colors.danger} name="cloud-offline-outline" size={20} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={() => void load()}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={styles.loader} />
        ) : null}

        {!loading && complaints.length === 0 && !error ? (
          <View style={styles.empty}>
            <Ionicons color="#9AA7A2" name="clipboard-outline" size={50} />
            <Text style={styles.emptyTitle}>No {filter ? statusLabel(filter).toLowerCase() : 'assigned'} complaints</Text>
            <Text style={styles.emptyText}>New assignments will appear here.</Text>
          </View>
        ) : null}

        {!loading
          ? complaints.map((complaint) => (
              <ComplaintCard
                complaint={complaint}
                key={complaint._id}
                onPress={() => onOpenComplaint(complaint._id)}
              />
            ))
          : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomColor: '#E4EBE8',
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: 17,
    paddingVertical: 12,
  },
  headerTitles: { flex: 1 },
  headerTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
  },
  headerSubtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 1,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#E35B26',
    borderRadius: 99,
    justifyContent: 'center',
    minHeight: 17,
    minWidth: 17,
    paddingHorizontal: 3,
    position: 'absolute',
    right: -4,
    top: -5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  pressed: { opacity: 0.7 },
  content: {
    paddingBottom: 35,
    paddingHorizontal: 17,
    paddingTop: 13,
  },
  officerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 11,
  },
  officerText: {
    color: colors.primaryMid,
    fontSize: 11,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 9,
  },
  listTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 21,
  },
  listTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  jobCount: {
    color: colors.muted,
    fontSize: 12,
  },
  filters: {
    gap: 7,
    paddingBottom: 14,
    paddingTop: 12,
  },
  filter: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filterSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  filterTextSelected: { color: '#FFFFFF' },
  errorBox: {
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    padding: 12,
  },
  errorText: {
    color: colors.danger,
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  retryText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '900',
  },
  loader: { marginVertical: 55 },
  empty: {
    alignItems: 'center',
    paddingVertical: 58,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '800',
    marginTop: 12,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 5,
  },
});

