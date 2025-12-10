import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  Alert,
} from 'react-native';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp, NativeStackScreenProps} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {useAuth} from '../context/AuthContext';
import {getTodayJobStats} from '../api/stats';
import {getJobsStats} from '../api/jobs';
import {pauseShift, startShift} from '../api/shifts';
import {getPendingPickupRequests} from '../api/pickup';
import {markVehicleArrived, markVehicleHandedOver} from '../api/parking';
import {getClientLocations, assignLocation, type Location} from '../api/driver';
import type {AppStackParamList} from '../navigation/AppNavigator';
import GradientButton from '../components/GradientButton';
import {COLORS, SHADOWS} from '../constants/theme';
import {useValetRealtime} from '../hooks/useValetRealtime';

const parkIcon = require('../assets/icons/park_icon.png');
const carParkingIcon = require('../assets/icons/car_parking.png');
const deliveredIcon = require('../assets/icons/delivered.png');
const activeJobsIcon = require('../assets/icons/active_jobs.png');
const urbaneaseLogo = require('../assets/icons/urbanease-logo.png');
const logoutIcon = require('../assets/icons/logout.png');
const locationIcon = require('../assets/icons/location.png');

type TodayStats = {
  parkedCount: number;
  deliveredCount: number;
};

type JobsOverview = {
  activeJobsCount: number;
  jobsRequiringPhotos: number;
  overdueJobs: number;
  lastUpdated: string;
};

type PendingPickupsData = {
  count: number;
};

type HomeScreenProps = NativeStackScreenProps<AppStackParamList, 'Home'>;

