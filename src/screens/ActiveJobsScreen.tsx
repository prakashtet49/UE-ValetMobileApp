import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {getActiveJobs, type ActiveJob} from '../api/jobs';
import BackButton from '../components/BackButton';
import {COLORS, SHADOWS} from '../constants/theme';

const urbaneaseLogo = require('../assets/icons/urbanease-logo.png');
const carParkingIcon = require('../assets/icons/car_parking.png');
const locationIcon = require('../assets/icons/location.png');
const slotIcon = require('../assets/icons/slot.png');
const durationIcon = require('../assets/icons/duration.png');

export default function ActiveJobsScreen() {
  const [jobs, setJobs] = useState<ActiveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const response = await getActiveJobs();
      setJobs(response.jobs || []);
    } catch (error) {
      console.error('Failed to load active jobs', error);
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

  const renderItem = ({item}: {item: ActiveJob}) => {
    return (
      <View style={styles.itemContainer}>
        <View style={styles.itemHeader}>
          <View style={styles.vehicleRow}>
            <Image source={carParkingIcon} style={styles.vehicleIcon} />
            <Text style={styles.vehicle}>{item.vehicleNumber}</Text>
          </View>
          <LinearGradient
            colors={['#76D0E3', '#3156D8']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.tagBadge}>
            <Text style={styles.tagText}>{item.tagNumber}</Text>
          </LinearGradient>
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.detailRow}>
          <View style={styles.detailLabelContainer}>
            <Image source={locationIcon} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Location</Text>
          </View>
          <Text style={styles.detailValue}>{item.locationName}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailLabelContainer}>
            <Image source={slotIcon} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Slot</Text>
          </View>
          <Text style={styles.detailValue}>{item.slotOrZone}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailLabelContainer}>
            <Image source={durationIcon} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Duration</Text>
          </View>
          <Text style={styles.detailValue}>{item.parkedDurationMinutes} min</Text>
        </View>
        
        {item.isOverdue && (
          <View style={styles.overdueTag}>
            <Text style={styles.overdueText}>⚠️ Overdue</Text>
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gradientEnd} />
          <Text style={styles.loadingText}>Loading active jobs...</Text>
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
          <Text style={styles.countText}>{jobs.length}</Text>
        </LinearGradient>
      </View>
      
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={jobs}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No active jobs right now</Text>
            <Text style={styles.emptySubtext}>Jobs will appear here when vehicles are parked</Text>
          </View>
        }
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
  list: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  listContent: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  itemContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    ...SHADOWS.medium,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleIcon: {
    width: 24,
    height: 24,
  },
  vehicle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  tagBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  tagText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailIcon: {
    width: 16,
    height: 16,
  },
  detailLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  overdueTag: {
    marginTop: 12,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  overdueText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: '600',
  },
});
