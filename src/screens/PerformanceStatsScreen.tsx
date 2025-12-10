import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {getDeliveredToday, getParkedToday, type DeliveredTodayItem, type ParkedTodayItem} from '../api/stats';

export default function PerformanceStatsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [parked, setParked] = useState<ParkedTodayItem[]>([]);
  const [delivered, setDelivered] = useState<DeliveredTodayItem[]>([]);
  const [activeTab, setActiveTab] = useState<'PARKED' | 'DELIVERED'>('PARKED');
  const [error, setError] = useState<string | null>(null);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      console.log('[PerformanceStats] Loading parked/delivered today');
      const [parkedRes, deliveredRes] = await Promise.all([
        getParkedToday(),
        getDeliveredToday(),
      ]);
      setParked(parkedRes);
      setDelivered(deliveredRes);
    } catch (e) {
      console.error('[PerformanceStats] Failed to load stats', e);
      setError('Failed to load performance stats. Pull to refresh to retry.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadStats();
    } finally {
      setRefreshing(false);
    }
  };

  const renderParkedList = () => {
    if (parked.length === 0) {
      return (
        <Text style={styles.emptyText}>
          No vehicles parked yet today.
        </Text>
      );
    }
    return parked.map(item => (
      <View key={item.id} style={styles.itemCard}>
        <View style={styles.itemRowMain}>
          <Text style={styles.itemTitle}>{item.vehicleNumber}</Text>
          <Text style={styles.itemTag}>{item.tagNumber}</Text>
        </View>
        <Text style={styles.itemSubtitle}>{item.locationName}</Text>
        <View style={styles.itemRowMeta}>
          <Text style={styles.itemMeta}>Slot: {item.slot || '-'}</Text>
          <Text style={styles.itemMeta}>
            Parked for {item.parkedDurationMinutes} min
          </Text>
        </View>
        <Text style={styles.itemMetaMuted}>
          Parked at {new Date(item.parkedAt).toLocaleTimeString()}
        </Text>
      </View>
    ));
  };

  const renderDeliveredList = () => {
    if (delivered.length === 0) {
      return (
        <Text style={styles.emptyText}>
          No vehicles delivered yet today.
        </Text>
      );
    }
    return delivered.map(item => (
      <View key={item.id} style={styles.itemCard}>
        <View style={styles.itemRowMain}>
          <Text style={styles.itemTitle}>{item.vehicleNumber}</Text>
          <Text style={styles.itemTag}>{item.slot}</Text>
        </View>
        <Text style={styles.itemSubtitle}>{item.locationName}</Text>
        <View style={styles.itemRowMeta}>
          <Text style={styles.itemMeta}>
            Total time {item.totalDurationMinutes} min
          </Text>
        </View>
        <Text style={styles.itemMetaMuted}>
          Parked at {new Date(item.parkedAt).toLocaleTimeString()} • Delivered at{' '}
          {new Date(item.deliveredAt).toLocaleTimeString()}
        </Text>
      </View>
    ));
  };

  const totalJobs = parked.length + delivered.length;

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Today&apos;s performance</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryLabel}>Parked</Text>
            <Text style={styles.summaryValue}>{parked.length}</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryLabel}>Delivered</Text>
            <Text style={styles.summaryValue}>{delivered.length}</Text>
          </View>
          <View style={styles.summaryPill}>
            <Text style={styles.summaryLabel}>Total jobs</Text>
            <Text style={styles.summaryValue}>{totalJobs}</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={
            activeTab === 'PARKED' ? styles.tabButtonActive : styles.tabButton
          }
          onPress={() => setActiveTab('PARKED')}>
          <Text
            style={
              activeTab === 'PARKED'
                ? styles.tabButtonTextActive
                : styles.tabButtonText
            }>
            Parked today
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={
            activeTab === 'DELIVERED' ? styles.tabButtonActive : styles.tabButton
          }
          onPress={() => setActiveTab('DELIVERED')}>
          <Text
            style={
              activeTab === 'DELIVERED'
                ? styles.tabButtonTextActive
                : styles.tabButtonText
            }>
            Delivered today
          </Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#a5b4fc" />
          <Text style={styles.loadingText}>Loading performance data...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }>
          {activeTab === 'PARKED' ? renderParkedList() : renderDeliveredList()}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  summaryCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryPill: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: '#020617',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f9fafb',
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 999,
    backgroundColor: '#020617',
    padding: 3,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tabButtonActive: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#4f46e5',
  },
  tabButtonText: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  tabButtonTextActive: {
    fontSize: 13,
    color: '#f9fafb',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#e5e7eb',
    fontSize: 14,
  },
  errorText: {
    marginBottom: 8,
    color: '#fecaca',
    fontSize: 13,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 16,
  },
  emptyText: {
    marginTop: 12,
    color: '#9ca3af',
    fontSize: 13,
  },
  itemCard: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  itemRowMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f9fafb',
  },
  itemTag: {
    fontSize: 12,
    color: '#a5b4fc',
    fontWeight: '600',
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  itemRowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 12,
    color: '#e5e7eb',
  },
  itemMetaMuted: {
    fontSize: 11,
    color: '#6b7280',
  },
});
