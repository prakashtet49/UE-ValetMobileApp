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
  Animated,
  Dimensions,
  PanResponder,
  Linking,
} from 'react-native';
import {moderateScale, verticalScale, getResponsiveFontSize, getResponsiveSpacing} from '../utils/responsive';
import {useNavigation, useFocusEffect, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp, NativeStackScreenProps} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {useAuth} from '../context/AuthContext';
import {getTodayJobStats} from '../api/stats';
import {getJobsStats} from '../api/jobs';
import {pauseShift, startShift} from '../api/shifts';
import {getPendingPickupRequests, getCurrentPickupJob} from '../api/pickup';
import {markVehicleArrived, markVehicleHandedOver} from '../api/parking';
import {getClientLocations, assignLocation, type Location} from '../api/driver';
import type {AppStackParamList} from '../navigation/AppNavigator';
import GradientButton from '../components/GradientButton';
import CustomDialog from '../components/CustomDialog';
import {COLORS, SHADOWS} from '../constants/theme';
import {useValetRealtime} from '../hooks/useValetRealtime';
import {fetchWeatherData, getFallbackWeather, type WeatherData} from '../services/weatherService';
import {testNotification} from '../services/notificationService';

const parkIcon = require('../assets/icons/park_icon.png');
const carParkingIcon = require('../assets/icons/car_parking.png');
const deliveredIcon = require('../assets/icons/delivered.png');
const activeJobsIcon = require('../assets/icons/active_jobs.png');
const urbaneaseLogo = require('../assets/icons/urbanease-logo.png');
const locationIcon = require('../assets/icons/location.png');
const slotIcon = require('../assets/icons/slot.png');

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
  const [changingLocation, setChangingLocation] = useState(false);
  const [dialog, setDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive'}>;
  }>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
  });
  const [bannerHeight] = useState(new Animated.Value(0));
  const [isFullScreen, setIsFullScreen] = useState(false);
  const screenHeight = Dimensions.get('window').height;
  const [parkButtonScale] = useState(new Animated.Value(1));
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [lastWeatherFetch, setLastWeatherFetch] = useState<number>(0);
  const [weatherRetryCount, setWeatherRetryCount] = useState<number>(0);
  
  // Floating shapes animation
  const [shape1] = useState(new Animated.ValueXY({x: 50, y: 100}));
  const [shape2] = useState(new Animated.ValueXY({x: 200, y: 300}));
  const [shape3] = useState(new Animated.ValueXY({x: 300, y: 150}));
  const [shape4] = useState(new Animated.ValueXY({x: 100, y: 400}));
  const [shape1Rotate] = useState(new Animated.Value(0));
  const [shape2Rotate] = useState(new Animated.Value(0));
  const [shape3Rotate] = useState(new Animated.Value(0));
  const [shape4Rotate] = useState(new Animated.Value(0));

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
    // Prevent multiple clicks
    if (changingLocation) {
      console.log('[HomeScreen] Location change already in progress, ignoring click');
      return;
    }

    // Don't change if same location
    if (selectedLocation?.id === location.id) {
      console.log('[HomeScreen] Same location selected, closing dropdown');
      setShowLocationDropdown(false);
      return;
    }

    try {
      setChangingLocation(true);
      console.log('[HomeScreen] Assigning location:', location.id, location.name);
      
      await assignLocation({locationId: location.id});
      setSelectedLocation(location);
      setShowLocationDropdown(false);
      
      // Refresh the entire screen to get latest data for the new location
      console.log('[HomeScreen] Location assigned successfully, refreshing dashboard...');
      await loadDashboard();
      
      setDialog({
        visible: true,
        title: 'Success',
        message: `Location changed to ${location.name}`,
        buttons: [{text: 'OK', style: 'default'}],
      });
    } catch (error) {
      console.error('Failed to assign location:', error);
      setDialog({
        visible: true,
        title: 'Error',
        message: 'Failed to change location. Please try again.',
        buttons: [{text: 'OK', style: 'default'}],
      });
    } finally {
      setChangingLocation(false);
    }
  };

  // PanResponder for draggable bottom sheet
  const expandedHeight = screenHeight * 0.8; // 80% of screen height
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      return Math.abs(gestureState.dy) > 5;
    },
    onPanResponderMove: (_, gestureState) => {
      if (gestureState.dy < 0 && !isFullScreen) {
        // Dragging up
        const newHeight = Math.min(Math.abs(gestureState.dy), expandedHeight);
        bannerHeight.setValue(newHeight);
      } else if (gestureState.dy > 0 && isFullScreen) {
        // Dragging down
        const newHeight = Math.max(0, expandedHeight - Math.abs(gestureState.dy));
        bannerHeight.setValue(newHeight);
      }
    },
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dy < -50 && !isFullScreen) {
        // Expand to 80% screen height
        setIsFullScreen(true);
        setIsBannerExpanded(true); // Auto-expand content when dragging up
        Animated.spring(bannerHeight, {
          toValue: expandedHeight,
          useNativeDriver: false,
        }).start();
      } else if (gestureState.dy > 50 && isFullScreen) {
        // Collapse to normal
        setIsFullScreen(false);
        Animated.spring(bannerHeight, {
          toValue: 0,
          useNativeDriver: false,
        }).start();
      } else {
        // Return to current state
        Animated.spring(bannerHeight, {
          toValue: isFullScreen ? expandedHeight : 0,
          useNativeDriver: false,
        }).start();
      }
    },
  });

  // Setup WebSocket real-time updates for HomeScreen only
  // This connects to 3 endpoints: jobs/active, job-stats/today, pickup-requests/new
  useValetRealtime({
    onActiveJobsUpdate: (payload) => {
      console.log('[HomeScreen] Active jobs updated via WebSocket:', payload);
      console.log('[HomeScreen] Jobs array length:', payload.jobs?.length);
      console.log('[HomeScreen] Payload total:', payload.total);
      // Use jobs.length instead of total to match ActiveJobsScreen count
      setJobsOverview(prev => ({
        ...prev!,
        activeJobsCount: payload.jobs?.length || 0,
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
        setDialog({
          visible: true,
          title: 'New Pickup Request',
          message: `You have ${payload.requests.length} pending pickup request(s)`,
          buttons: [
            {text: 'View', onPress: () => navigation.navigate('PendingPickups'), style: 'default'},
            {text: 'Later', style: 'cancel'},
          ],
        });
      } else {
        console.log('[HomeScreen] ⚠️ No requests to show alert for');
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    },
  });

  useEffect(() => {
    loadDashboard();
    loadLocations();
    loadWeather();
    animateParkButton();
    animateFloatingShapes();
  }, []);

  // Animate PARK button with pulse effect
  const animateParkButton = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(parkButtonScale, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(parkButtonScale, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Load dynamic weather data with caching (30 minutes) and retry limit
  const loadWeather = async (forceRefresh = false) => {
    const now = Date.now();
    const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
    const MAX_RETRIES = 5;
    
    // Skip if we have recent data and not forcing refresh
    if (!forceRefresh && weather && (now - lastWeatherFetch) < CACHE_DURATION) {
      console.log('[HomeScreen] Using cached weather data');
      return;
    }
    
    // If force refresh, reset retry count
    if (forceRefresh) {
      setWeatherRetryCount(0);
    }
    
    // Check if we've exceeded retry limit
    if (weatherRetryCount >= MAX_RETRIES) {
      console.log('[HomeScreen] Weather retry limit reached, showing error');
      setWeatherError('Unable to load weather');
      setWeatherLoading(false);
      const fallbackData = getFallbackWeather();
      setWeather(fallbackData);
      return;
    }
    
    setWeatherLoading(true);
    setWeatherError(null);
    
    try {
      const weatherData = await fetchWeatherData();
      setWeather(weatherData);
      setWeatherError(null);
      setLastWeatherFetch(now);
      setWeatherRetryCount(0); // Reset retry count on success
      setWeatherLoading(false);
      console.log('[HomeScreen] Weather data fetched and cached');
    } catch (error: any) {
      const newRetryCount = weatherRetryCount + 1;
      setWeatherRetryCount(newRetryCount);
      
      console.log(`[HomeScreen] Weather fetch failed (attempt ${newRetryCount}/${MAX_RETRIES})`);
      
      // Use fallback weather data
      const fallbackData = getFallbackWeather();
      setWeather(fallbackData);
      
      // If we've reached max retries, show error and stop loading
      if (newRetryCount >= MAX_RETRIES) {
        setWeatherError('Unable to load weather');
        setWeatherLoading(false);
        setLastWeatherFetch(now);
      } else {
        // Keep loading spinner while retrying
        // Auto-retry after a delay
        setTimeout(() => loadWeather(false), 2000);
      }
    }
  };

  // Animate floating shapes
  const animateFloatingShapes = () => {
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;

    // Shape 1 animation
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(shape1, {
            toValue: {x: screenWidth - 100, y: 200},
            duration: 15000,
            useNativeDriver: true,
          }),
          Animated.timing(shape1, {
            toValue: {x: 50, y: 100},
            duration: 15000,
            useNativeDriver: true,
          }),
        ]),
        Animated.loop(
          Animated.timing(shape1Rotate, {
            toValue: 1,
            duration: 20000,
            useNativeDriver: true,
          })
        ),
      ])
    ).start();

    // Shape 2 animation
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(shape2, {
            toValue: {x: 100, y: screenHeight - 200},
            duration: 18000,
            useNativeDriver: true,
          }),
          Animated.timing(shape2, {
            toValue: {x: 200, y: 300},
            duration: 18000,
            useNativeDriver: true,
          }),
        ]),
        Animated.loop(
          Animated.timing(shape2Rotate, {
            toValue: 1,
            duration: 25000,
            useNativeDriver: true,
          })
        ),
      ])
    ).start();

    // Shape 3 animation
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(shape3, {
            toValue: {x: screenWidth - 150, y: screenHeight - 300},
            duration: 20000,
            useNativeDriver: true,
          }),
          Animated.timing(shape3, {
            toValue: {x: 300, y: 150},
            duration: 20000,
            useNativeDriver: true,
          }),
        ]),
        Animated.loop(
          Animated.timing(shape3Rotate, {
            toValue: 1,
            duration: 30000,
            useNativeDriver: true,
          })
        ),
      ])
    ).start();

    // Shape 4 animation
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(shape4, {
            toValue: {x: screenWidth - 80, y: 500},
            duration: 22000,
            useNativeDriver: true,
          }),
          Animated.timing(shape4, {
            toValue: {x: 100, y: 400},
            duration: 22000,
            useNativeDriver: true,
          }),
        ]),
        Animated.loop(
          Animated.timing(shape4Rotate, {
            toValue: 1,
            duration: 28000,
            useNativeDriver: true,
          })
        ),
      ])
    ).start();
  };

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
      console.log('[HomeScreen] useFocusEffect - route.params:', route.params);
      if (route.params?.activePickupJob) {
        console.log('[HomeScreen] Setting active pickup job from route params:', route.params.activePickupJob);
        setActivePickupJob(route.params.activePickupJob);
        setPickupStatus('pending'); // Reset status when new job arrives
        
        // Clear the route params to prevent re-showing the banner
        navigation.setParams({activePickupJob: undefined} as any);
      } else {
        console.log('[HomeScreen] No active pickup job in route params');
        
        // Check for current ongoing pickup job for valet role (not valet_billing)
        if (session?.user?.role === 'valet') {
          console.log('[HomeScreen] Checking for current pickup job for valet role');
          getCurrentPickupJob()
            .then(response => {
              console.log('[HomeScreen] Current pickup job response:', response);
              if (response.success && response.pickupJob) {
                console.log('[HomeScreen] Found ongoing pickup job, showing banner:', response.pickupJob);
                setActivePickupJob(response.pickupJob);
                // Determine status based on pickup job status
                if (response.pickupJob.status === 'assigned') {
                  setPickupStatus('pending');
                } else if (response.pickupJob.status === 'arrived') {
                  setPickupStatus('arrived');
                }
              } else {
                console.log('[HomeScreen] No current pickup job found');
              }
            })
            .catch(error => {
              console.error('[HomeScreen] Failed to fetch current pickup job:', error);
            });
        }
      }
    }, [route.params?.activePickupJob, navigation, session?.user?.role])
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
      setDialog({
        visible: true,
        title: 'Error',
        message: 'Failed to update status. Please try again.',
        buttons: [{text: 'OK', style: 'default'}],
      });
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

  const handleProfile = () => {
    navigation.navigate('Profile');
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

  const totalJobs = (todayStats?.parkedCount ?? 0) + (todayStats?.deliveredCount ?? 0);
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };
  const getWeatherEmoji = () => {
    if (!weather) return '☁️';
    
    // Check if it's nighttime (6 PM to 6 AM)
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 18 || currentHour < 6;
    
    const condition = weather.condition.toLowerCase();
    
    // Handle rainy/stormy weather (same for day/night)
    if (condition.includes('rain')) return '🌧️';
    if (condition.includes('storm')) return '⛈️';
    if (condition.includes('snow')) return '❄️';
    
    // Handle clear/sunny weather - show moon at night
    if (condition.includes('clear') || condition.includes('sun')) {
      return isNight ? '🌙' : '☀️';
    }
    
    // Handle cloudy weather
    if (condition.includes('cloud')) return '☁️';
    
    // Default: sun during day, moon at night
    return isNight ? '🌙' : '🌤️';
  };

  const shape1RotateInterpolate = shape1Rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const shape2RotateInterpolate = shape2Rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });
  const shape3RotateInterpolate = shape3Rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  const shape4RotateInterpolate = shape4Rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-360deg'],
  });

  return (
    <LinearGradient
      colors={['#E3F2FD', '#F3E5F5', '#E8EAF6', '#E1F5FE']}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.container}>
      
      {/* Floating Car Icons Background */}
      <View style={styles.floatingShapesContainer}>
        {/* Car Parking Icon 1 */}
        <Animated.View
          style={[
            styles.floatingShape,
            {
              transform: [
                {translateX: shape1.x},
                {translateY: shape1.y},
                {rotate: shape1RotateInterpolate},
              ],
            },
          ]}>
          <Image source={carParkingIcon} style={styles.floatingCarImage} />
        </Animated.View>

        {/* Park Icon */}
        <Animated.View
          style={[
            styles.floatingShape,
            {
              transform: [
                {translateX: shape2.x},
                {translateY: shape2.y},
                {rotate: shape2RotateInterpolate},
              ],
            },
          ]}>
          <Image source={parkIcon} style={styles.floatingParkImage} />
        </Animated.View>

        {/* Delivered Icon */}
        <Animated.View
          style={[
            styles.floatingShape,
            {
              transform: [
                {translateX: shape3.x},
                {translateY: shape3.y},
                {rotate: shape3RotateInterpolate},
              ],
            },
          ]}>
          <Image source={deliveredIcon} style={styles.floatingDeliveredImage} />
        </Animated.View>

        {/* Slot Icon */}
        <Animated.View
          style={[
            styles.floatingShape,
            {
              transform: [
                {translateX: shape4.x},
                {translateY: shape4.y},
                {rotate: shape4RotateInterpolate},
              ],
            },
          ]}>
          <Image source={slotIcon} style={styles.floatingSlotImage} />
        </Animated.View>
      </View>

      {/* Header with logo, profile, and notification */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={urbaneaseLogo} style={styles.headerLogo} />
        </View>
        <View style={styles.headerRight}>
          
          <TouchableOpacity style={styles.iconButton} onPress={handleProfile}>
            <LinearGradient
              colors={['#76D0E3', '#3156D8']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.profileIconButton}>
              <Text style={styles.profileIconText}>
                {session?.driverName?.trim().charAt(0).toUpperCase() || 'D'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Driver info section */}
      <View style={styles.driverSection}>
        <View style={styles.driverInfo}>
          <View style={styles.driverInfoLeft}>
            <Text style={styles.driverName}>{session?.driverName ?? 'Driver'}</Text>
            <TouchableOpacity 
              style={styles.locationRow}
              onPress={() => !changingLocation && setShowLocationDropdown(!showLocationDropdown)}
              disabled={changingLocation}>
              <Image source={locationIcon} style={styles.locationIconImage} />
              <Text style={styles.locationText}>
                {changingLocation ? 'Changing location...' : (selectedLocation ? selectedLocation.name : 'Select Location')}
              </Text>
              {changingLocation ? (
                <ActivityIndicator size="small" color={COLORS.gradientEnd} style={{marginLeft: 4}} />
              ) : (
                <Text style={styles.dropdownArrow}>{showLocationDropdown ? '▲' : '▼'}</Text>
              )}
            </TouchableOpacity>
          </View>
          {/* Weather Widget on Right */}
          <View style={styles.weatherWidget}>
            {weatherLoading ? (
              <ActivityIndicator size="small" color={COLORS.gradientEnd} />
            ) : weatherError ? (
              <TouchableOpacity onPress={() => loadWeather(true)} style={styles.weatherErrorContainer}>
                <Text style={styles.weatherErrorIcon}>⚠️</Text>
                <Text style={styles.weatherErrorText}>Tap to retry</Text>
              </TouchableOpacity>
            ) : weather ? (
              <>
                <Text style={styles.weatherWidgetEmoji}>{getWeatherEmoji()}</Text>
                <View>
                  <Text style={styles.weatherWidgetTemp}>{weather.temp}°C</Text>
                  <Text style={styles.weatherWidgetCondition}>{weather.condition}</Text>
                </View>
              </>
            ) : null}
          </View>
          {showLocationDropdown && locations.length > 0 && !changingLocation && (
            <View style={styles.locationDropdown}>
              {locations.map((location) => (
                <TouchableOpacity
                  key={location.id}
                  style={[
                    styles.locationOption,
                    selectedLocation?.id === location.id && styles.locationOptionSelected
                  ]}
                  onPress={() => handleLocationSelect(location)}
                  disabled={changingLocation}>
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
      </View>

      {/* Overlay to close dropdown when clicking outside */}
      {showLocationDropdown && (
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowLocationDropdown(false)}
        />
      )}

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
            {/* Quick Stats Summary */}
            {totalJobs > 0 && (
              <View style={styles.summaryCard}>
                <Text style={styles.summaryText}>
                  {getGreeting()}! You've completed <Text style={styles.summaryHighlight}>{totalJobs} jobs</Text> today - Great work! 🎉
                </Text>
              </View>
            )}

            {/* Stats cards */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Image source={carParkingIcon} style={styles.statIconImage} />
                <Text style={styles.statLabel}>Parked Vehicles</Text>
                <Text style={styles.statValue}>{todayStats?.parkedCount ?? 0}</Text>
              </View>
              <View style={styles.statCard}>
                <Image source={deliveredIcon} style={styles.statIconImage} />
                <Text style={styles.statLabel}>Delivered Vehicles</Text>
                <Text style={styles.statValue}>{todayStats?.deliveredCount ?? 0}</Text>
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
                {pendingPickups.count === 0 && (
                  <View style={styles.emptyBadge}>
                    <Text style={styles.emptyBadgeText}>✓ All Clear</Text>
                  </View>
                )}
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
                {(jobsOverview?.activeJobsCount ?? 0) === 0 && (
                  <View style={styles.emptyBadge}>
                    <Text style={styles.emptyBadgeText}>✓ All Done</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Large PARK button with animation */}
            <View style={styles.parkButtonContainer}>
              <TouchableOpacity
                onPress={() => navigation.navigate('StartParking')}
                activeOpacity={0.8}>
                <Animated.View style={{transform: [{scale: parkButtonScale}]}}>
                  <LinearGradient
                    colors={['#76D0E3', '#3156D8']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.parkButton}>
                    <Image source={parkIcon} style={styles.parkIconImage} />
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>
            </View>

          </>
        )}
      </ScrollView>

      {/* Active Pickup Job Banner */}
      {activePickupJob && (
        <Animated.View 
          style={[
            styles.pickupBanner,
            isFullScreen && {
              height: bannerHeight,
            }
          ]}>
          {/* Drag Handle */}
          <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>
          
          {/* Header */}
          <TouchableOpacity 
            activeOpacity={0.9}
            onPress={() => setIsBannerExpanded(!isBannerExpanded)}
            style={styles.pickupBannerHeader}>
            <Text style={styles.pickupBannerTitle}>🚙 Active Pickup</Text>
            <Text style={styles.pickupBannerToggle}>{isBannerExpanded ? '▼' : '▲'}</Text>
          </TouchableOpacity>

          {/* Scrollable Content - Always show when banner is visible */}
          {isBannerExpanded && (
            <ScrollView 
              style={styles.pickupBannerScrollView}
              contentContainerStyle={styles.pickupBannerScrollContent}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}>
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
                {activePickupJob.phoneNumber && (
                  <View style={styles.pickupBannerRow}>
                    <Text style={styles.pickupBannerLabel}>Customer:</Text>
                    <TouchableOpacity 
                      style={styles.phoneContainer}
                      onPress={() => Linking.openURL(`tel:${activePickupJob.phoneNumber}`)}
                    >
                      <Text style={styles.pickupBannerValue}>{activePickupJob.phoneNumber}</Text>
                      <Text style={styles.callIcon}>📞</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {activePickupJob.locationDescription && (
                  <View style={styles.pickupBannerRow}>
                    <Text style={styles.pickupBannerLabel}>Remarks:</Text>
                    <Text style={styles.pickupBannerValue}>{activePickupJob.locationDescription}</Text>
                  </View>
                )}
              </View>
            </ScrollView>
          )}
          
          {/* Action Button - Fixed at bottom */}
          {pickupStatus !== 'completed' && (
            <View style={styles.pickupActionButtonContainer}>
              {isProcessing ? (
                <View style={styles.pickupActionButton}>
                  <ActivityIndicator size="small" color={COLORS.gradientEnd} />
                </View>
              ) : (
                <GradientButton
                  onPress={handlePickupAction}
                  disabled={isProcessing}>
                  {pickupStatus === 'pending' ? 'ARRIVED' : 'DELIVERED'}
                </GradientButton>
              )}
            </View>
          )}
        </Animated.View>
      )}

      {/* Overlay to block interactions when banner is visible */}
      {activePickupJob && (
        <View style={styles.bannerOverlay} pointerEvents="box-only" />
      )}

      {/* Custom Dialog */}
      <CustomDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        buttons={dialog.buttons}
        onDismiss={() => setDialog({...dialog, visible: false})}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: getResponsiveSpacing(20),
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    ...SHADOWS.small,
    zIndex: 1,
  },
  headerLeft: {
    flexDirection: 'row',
  },
  headerLogo: {
    height: verticalScale(40),
    width: moderateScale(150),
    resizeMode: 'contain',
    marginLeft: moderateScale(-50),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
  },
  iconButton: {
    padding: moderateScale(4),
  },
  profileIcon: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: COLORS.gradientEnd,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: '#ffffff',
  },
  profileIconButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverSection: {
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: getResponsiveSpacing(16),
    paddingVertical: verticalScale(12),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverInfoLeft: {
    flex: 1,
  },
  driverName: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(2),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  locationIcon: {
    fontSize: getResponsiveFontSize(14),
  },
  locationIconImage: {
    width: moderateScale(14),
    height: moderateScale(14),
  },
  locationText: {
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textSecondary,
  },
  dropdownArrow: {
    fontSize: getResponsiveFontSize(10),
    color: '#DC2626',
    marginLeft: moderateScale(4),
  },
  locationDropdown: {
    position: 'absolute',
    top: verticalScale(50),
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12),
    marginTop: verticalScale(4),
    marginHorizontal: getResponsiveSpacing(16),
    maxHeight: verticalScale(200),
    ...SHADOWS.large,
    zIndex: 1001,
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  locationOption: {
    padding: getResponsiveSpacing(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  locationOptionSelected: {
    backgroundColor: COLORS.backgroundLight,
  },
  locationOptionText: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(2),
  },
  locationOptionTextSelected: {
    color: COLORS.gradientEnd,
  },
  locationOptionAddress: {
    fontSize: getResponsiveFontSize(12),
    color: COLORS.textSecondary,
  },
  toggleContainer: {
    alignItems: 'center',
    gap: moderateScale(6),
  },
  onlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: getResponsiveSpacing(10),
    paddingVertical: verticalScale(5),
    borderRadius: moderateScale(999),
    gap: moderateScale(6),
    ...SHADOWS.small,
  },
  offlineToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.textSecondary,
    paddingHorizontal: getResponsiveSpacing(10),
    paddingVertical: verticalScale(5),
    borderRadius: moderateScale(999),
    gap: moderateScale(6),
    ...SHADOWS.small,
  },
  onlineToggleText: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    color: '#ffffff',
  },
  toggleCircle: {
    width: moderateScale(16),
    height: moderateScale(16),
    borderRadius: moderateScale(8),
    backgroundColor: '#ffffff',
  },
  timerText: {
    fontSize: getResponsiveFontSize(11),
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginTop: verticalScale(2),
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  scrollContent: {
    padding: getResponsiveSpacing(16),
    paddingBottom: verticalScale(20),
  },
  loadingContainer: {
    marginTop: verticalScale(60),
    alignItems: 'center',
  },
  loadingText: {
    marginTop: verticalScale(12),
    color: COLORS.textSecondary,
    fontSize: getResponsiveFontSize(16),
  },
  statsRow: {
    flexDirection: 'row',
    gap: moderateScale(10),
    marginBottom: verticalScale(12),
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12),
    padding: getResponsiveSpacing(12),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: verticalScale(90),
    ...SHADOWS.medium,
  },
  statIcon: {
    fontSize: getResponsiveFontSize(48),
    marginBottom: verticalScale(12),
  },
  statIconImage: {
    width: moderateScale(32),
    height: moderateScale(32),
    marginBottom: verticalScale(8),
  },
  statLabel: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: verticalScale(4),
  },
  statValue: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12),
    padding: getResponsiveSpacing(12),
    marginBottom: verticalScale(16),
    ...SHADOWS.medium,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
    paddingVertical: verticalScale(4),
  },
  infoIconContainer: {
    width: moderateScale(28),
    height: moderateScale(28),
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
    fontSize: getResponsiveFontSize(22),
    lineHeight: verticalScale(28),
  },
  infoIconImage: {
    width: moderateScale(28),
    height: moderateScale(28),
  },
  infoLabel: {
    fontSize: getResponsiveFontSize(15),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  infoValue: {
    fontSize: getResponsiveFontSize(15),
    fontWeight: '700',
    color: COLORS.gradientEnd,
  },
  infoDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: verticalScale(8),
  },
  parkButtonContainer: {
    alignItems: 'center',
    marginVertical: verticalScale(16),
  },
  parkButton: {
    width: moderateScale(160),
    height: moderateScale(160),
    borderRadius: moderateScale(80),
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  parkButtonInner: {
    alignItems: 'center',
  },
  parkIconImage: {
    width: moderateScale(80),
    height: moderateScale(80),
    tintColor: '#ffffff',
  },
  parkText: {
    fontSize: getResponsiveFontSize(36),
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: moderateScale(3),
  },
  ongoingBanner: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    padding: getResponsiveSpacing(20),
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
    marginBottom: verticalScale(20),
    ...SHADOWS.medium,
  },
  ongoingIcon: {
    fontSize: getResponsiveFontSize(24),
  },
  ongoingText: {
    fontSize: getResponsiveFontSize(16),
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
    borderTopLeftRadius: moderateScale(20),
    borderTopRightRadius: moderateScale(20),
    paddingTop: verticalScale(8),
    paddingHorizontal: getResponsiveSpacing(16),
    paddingBottom: verticalScale(16),
    zIndex: 2,
    ...SHADOWS.large,
  },
  pickupBannerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(8),
  },
  pickupBannerScrollView: {
    flex: 1,
    maxHeight: '70%', // Allow space for header and button
  },
  pickupBannerScrollContent: {
    paddingBottom: verticalScale(8),
  },
  pickupBannerTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pickupBannerToggle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '700',
    color: COLORS.gradientEnd,
    paddingHorizontal: getResponsiveSpacing(8),
  },
  pickupBannerContent: {
    gap: verticalScale(16),
    paddingVertical: verticalScale(8),
  },
  pickupBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickupBannerLabel: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  pickupBannerValue: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  callIcon: {
    fontSize: getResponsiveFontSize(18),
    marginLeft: 4,
    color: '#FF0000',
  },
  pickupActionButtonContainer: {
    marginTop: verticalScale(16),
  },
  pickupActionButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(8),
  },
  dragHandle: {
    width: moderateScale(40),
    height: moderateScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: COLORS.border,
  },
  bannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1,
  },
  weatherWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12),
    padding: getResponsiveSpacing(10),
    gap: moderateScale(8),
    ...SHADOWS.small,
  },
  weatherWidgetEmoji: {
    fontSize: getResponsiveFontSize(28),
  },
  weatherWidgetTemp: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  weatherWidgetCondition: {
    fontSize: getResponsiveFontSize(11),
    color: COLORS.textSecondary,
  },
  weatherErrorContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: moderateScale(2),
  },
  weatherErrorIcon: {
    fontSize: getResponsiveFontSize(20),
  },
  weatherErrorText: {
    fontSize: getResponsiveFontSize(9),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: moderateScale(12),
    padding: getResponsiveSpacing(16),
    marginBottom: verticalScale(16),
    borderLeftWidth: moderateScale(4),
    borderLeftColor: COLORS.success,
  },
  summaryText: {
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textPrimary,
    lineHeight: verticalScale(20),
  },
  summaryHighlight: {
    fontWeight: '700',
    color: COLORS.gradientEnd,
  },
  emptyBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: getResponsiveSpacing(12),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  emptyBadgeText: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    color: COLORS.success,
  },
  floatingShapesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
    zIndex: 0,
  },
  floatingShape: {
    position: 'absolute',
    opacity: 0.18,
  },
  floatingCarImage: {
    width: moderateScale(120),
    height: moderateScale(120),
    resizeMode: 'contain',
  },
  floatingParkImage: {
    width: moderateScale(100),
    height: moderateScale(100),
    resizeMode: 'contain',
  },
  floatingDeliveredImage: {
    width: moderateScale(110),
    height: moderateScale(110),
    resizeMode: 'contain',
  },
  floatingSlotImage: {
    width: moderateScale(90),
    height: moderateScale(90),
    resizeMode: 'contain',
  },
});
