import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {AppStackParamList} from '../navigation/AppNavigator';
import {COLORS, SHADOWS} from '../constants/theme';
import {moderateScale, verticalScale, getResponsiveFontSize, getResponsiveSpacing} from '../utils/responsive';
import BackButton from '../components/BackButton';
import LinearGradient from 'react-native-linear-gradient';
import {getInProgressBooking, deleteBooking} from '../api/pickup';

const urbaneaseLogo = require('../assets/icons/urbanease-logo.png');

export default function InProgressJobsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [bookings, setBookings] = useState<any[]>([]); // Changed to array
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);

  useEffect(() => {
    loadBooking();
  }, []);

  // Debug: Log bookings state changes
  useEffect(() => {
    console.log('[InProgressJobsScreen] Bookings state updated:', bookings.length, 'items');
    if (bookings.length > 0) {
      console.log('[InProgressJobsScreen] First booking:', JSON.stringify(bookings[0], null, 2));
    }
  }, [bookings]);

  const loadBooking = async () => {
    try {
      setLoading(true);
      console.log('[InProgressJobsScreen] Fetching in-progress bookings...');
      const response = await getInProgressBooking();
      console.log('[InProgressJobsScreen] Full response:', JSON.stringify(response, null, 2));
      console.log('[InProgressJobsScreen] Response.success:', response.success);
      console.log('[InProgressJobsScreen] Response.booking:', response.booking);
      console.log('[InProgressJobsScreen] Is array?', Array.isArray(response.booking));
      
      // Handle different response structures
      let bookingsArray: any[] = [];
      
      if (response.success) {
        // Check if booking is an array
        if (Array.isArray(response.booking)) {
          bookingsArray = response.booking;
        } 
        // Check if booking is a single object (backward compatibility)
        else if (response.booking && typeof response.booking === 'object') {
          bookingsArray = [response.booking];
        }
        // Check if response has bookings (plural) field
        else if ((response as any).bookings && Array.isArray((response as any).bookings)) {
          bookingsArray = (response as any).bookings;
        }
        // Check if response.data exists
        else if ((response as any).data && Array.isArray((response as any).data)) {
          bookingsArray = (response as any).data;
        }
      }
      
      console.log('[InProgressJobsScreen] Processed bookings array:', bookingsArray.length, 'items');
      console.log('[InProgressJobsScreen] Bookings data:', JSON.stringify(bookingsArray, null, 2));
      
      setBookings(bookingsArray);
      
      if (bookingsArray.length === 0) {
        console.log('[InProgressJobsScreen] No in-progress bookings found');
      }
    } catch (error) {
      console.error('[InProgressJobsScreen] Failed to load bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBooking();
    setRefreshing(false);
  };

  const formatDateTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = (hours % 12 || 12).toString();
      return `${day}/${month}/${year} ${formattedHours}:${minutes} ${ampm}`;
    } catch (error) {
      return timestamp;
    }
  };

  const handleBookingPress = (booking: any) => {
    if (!booking) return;

    // Trim UE prefix from keyTagCode
    const trimmedKeyTag = booking.keyTagCode ? booking.keyTagCode.replace(/^UE/i, '') : '';
    
    // Trim +91 prefix from customerPhone
    const trimmedPhone = booking.customerPhone ? booking.customerPhone.replace(/^\+91/, '') : '';

    console.log('[InProgressJobsScreen] Navigating to StartParking with:', {
      keyTagCode: trimmedKeyTag,
      customerPhone: trimmedPhone,
      source: booking.source,
    });

    navigation.navigate('StartParking', {
      keyTagCode: trimmedKeyTag,
      customerPhone: trimmedPhone,
      source: booking.source, // Pass source to determine manual park mode
    });
  };

  const handleDeleteBooking = (booking: any) => {
    // Use bookingId from response, fallback to id if bookingId doesn't exist
    const bookingId = booking.bookingId || booking.id;
    
    if (!booking || !bookingId) {
      console.error('[InProgressJobsScreen] Cannot delete: booking or bookingId is missing', {
        booking,
        bookingId,
        hasBookingId: !!booking?.bookingId,
        hasId: !!booking?.id,
      });
      Alert.alert(
        'Error',
        'Cannot delete: Booking ID is missing. Please try refreshing the list.',
        [{text: 'OK'}]
      );
      return;
    }

    const keyTagCode = booking.keyTagCode || 'N/A';

    Alert.alert(
      'Delete Booking',
      `Are you sure you want to delete booking ${keyTagCode}? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingBookingId(bookingId);
              console.log('[InProgressJobsScreen] Deleting booking with bookingId:', bookingId);
              console.log('[InProgressJobsScreen] Full booking object:', JSON.stringify(booking, null, 2));
              
              await deleteBooking(bookingId);
              
              console.log('[InProgressJobsScreen] Booking deleted successfully');
              
              // Remove the deleted booking from the list using bookingId
              setBookings(prevBookings => 
                prevBookings.filter(b => (b.bookingId || b.id) !== bookingId)
              );
              
              // Optionally reload the list to ensure consistency
              // await loadBooking();
            } catch (error: any) {
              console.error('[InProgressJobsScreen] Failed to delete booking:', error);
              Alert.alert(
                'Error',
                error?.body?.message || error?.message || 'Failed to delete booking. Please try again.',
                [{text: 'OK'}]
              );
            } finally {
              setDeletingBookingId(null);
            }
          },
        },
      ]
    );
  };

  const renderBookingCard = ({item: booking}: {item: any}) => {
    if (!booking) {
      return null;
    }

    const bookingId = booking.bookingId || booking.id;
    const isDeleting = deletingBookingId === bookingId;

    return (
      <View style={styles.jobCardContainer}>
        <TouchableOpacity 
          style={styles.jobCard} 
          onPress={() => handleBookingPress(booking)} 
          activeOpacity={0.7}>
          <View style={styles.jobHeader}>
            <Text style={styles.vehicleNumber}>
              {booking.keyTagCode || 'N/A'}
            </Text>
            <TouchableOpacity
              style={styles.deleteIconButton}
              onPress={(e) => {
                e.stopPropagation(); // Prevent card press when clicking delete
                handleDeleteBooking(booking);
              }}
              disabled={isDeleting}
              hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
              {isDeleting ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <Text style={styles.deleteIcon}>✕</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.jobDetails}>
            {booking.customerPhone && (
              <Text style={styles.detailText}>Phone: {booking.customerPhone}</Text>
            )}
            {booking.source && (
              <Text style={styles.detailText}>Source: {booking.source}</Text>
            )}
            {booking.createdAt && (
              <Text style={styles.detailText}>Created: {formatDateTime(booking.createdAt)}</Text>
            )}
            {booking.tagNumber && (
              <Text style={styles.detailText}>Tag: {booking.tagNumber}</Text>
            )}
            {booking.customerName && (
              <Text style={styles.detailText}>Customer: {booking.customerName}</Text>
            )}
            {booking.slotNumber && (
              <Text style={styles.detailText}>Slot: {booking.slotNumber}</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyText}>No in-progress jobs</Text>
      <Text style={styles.emptySubtext}>All jobs are completed or pending</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton color="#1f2937" useIcon={true} />
        <View style={styles.headerLogoContainer}>
          <Image source={urbaneaseLogo} style={styles.headerLogo} />
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{bookings.length}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.gradientEnd} />
            <Text style={styles.loadingText}>Loading booking...</Text>
          </View>
        ) : (
          <FlatList
            data={bookings}
            renderItem={renderBookingCard}
            keyExtractor={(item, index) => item.bookingId || item.id || item.keyTagCode || `booking-${index}`}
            contentContainerStyle={
              bookings.length === 0 
                ? [styles.listContent, {flexGrow: 1}] 
                : styles.listContent
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[COLORS.gradientEnd]}
              />
            }
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={true}
            // Debug: Log when FlatList renders
            onLayout={() => {
              console.log('[InProgressJobsScreen] FlatList rendered with', bookings.length, 'items');
            }}
          />
        )}
      </View>
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
    paddingHorizontal: getResponsiveSpacing(20),
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(20),
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  headerLogoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: moderateScale(-30),
  },
  headerLogo: {
    height: verticalScale(40),
    width: moderateScale(150),
    resizeMode: 'contain',
  },
  countBadge: {
    backgroundColor: COLORS.gradientEnd,
    paddingHorizontal: getResponsiveSpacing(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(12),
  },
  countText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: COLORS.white,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    paddingTop: verticalScale(20),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: verticalScale(12),
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textSecondary,
  },
  listContent: {
    paddingHorizontal: getResponsiveSpacing(16),
    paddingBottom: verticalScale(20),
  },
  jobCardContainer: {
    marginBottom: verticalScale(12),
  },
  jobCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12),
    padding: getResponsiveSpacing(16),
    ...SHADOWS.medium,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  deleteIconButton: {
    width: moderateScale(28),
    height: moderateScale(28),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: moderateScale(14),
    backgroundColor: '#FEE2E2',
  },
  deleteIcon: {
    fontSize: getResponsiveFontSize(18),
    color: '#EF4444',
    fontWeight: 'bold',
    lineHeight: getResponsiveFontSize(18),
  },
  vehicleNumber: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: getResponsiveSpacing(12),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(12),
  },
  statusText: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    color: '#D97706',
  },
  jobDetails: {
    gap: verticalScale(4),
  },
  detailText: {
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: verticalScale(60),
  },
  emptyIcon: {
    fontSize: getResponsiveFontSize(64),
    marginBottom: verticalScale(16),
  },
  emptyText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(8),
  },
  emptySubtext: {
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