export default function HomeScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<HomeScreenProps['route']>();
  const {session, logout} = useAuth();
  const [activePickupJob, setActivePickupJob] = useState<any>(null);
  const [isBannerExpanded, setIsBannerExpanded] = useState(true);
  const [pickupStatus, setPickupStatus] = useState<'pending' | 'arrived' | 'completed'>('pending');
  const [isProcessing, setIsProcessing] = useState(false);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [jobsOverview, setJobsOverview] = useState<JobsOverview | null>(null);
  const [pendingPickups, setPendingPickups] = useState<PendingPickupsData>({count: 0});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shiftStatus, setShiftStatus] = useState<'offline' | 'active' | 'paused'>(
    'offline',
  );
  const [shiftStartedAt, setShiftStartedAt] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);

  // Load dashboard data via REST API
  // Used for: Initial load on mount, Manual refresh (pull-to-refresh)
  // Note: Real-time updates are handled by WebSocket (useValetRealtime hook)
  async function loadDashboard() {
    try {
      setLoading(true);
      const [today, jobs, pickups] = await Promise.all([
        getTodayJobStats(),
        getJobsStats(),
        getPendingPickupRequests(),
      ]);
      setTodayStats(today);
      setJobsOverview(jobs);
      setPendingPickups({count: pickups.count});
    } catch (error) {
      console.error('Failed to load dashboard stats', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadLocations() {
    try {
      const response = await getClientLocations();
      setLocations(response.locations);
      // Set first location as default if available
      if (response.locations.length > 0 && !selectedLocation) {
        setSelectedLocation(response.locations[0]);
      }
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  }

  const handleLocationSelect = async (location: Location) => {
    try {
      await assignLocation({locationId: location.id});
      setSelectedLocation(location);
      setShowLocationDropdown(false);
    } catch (error) {
      console.error('Failed to assign location:', error);
      Alert.alert('Error', 'Failed to change location. Please try again.');
    }
  };

  // Setup WebSocket real-time updates for HomeScreen only
  // This connects to 3 endpoints: jobs/active, job-stats/today, pickup-requests/new
  useValetRealtime({
    onActiveJobsUpdate: (payload) => {
      console.log('[HomeScreen] Active jobs updated via WebSocket:', payload);
      setJobsOverview(prev => ({
        ...prev!,
        activeJobsCount: payload.total,
        lastUpdated: new Date().toISOString(),
      }));
    },
    onJobStatsUpdate: (payload) => {
      console.log('[HomeScreen] Job stats updated via WebSocket:', payload);
      setTodayStats({
        parkedCount: payload.parkedCount,
        deliveredCount: payload.deliveredCount,
      });
    },
    onNewPickupRequest: (payload) => {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[HomeScreen] 🚗 NEW PICKUP REQUEST RECEIVED');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[HomeScreen] Payload received:', JSON.stringify(payload, null, 2));
      console.log('[HomeScreen] Requests array:', payload.requests);
      console.log('[HomeScreen] Requests count:', payload.requests?.length || 0);
      
      // Update pending pickups count
      const newCount = payload.requests?.length || 0;
      console.log('[HomeScreen] Current pendingPickups state:', pendingPickups);
      console.log('[HomeScreen] Payload requests length:', payload.requests?.length);
      console.log('[HomeScreen] Calculated newCount:', newCount);
      console.log('[HomeScreen] Setting pending pickups count to:', newCount);
      
      // Validate the count before setting
      if (typeof newCount !== 'number' || newCount < 0) {
        console.error('[HomeScreen] ⚠️ Invalid count detected:', newCount);
        console.error('[HomeScreen] Payload:', payload);
        return; // Don't update with invalid data
      }
      
      // Force a new object to ensure React detects the change
      setPendingPickups(prev => {
        console.log('[HomeScreen] Previous count:', prev.count);
        console.log('[HomeScreen] New count:', newCount);
        console.log('[HomeScreen] ✓ Updating state from', prev.count, 'to', newCount);
        return {count: newCount};
      });
      
      // Verify state was updated
      setTimeout(() => {
        console.log('[HomeScreen] State after update (async check):', pendingPickups);
      }, 100);
      
      // Show alert for new pickup requests
      if (payload.requests && payload.requests.length > 0) {
        console.log('[HomeScreen] ✓ Showing alert for', payload.requests.length, 'pickup request(s)');
        Alert.alert(
          'New Pickup Request',
          `You have ${payload.requests.length} pending pickup request(s)`,
          [
            {text: 'View', onPress: () => navigation.navigate('PendingPickups')},
            {text: 'Later', style: 'cancel'},
          ]
        );
      } else {
        console.log('[HomeScreen] ⚠️ No requests to show alert for');
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    },
  });

  useEffect(() => {
    loadDashboard();
    loadLocations();
  }, []);

  // Monitor pendingPickups state changes
  useEffect(() => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[HomeScreen] 🔄 PENDING PICKUPS STATE CHANGED');
    console.log('[HomeScreen] New value:', pendingPickups);
    console.log('[HomeScreen] Count:', pendingPickups.count);
    console.log('[HomeScreen] UI should now show:', pendingPickups.count);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }, [pendingPickups]);

  // Handle navigation params when screen comes into focus
  // Note: Dashboard data is updated via WebSocket real-time, no need to reload
  useFocusEffect(
    React.useCallback(() => {
      // Check if there's an active pickup job passed via navigation
      if (route.params?.activePickupJob) {
        setActivePickupJob(route.params.activePickupJob);
        setPickupStatus('pending'); // Reset status when new job arrives
      }
    }, [route.params?.activePickupJob])
  );

  const handlePickupAction = async () => {
    if (!activePickupJob?.bookingId) return;

    try {
      setIsProcessing(true);
      
      if (pickupStatus === 'pending') {
        // Call vehicle-arrived API
        await markVehicleArrived({bookingId: activePickupJob.bookingId});
        setPickupStatus('arrived');
        console.log('[Home] Vehicle arrived marked successfully');
      } else if (pickupStatus === 'arrived') {
        // Call vehicle-handed-over API
        await markVehicleHandedOver({bookingId: activePickupJob.bookingId});
        setPickupStatus('completed');
        console.log('[Home] Vehicle handed over successfully');
        
        // Clear the banner after completion
        setTimeout(() => {
          setActivePickupJob(null);
          setPickupStatus('pending');
        }, 2000);
      }
    } catch (error) {
      console.error('[Home] Failed to update pickup status:', error);
      Alert.alert('Error', 'Failed to update status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (shiftStatus !== 'active' || !shiftStartedAt) {
      setElapsedSeconds(0);
      return;
    }

    const start = new Date(shiftStartedAt).getTime();

    const update = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - start) / 1000));
      setElapsedSeconds(diff);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [shiftStatus, shiftStartedAt]);

  const formatDuration = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: logout,
        },
      ],
      {cancelable: true}
    );
  };

  const onToggleOnline = async () => {
    try {
      if (shiftStatus === 'offline') {
        const response = await startShift({
          locationId: 'c0e66a7b-4299-4690-95cf-f5fb251a9801',
          deviceInfo: {
            deviceId: 'mobile-device',
            appVersion: '1.0.0',
            osVersion: 'rn-0.82',
          },
        });
        setShiftStatus(response.status === 'active' ? 'active' : 'paused');
        setShiftStartedAt(response.startedAt);
      } else {
        const response = await pauseShift();
        setShiftStatus(response.status === 'paused' ? 'paused' : 'offline');
      }
    } catch (error) {
      console.error('Failed to toggle shift status', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await loadDashboard();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with logo, profile, and notification */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={urbaneaseLogo} style={styles.headerLogo} />
        </View>
        <View style={styles.headerRight}>
          
          <TouchableOpacity style={styles.iconButton} onPress={handleLogout}>
            <View style={styles.logoutIcon}>
              <Image source={logoutIcon} style={styles.logoutIconImage} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* Driver info section */}
      <View style={styles.driverSection}>
        <View style={styles.driverInfo}>
          <Text style={styles.driverName}>{session?.driverName ?? 'Driver'}</Text>
          <TouchableOpacity 
            style={styles.locationRow}
            onPress={() => setShowLocationDropdown(!showLocationDropdown)}>
            <Image source={locationIcon} style={styles.locationIconImage} />
            <Text style={styles.locationText}>
              {selectedLocation ? selectedLocation.name : 'Select Location'}
            </Text>
            <Text style={styles.dropdownArrow}>{showLocationDropdown ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {showLocationDropdown && locations.length > 0 && (
            <View style={styles.locationDropdown}>
              {locations.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  style={[
                    styles.locationOption,
                    selectedLocation?.id === location.id && styles.locationOptionSelected
                  ]}
                  onPress={() => handleLocationSelect(location)}>
                  <Text style={[
                    styles.locationOptionText,
                    selectedLocation?.id === location.id && styles.locationOptionTextSelected
                  ]}>
                    {location.name}
                  </Text>
                  {location.address && (
                    <Text style={styles.locationOptionAddress}>{location.address}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={
              shiftStatus === 'active'
                ? styles.onlineToggle
                : styles.offlineToggle
            }
            onPress={onToggleOnline}>
            <Text style={styles.onlineToggleText}>
              {shiftStatus === 'active' ? 'Online' : 'Offline'}
            </Text>
            <View style={styles.toggleCircle} />
          </TouchableOpacity>
          {shiftStatus === 'active' && elapsedSeconds > 0 && (
            <Text style={styles.timerText}>{formatDuration(elapsedSeconds)}</Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Loading dashboard...</Text>
          </View>
        ) : (
          <>
            {/* Stats cards */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Image source={carParkingIcon} style={styles.statIconImage} />
                <Text style={styles.statValue}>Parked Vehicles: {todayStats?.parkedCount ?? 0}</Text>
              </View>
              <View style={styles.statCard}>
                <Image source={deliveredIcon} style={styles.statIconImage} />
                <Text style={styles.statValue}>Delivered Vehicles: {todayStats?.deliveredCount ?? 0}</Text>
              </View>
            </View>

            {/* Pending Pickups and Active Jobs card */}
            <View style={styles.infoCard}>
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => navigation.navigate('PendingPickups')}>
                <View style={styles.infoIconContainer}>
                  <Text style={styles.infoIcon}>🚙</Text>
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Pending Pickups</Text>
                  <Text style={styles.infoValue}>{pendingPickups.count}</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.infoDivider} />
              <TouchableOpacity
                style={styles.infoRow}
                onPress={() => navigation.navigate('ActiveJobs')}>
                <View style={styles.infoIconContainer}>
                  <Image source={activeJobsIcon} style={styles.infoIconImage} />
                </View>
                <View style={styles.infoTextContainer}>
                  <Text style={styles.infoLabel}>Active Jobs</Text>
                  <Text style={styles.infoValue}>{jobsOverview?.activeJobsCount ?? 0}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Large PARK button */}
            <View style={styles.parkButtonContainer}>
              <TouchableOpacity
                onPress={() => navigation.navigate('StartParking')}
                activeOpacity={0.8}>
                <LinearGradient
                  colors={['#76D0E3', '#3156D8']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.parkButton}>
                  <Image source={parkIcon} style={styles.parkIconImage} />
                </LinearGradient>
              </TouchableOpacity>
            </View>

          </>
        )}
      </ScrollView>

      {/* Active Pickup Job Banner */}
      {activePickupJob && (
        <View style={styles.pickupBanner}>
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => setIsBannerExpanded(!isBannerExpanded)}>
            <View style={styles.pickupBannerHeader}>
              <Text style={styles.pickupBannerTitle}>🚙 Active Pickup</Text>
              <Text style={styles.pickupBannerToggle}>{isBannerExpanded ? '▼' : '▲'}</Text>
            </View>
            {isBannerExpanded && (
              <View style={styles.pickupBannerContent}>
                <View style={styles.pickupBannerRow}>
                  <Text style={styles.pickupBannerLabel}>Vehicle:</Text>
                  <Text style={styles.pickupBannerValue}>{activePickupJob.vehicleNumber}</Text>
                </View>
                <View style={styles.pickupBannerRow}>
                  <Text style={styles.pickupBannerLabel}>Key Tag:</Text>
                  <Text style={styles.pickupBannerValue}>{activePickupJob.keyTagCode}</Text>
                </View>
                <View style={styles.pickupBannerRow}>
                  <Text style={styles.pickupBannerLabel}>Slot:</Text>
                  <Text style={styles.pickupBannerValue}>{activePickupJob.slotNumber}</Text>
                </View>
                <View style={styles.pickupBannerRow}>
                  <Text style={styles.pickupBannerLabel}>Pickup Point:</Text>
                  <Text style={styles.pickupBannerValue}>{activePickupJob.pickupPoint}</Text>
                </View>
                {activePickupJob.locationDescription && (
                  <View style={styles.pickupBannerRow}>
                    <Text style={styles.pickupBannerLabel}>Remarks:</Text>
                    <Text style={styles.pickupBannerValue}>{activePickupJob.locationDescription}</Text>
                  </View>
                )}
              </View>
            )}
          </TouchableOpacity>
          
          {/* Action Button */}
          {pickupStatus !== 'completed' && (
            <View style={styles.pickupActionButtonContainer}>
              {isProcessing ? (
                <View style={styles.pickupActionButton}>
                  <ActivityIndicator size="small" color={COLORS.gradientEnd} />
                </View>
              ) : (
                <GradientButton
                  onPress={handlePickupAction}
                  disabled={isProcessing}
                  style={styles.pickupActionButton}>
                  {pickupStatus === 'pending' ? 'ARRIVED' : 'COMPLETED'}
                </GradientButton>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    ...SHADOWS.small,
  },
  headerLeft: {
    flexDirection: 'row',
  },
  headerLogo: {
    height: 40,
    width: 150,
    resizeMode: 'contain',
    marginLeft: -50,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gradientEnd,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  logoutIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutIconImage: {
    width: 20,
    height: 20,
    tintColor: '#ffffff',
  },
  logoutIconText: {
    fontSize: 20,
  },
  driverSection: {
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationIcon: {
    fontSize: 14,
  },
  locationIconImage: {
    width: 14,
    height: 14,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  locationDropdown: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 1000,
    ...SHADOWS.medium,
  },
  locationOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  locationOptionSelected: {
    backgroundColor: COLORS.backgroundLight,
  },
  locationOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  locationOptionTextSelected: {
    color: COLORS.gradientEnd,
  },
  locationOptionAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  toggleContainer: {
    alignItems: 'center',
    gap: 6,
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
    ...SHADOWS.small,
  },
  offlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.textSecondary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 6,
    ...SHADOWS.small,
  },
  onlineToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  toggleCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  timerText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  loadingContainer: {
    marginTop: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
    ...SHADOWS.medium,
  },
  statIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  statIconImage: {
    width: 40,
    height: 40,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    flexShrink: 1,
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    ...SHADOWS.medium,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  infoIconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextContainer: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 22,
    lineHeight: 28,
  },
  infoIconImage: {
    width: 28,
    height: 28,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.gradientEnd,
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  parkButtonContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  parkButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  parkButtonInner: {
    alignItems: 'center',
  },
  parkIconImage: {
    width: 100,
    height: 100,
    tintColor: '#ffffff',
  },
  parkText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 3,
  },
  ongoingBanner: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
    ...SHADOWS.medium,
  },
  ongoingIcon: {
    fontSize: 24,
  },
  ongoingText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  pickupBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    ...SHADOWS.large,
  },
  pickupBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  pickupBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pickupBannerToggle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.gradientEnd,
    paddingHorizontal: 8,
  },
  pickupBannerContent: {
    gap: 8,
  },
  pickupBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickupBannerLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  pickupBannerValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pickupActionButtonContainer: {
    marginTop: 16,
  },
  pickupActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
