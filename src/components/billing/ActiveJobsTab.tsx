import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {getActiveJobs, type ActiveJob} from '../../api/jobs';
import {checkoutParking} from '../../api/parking';
import SettlementReceiptModal from './SettlementReceiptModal';
import {COLORS, SHADOWS} from '../../constants/theme';
import type {AppStackParamList} from '../../navigation/AppNavigator';
import {logError, getUserFriendlyMessage} from '../../utils/errorHandler';
import {formatDateTime} from '../../utils/dateFormat';
import {moderateScale, verticalScale, getResponsiveFontSize, getResponsiveSpacing} from '../../utils/responsive';

const carParkingIcon = require('../../assets/icons/car_parking.png');
const locationIcon = require('../../assets/icons/location.png');
const slotIcon = require('../../assets/icons/slot.png');
const durationIcon = require('../../assets/icons/duration.png');
const arrowRightIcon = require('../../assets/icons/arrow-right.png');

export default function ActiveJobsTab() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [jobs, setJobs] = useState<ActiveJob[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<ActiveJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [checkoutDialog, setCheckoutDialog] = useState<{
    visible: boolean;
    job: ActiveJob | null;
  }>({visible: false, job: null});
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [errorDialog, setErrorDialog] = useState<{
    visible: boolean;
    message: string;
  }>({visible: false, message: ''});
  const [postCheckoutReceipt, setPostCheckoutReceipt] = useState<{
    bookingId: string;
    vehicleNumber: string;
  } | null>(null);
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const response = await getActiveJobs();
      setJobs(response.jobs || []);
      setFilteredJobs(response.jobs || []);
    } catch (error) {
      logError('ActiveJobsTab.load', error);
      setErrorDialog({
        visible: true,
        message: getUserFriendlyMessage(error),
      });
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = () => {
    try {
      if (!searchQuery.trim()) {
        setFilteredJobs(jobs);
        setSearchActive(false);
        return;
      }

      const query = searchQuery.trim().toLowerCase();
      const filtered = jobs.filter(job => 
        job.vehicleNumber.toLowerCase().includes(query) ||
        (job.tagNumber && job.tagNumber.toLowerCase().includes(query)) ||
        (job.customerPhone && job.customerPhone.toLowerCase().includes(query))
      );
      
      setFilteredJobs(filtered);
      setSearchActive(true);
    } catch (error) {
      logError('ActiveJobsTab.handleSearch', error);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setFilteredJobs(jobs);
    setSearchActive(false);
  };

  const handleCheckoutPress = (job: ActiveJob) => {
    setCheckoutDialog({
      visible: true,
      job: job,
    });
  };

  const handleCheckoutConfirm = async () => {
    if (!checkoutDialog.job) return;

    setProcessingCheckout(true);
    try {
      console.log('Checking out job:', checkoutDialog.job.id);
      
      await checkoutParking({
        bookingId: checkoutDialog.job.id,
      });

      console.log('Checkout successful');

      const checkedOut = checkoutDialog.job;
      setCheckoutDialog({visible: false, job: null});

      setPostCheckoutReceipt({
        bookingId: checkedOut.id,
        vehicleNumber: checkedOut.vehicleNumber,
      });
      setShowSettlementDialog(true);
    } catch (error: any) {
      console.error('Checkout failed:', error);
      setCheckoutDialog({visible: false, job: null});
      
      const errorMessage = error?.body?.message || error?.message || 'Failed to checkout. Please try again.';
      setErrorDialog({
        visible: true,
        message: errorMessage,
      });
    } finally {
      setProcessingCheckout(false);
    }
  };

  const handleCheckoutCancel = () => {
    setCheckoutDialog({visible: false, job: null});
  };

  useEffect(() => {
    load();
  }, []);

  const onRefresh = async () => {
    try {
      setRefreshing(true);
      setSearchQuery('');
      setSearchActive(false);
      await load();
    } catch (error) {
      logError('ActiveJobsTab.onRefresh', error);
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
          <View style={styles.tagBadgeOuter}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={StyleSheet.absoluteFill}
            />
            <Text style={styles.tagText} numberOfLines={1}>
              {item.tagNumber}
            </Text>
          </View>
        </View>
        
        <View style={styles.divider} />
        
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
            <Text style={styles.detailLabel}>Parked at</Text>
          </View>
          <Text style={styles.detailValue}>{formatDateTime(item.parkedAt)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailLabelContainer}>
            <Image source={locationIcon} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Remarks</Text>
          </View>
          <Text style={styles.detailValue}>{item.locationDescription || item.locationName}</Text>
        </View>
        
        <TouchableOpacity
          onPress={() => handleCheckoutPress(item)}
          style={styles.checkoutButton}
          activeOpacity={0.85}>
          <View style={styles.checkoutButtonClip}>
            <LinearGradient
              colors={[COLORS.error, '#DC2626']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.checkoutButtonContent} pointerEvents="none">
              <Text style={styles.checkoutButtonText}>CHECKOUT</Text>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.gradientEnd} />
        <Text style={styles.loadingText}>Loading active jobs...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Vehicle or Mobile Number"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={handleSearch}
          style={styles.searchButton}
          disabled={!searchQuery.trim()}>
          <View style={styles.searchButtonInner}>
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.searchIconWrap} pointerEvents="none">
              <Image source={arrowRightIcon} style={styles.searchIcon} />
            </View>
          </View>
        </TouchableOpacity>
      </View>
      
      {searchActive && (
        <View style={styles.searchResultsHeader}>
          <Text style={styles.searchResultsText}>
            {filteredJobs.length} result{filteredJobs.length !== 1 ? 's' : ''} found
          </Text>
          <TouchableOpacity onPress={clearSearch}>
            <Text style={styles.clearSearchText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      )}
      
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={filteredJobs}
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
      
      {checkoutDialog.visible && checkoutDialog.job && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContainer}>
            <Text style={styles.dialogTitle}>Confirm Checkout</Text>
            <Text style={styles.dialogMessage}>
              Are you sure you want to checkout vehicle{' '}
              <Text style={styles.dialogVehicle}>{checkoutDialog.job.vehicleNumber}</Text>?
            </Text>
            {checkoutDialog.job.customerPhone && (
              <View style={styles.dialogPhoneContainer}>
                <Text style={styles.dialogPhoneLabel}>Customer:</Text>
                <TouchableOpacity 
                  style={styles.dialogPhoneButton}
                  onPress={() => Linking.openURL(`tel:${checkoutDialog.job!.customerPhone}`)}
                >
                  <Text style={styles.dialogPhoneNumber}>{checkoutDialog.job.customerPhone}</Text>
                  <Text style={styles.dialogCallIcon}>📞</Text>
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.dialogButtons}>
              <TouchableOpacity
                onPress={handleCheckoutCancel}
                style={[styles.dialogButton, styles.dialogButtonCancel]}
                disabled={processingCheckout}>
                <Text style={styles.dialogButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCheckoutConfirm}
                style={[styles.dialogButton, styles.dialogButtonConfirm]}
                disabled={processingCheckout}>
                <LinearGradient
                  colors={['#76D0E3', '#3156D8']}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                  style={styles.dialogButtonGradient}>
                  <Text style={styles.dialogButtonTextConfirm}>
                    {processingCheckout ? 'Processing...' : 'Confirm'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      
      {errorDialog.visible && (
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogContainer}>
            <Text style={styles.dialogTitle}>Checkout Failed</Text>
            <Text style={styles.dialogMessage}>{errorDialog.message}</Text>
            <TouchableOpacity
              onPress={() => setErrorDialog({visible: false, message: ''})}
              style={styles.errorDialogButton}>
              <LinearGradient
                colors={['#76D0E3', '#3156D8']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.dialogButtonGradient}>
                <Text style={styles.dialogButtonTextConfirm}>OK</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <SettlementReceiptModal
        visible={showSettlementDialog}
        bookingId={postCheckoutReceipt?.bookingId ?? null}
        vehicleNumber={postCheckoutReceipt?.vehicleNumber ?? ''}
        onCancel={() => {
          setShowSettlementDialog(false);
          setPostCheckoutReceipt(null);
          load();
        }}
        onHiddenAfterPrintSuccess={() => setShowSettlementDialog(false)}
        onPrintedAndFinished={() => {
          setPostCheckoutReceipt(null);
          load();
          navigation.navigate('Home');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: getResponsiveSpacing(20),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
  },
  loadingText: {
    marginTop: verticalScale(12),
    color: COLORS.textSecondary,
    fontSize: getResponsiveFontSize(16),
  },
  emptyContainer: {
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
  itemContainer: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(24),
    padding: getResponsiveSpacing(20),
    marginBottom: verticalScale(16),
    overflow: 'visible',
    ...SHADOWS.medium,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSpacing(8),
  },
  vehicleIcon: {
    width: moderateScale(24),
    height: moderateScale(24),
  },
  vehicle: {
    color: COLORS.textPrimary,
    fontSize: getResponsiveFontSize(20),
    fontWeight: '700',
  },
  tagBadgeOuter: {
    position: 'relative',
    height: verticalScale(36),
    minWidth: moderateScale(56),
    maxWidth: '42%',
    paddingHorizontal: getResponsiveSpacing(12),
    borderRadius: moderateScale(12),
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagText: {
    color: COLORS.white,
    fontSize: getResponsiveFontSize(13),
    fontWeight: '600',
    textAlign: 'center',
    includeFontPadding: false,
    zIndex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: verticalScale(12),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: verticalScale(6),
    gap: getResponsiveSpacing(12),
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSpacing(6),
    flexShrink: 0,
  },
  detailIcon: {
    width: moderateScale(16),
    height: moderateScale(16),
  },
  detailLabel: {
    fontSize: getResponsiveFontSize(15),
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: getResponsiveFontSize(15),
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'right',
    flexShrink: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: getResponsiveSpacing(20),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(12),
    backgroundColor: COLORS.white,
    gap: getResponsiveSpacing(12),
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: moderateScale(16),
    paddingHorizontal: getResponsiveSpacing(16),
    height: moderateScale(50),
  },
  searchInput: {
    flex: 1,
    fontSize: getResponsiveFontSize(15),
    color: COLORS.textPrimary,
    paddingVertical: 0,
    textAlign: Platform.OS === 'ios' ? 'left' : undefined,
  },
  clearButton: {
    padding: getResponsiveSpacing(4),
    marginLeft: getResponsiveSpacing(8),
  },
  clearButtonText: {
    fontSize: getResponsiveFontSize(18),
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  searchButton: {
    width: moderateScale(50),
    height: moderateScale(50),
    borderRadius: moderateScale(16),
    overflow: 'hidden',
  },
  searchButtonInner: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(16),
    overflow: 'hidden',
    position: 'relative',
  },
  searchIconWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  searchIcon: {
    width: moderateScale(20),
    height: moderateScale(20),
    tintColor: COLORS.white,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getResponsiveSpacing(20),
    paddingVertical: verticalScale(12),
    backgroundColor: '#E3F2FD',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchResultsText: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  clearSearchText: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: COLORS.gradientEnd,
  },
  checkoutButton: {
    marginTop: verticalScale(16),
    borderRadius: moderateScale(26),
  },
  checkoutButtonClip: {
    position: 'relative',
    height: moderateScale(52),
    borderRadius: moderateScale(26),
    overflow: 'hidden',
    width: '100%',
  },
  checkoutButtonContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  checkoutButtonText: {
    color: COLORS.white,
    fontSize: Platform.OS === 'ios' ? getResponsiveFontSize(17) : getResponsiveFontSize(16),
    fontWeight: '700',
    textAlign: 'center',
    includeFontPadding: false,
  },
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  dialogContainer: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(20),
    padding: getResponsiveSpacing(24),
    marginHorizontal: getResponsiveSpacing(32),
    width: '85%',
    maxWidth: 400,
    ...SHADOWS.large,
  },
  dialogTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(12),
    textAlign: 'center',
  },
  dialogMessage: {
    fontSize: getResponsiveFontSize(16),
    color: COLORS.textSecondary,
    marginBottom: verticalScale(24),
    textAlign: 'center',
    lineHeight: 22,
  },
  dialogVehicle: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dialogPhoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: verticalScale(12),
    marginBottom: verticalScale(8),
    paddingVertical: verticalScale(8),
    paddingHorizontal: getResponsiveSpacing(12),
    backgroundColor: COLORS.backgroundLight,
    borderRadius: moderateScale(8),
  },
  dialogPhoneLabel: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginRight: getResponsiveSpacing(8),
  },
  dialogPhoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getResponsiveSpacing(6),
  },
  dialogPhoneNumber: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dialogCallIcon: {
    fontSize: getResponsiveFontSize(18),
    color: '#FF0000',
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: getResponsiveSpacing(12),
  },
  dialogButton: {
    flex: 1,
    borderRadius: moderateScale(12),
    overflow: 'hidden',
  },
  dialogButtonCancel: {
    backgroundColor: COLORS.backgroundLight,
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogButtonConfirm: {
    overflow: 'hidden',
  },
  dialogButtonGradient: {
    paddingVertical: verticalScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogButtonTextCancel: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
    width: '100%',
  },
  dialogButtonTextConfirm: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: COLORS.white,
    textAlign: 'center',
    width: '100%',
  },
  errorDialogButton: {
    width: '100%',
    borderRadius: moderateScale(12),
    overflow: 'hidden',
  },
});
