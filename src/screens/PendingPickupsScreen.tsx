import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import type {AppStackParamList} from '../navigation/AppNavigator';
import {
  getPendingPickupRequests,
  respondToPickupRequest,
  updatePickupStatus,
  type PendingPickupJob,
} from '../api/pickup';
import BackButton from '../components/BackButton';
import {COLORS, SHADOWS} from '../constants/theme';

const urbaneaseLogo = require('../assets/icons/urbanease-logo.png');

export default function PendingPickupsScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<PendingPickupJob[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[PendingPickups] Fetching pending pickup requests');
      const response = await getPendingPickupRequests();
      console.log('[PendingPickups] Response', response);
      setItems(response.requests ?? []);
    } catch (error) {
      console.error('[PendingPickups] Failed to load pickup requests', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRespond = async (
    jobId: string,
    action: 'ACCEPT' | 'DECLINE',
  ) => {
    try {
      setActionLoadingId(jobId);
      console.log('[PendingPickups] Responding to pickup', {jobId, action});
      const response = await respondToPickupRequest({pickupJobId: jobId, action});
      
      // Navigate back to Home screen with pickup job data
      console.log('[PendingPickups] Pickup accepted, navigating to Home with job data', response.pickupJob);
      navigation.navigate('Home', {activePickupJob: response.pickupJob});
    } catch (error) {
      console.error('[PendingPickups] Failed to respond to pickup', error);
      setActionLoadingId(null);
    }
  };

  const handleUpdateStatus = async (
    jobId: string,
    status: 'PICKUP_STARTED' | 'VEHICLE_PICKED_UP' | 'DELIVERED',
  ) => {
    try {
      setActionLoadingId(jobId);
      console.log('[PendingPickups] Updating pickup status', {jobId, status});
      await updatePickupStatus({pickupJobId: jobId, status});
      await loadData();
    } catch (error) {
      console.error('[PendingPickups] Failed to update pickup status', error);
    } finally {
      setActionLoadingId(null);
    }
  };

  const renderItem = ({item}: {item: PendingPickupJob}) => {
    const isBusy = actionLoadingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.vehicleText}>{item.vehicleNumber}</Text>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
        
        <View style={styles.detailsContainer}>
          <View style={styles.detailRow}>
            <Text style={styles.labelText}>Key Tag Code:</Text>
            <Text style={styles.valueText}>{item.keyTagCode || item.tagNumber || '-'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.labelText}>Slot Number:</Text>
            <Text style={styles.valueText}>{item.slotNumber || '-'}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.labelText}>Pickup Point:</Text>
            <Text style={styles.valueText}>{item.pickupPoint || '-'}</Text>
          </View>
          
          {item.locationDescription && (
            <View style={styles.detailRow}>
              <Text style={styles.labelText}>Remarks:</Text>
              <Text style={styles.valueText}>{item.locationDescription}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => handleRespond(item.id, 'ACCEPT')}
            disabled={isBusy}>
            <Text style={styles.acceptButtonText}>
              {isBusy ? 'Accepting...' : 'Accept'}
            </Text>
          </TouchableOpacity>
        </View>

        {isBusy && (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color="#22c55e" />
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <BackButton color="#1f2937" useIcon={true} />
          <View style={styles.headerLogoContainer}>
            <Image source={urbaneaseLogo} style={styles.headerLogo} />
          </View>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.gradientEnd} />
          <Text style={styles.loadingText}>Loading pickup requests...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton color="#1f2937" useIcon={true} />
        <View style={styles.headerLogoContainer}>
          <Image source={urbaneaseLogo} style={styles.headerLogo} />
        </View>
        <LinearGradient
          colors={['#76D0E3', '#3156D8']}
          start={{x: 0, y: 0}}
          end={{x: 1, y: 1}}
          style={styles.countBadge}>
          <Text style={styles.countText}>{items.length}</Text>
        </LinearGradient>
      </View>
      <FlatList
        data={items}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={
          items.length === 0 ? styles.emptyContent : styles.listContent
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No pending pickups</Text>
            <Text style={styles.emptySubtitle}>
              When a guest requests their vehicle, you will see it here.
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  headerLogoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -30,
  },
  headerLogo: {
    height: 40,
    width: 150,
    resizeMode: 'contain',
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  countText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
  },
  listContent: {
    padding: 20,
    paddingBottom: 24,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.medium,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  vehicleText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gradientEnd,
    textTransform: 'uppercase',
  },
  detailsContainer: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  valueText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
