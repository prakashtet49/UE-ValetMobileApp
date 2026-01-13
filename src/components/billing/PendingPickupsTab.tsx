import React, {useCallback, useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {AppStackParamList} from '../../navigation/AppNavigator';
import {
  getPendingPickupRequests,
  respondToPickupRequest,
  type PendingPickupJob,
} from '../../api/pickup';
import {COLORS, SHADOWS} from '../../constants/theme';
import {moderateScale, verticalScale, getResponsiveFontSize, getResponsiveSpacing} from '../../utils/responsive';

export default function PendingPickupsTab() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<PendingPickupJob[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[PendingPickupsTab] Fetching pending pickup requests');
      const response = await getPendingPickupRequests();
      console.log('[PendingPickupsTab] Response', response);
      setItems(response.requests ?? []);
    } catch (error) {
      console.error('[PendingPickupsTab] Failed to load pickup requests', error);
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
      console.log('[PendingPickupsTab] Responding to pickup', {jobId, action});
      const response = await respondToPickupRequest({pickupJobId: jobId, action});
      
      if (action === 'ACCEPT') {
        // For billing users, just refresh the list after accepting
        console.log('[PendingPickupsTab] Pickup accepted', response.pickupJob);
        await loadData();
        setActionLoadingId(null);
      } else {
        // For decline, just refresh the list
        await loadData();
        setActionLoadingId(null);
      }
    } catch (error) {
      console.error('[PendingPickupsTab] Failed to respond to pickup', error);
      setActionLoadingId(null);
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ');
  };

  const renderItem = ({item}: {item: PendingPickupJob}) => {
    const isBusy = actionLoadingId === item.id;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.vehicleText}>{item.vehicleNumber}</Text>
          <Text style={styles.statusText}>{formatStatus(item.status)}</Text>
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
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.gradientEnd} />
        <Text style={styles.loadingText}>Loading pickup requests...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            <Text style={styles.emptyIcon}>📋</Text>
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
    backgroundColor: COLORS.backgroundLight,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
  },
  listContent: {
    padding: getResponsiveSpacing(20),
    paddingBottom: verticalScale(24),
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: getResponsiveSpacing(24),
  },
  loadingText: {
    marginTop: verticalScale(12),
    color: COLORS.textSecondary,
    fontSize: getResponsiveFontSize(16),
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(24),
    padding: getResponsiveSpacing(20),
    marginBottom: verticalScale(16),
    ...SHADOWS.medium,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  vehicleText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusText: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    color: COLORS.gradientEnd,
    textTransform: 'uppercase',
  },
  detailsContainer: {
    marginBottom: verticalScale(12),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(8),
  },
  labelText: {
    fontSize: getResponsiveFontSize(13),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  valueText: {
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textPrimary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: verticalScale(12),
  },
  acceptButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButtonText: {
    color: COLORS.white,
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: verticalScale(8),
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(60),
  },
  emptyIcon: {
    fontSize: getResponsiveFontSize(64),
    marginBottom: verticalScale(16),
  },
  emptyTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(8),
  },
  emptySubtitle: {
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
