import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {getPendingParking, type PendingParkingRequest} from '../api/parking';

export default function PendingParkingScreen() {
  const [requests, setRequests] = useState<PendingParkingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const response = await getPendingParking();
      setRequests(response.data?.requests || []);
    } catch (error) {
      console.error('Failed to load pending parking requests', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const renderItem = ({item}: {item: PendingParkingRequest}) => {
    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemRow}>
          <Text style={styles.keyTag}>{item.keyTag}</Text>
          <Text style={styles.status}>{item.status}</Text>
        </View>
        <Text style={styles.phone}>{item.customerPhone}</Text>
        <Text style={styles.meta}>Arrived at {new Date(item.arrivedAt).toLocaleTimeString()}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color="#a5b4fc" />
        <Text style={styles.loadingText}>Loading pending parking requests...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={requests}
      keyExtractor={item => item.bookingId}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No pending parking requests.</Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
    backgroundColor: '#020617',
  },
  listContent: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#020617',
  },
  loadingText: {
    marginTop: 8,
    color: '#e5e7eb',
  },
  emptyText: {
    color: '#9ca3af',
  },
  itemContainer: {
    backgroundColor: '#0b1120',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#111827',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  keyTag: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
  },
  status: {
    color: '#a5b4fc',
    fontSize: 13,
  },
  phone: {
    color: '#e5e7eb',
    fontSize: 13,
  },
  meta: {
    marginTop: 4,
    color: '#6b7280',
    fontSize: 12,
  },
});
