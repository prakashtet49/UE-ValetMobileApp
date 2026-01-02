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
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {getActiveJobs, type ActiveJob} from '../api/jobs';
import {checkoutParking} from '../api/parking';
import BackButton from '../components/BackButton';
import {COLORS, SHADOWS} from '../constants/theme';
import type {AppStackParamList} from '../navigation/AppNavigator';
import {logError, getUserFriendlyMessage} from '../utils/errorHandler';

const urbaneaseLogo = require('../assets/icons/urbanease-logo.png');
const carParkingIcon = require('../assets/icons/car_parking.png');
const locationIcon = require('../assets/icons/location.png');
const slotIcon = require('../assets/icons/slot.png');
const durationIcon = require('../assets/icons/duration.png');
const arrowRightIcon = require('../assets/icons/arrow-right.png');

export default function ActiveJobsScreen() {
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

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
      return `${formattedHours}:${formattedMinutes} ${ampm}`;
    } catch (error) {
      return timestamp;
    }
  };

  async function load() {
    try {
      setLoading(true);
      const response = await getActiveJobs();
      setJobs(response.jobs || []);
      setFilteredJobs(response.jobs || []);
    } catch (error) {
      logError('ActiveJobsScreen.load', error);
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
      logError('ActiveJobsScreen.handleSearch', error);
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
      
      // Call checkout API
      const response = await checkoutParking({
        bookingId: checkoutDialog.job.id,
      });
      
      console.log('Checkout successful:', response);
      
      // Close dialog
      setCheckoutDialog({visible: false, job: null});
      
      // Navigate to Home screen with complete job details for the banner
      navigation.navigate('Home', {
        activePickupJob: {
          bookingId: checkoutDialog.job.id,
          vehicleNumber: checkoutDialog.job.vehicleNumber,
          keyTagCode: checkoutDialog.job.tagNumber,
          slotNumber: checkoutDialog.job.slotOrZone,
          locationDescription: checkoutDialog.job.locationDescription || checkoutDialog.job.locationName,
          isCheckout: true,
        },
      });
    } catch (error: any) {
      console.error('Checkout failed:', error);
      setCheckoutDialog({visible: false, job: null});
      
      // Show error dialog
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
      // Clear search on refresh
      setSearchQuery('');
      setSearchActive(false);
      await load();
    } catch (error) {
      logError('ActiveJobsScreen.onRefresh', error);
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
          <Text style={styles.detailValue}>{formatTime(item.parkedAt)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <View style={styles.detailLabelContainer}>
            <Image source={locationIcon} style={styles.detailIcon} />
            <Text style={styles.detailLabel}>Remarks</Text>
          </View>
          <Text style={styles.detailValue}>{item.locationDescription || item.locationName}</Text>
        </View>
        
        {/* Checkout Button */}
        <TouchableOpacity
          onPress={() => handleCheckoutPress(item)}
          style={styles.checkoutButton}>
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.checkoutButtonGradient}>
            <Text style={styles.checkoutButtonText}>CHECKOUT</Text>
          </LinearGradient>
        </TouchableOpacity>
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
          <Text style={styles.countText}>{searchActive ? filteredJobs.length : jobs.length}</Text>
        </LinearGradient>
      </View>
      
      {/* Search Bar */}
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
          <LinearGradient
            colors={['#76D0E3', '#3156D8']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.searchButtonGradient}>
            <Image source={arrowRightIcon} style={styles.searchIcon} />
          </LinearGradient>
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
      
      {/* Checkout Confirmation Dialog */}
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
      
      {/* Error Dialog */}
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
    gap: 12,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
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
    textAlign: 'right',
    flexShrink: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    gap: 12,
    alignItems: 'center',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 50,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  searchButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    overflow: 'hidden',
  },
  searchButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchIcon: {
    width: 20,
    height: 20,
    tintColor: COLORS.white,
  },
  searchResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#E3F2FD',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchResultsText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  clearSearchText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gradientEnd,
  },
  checkoutButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkoutButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
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
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 32,
    width: '85%',
    maxWidth: 400,
    ...SHADOWS.large,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  dialogMessage: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 24,
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
    marginTop: 12,
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 8,
  },
  dialogPhoneLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
    marginRight: 8,
  },
  dialogPhoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dialogPhoneNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dialogCallIcon: {
    fontSize: 18,
    color: '#FF0000',
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  dialogButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  dialogButtonCancel: {
    backgroundColor: COLORS.backgroundLight,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogButtonConfirm: {
    overflow: 'hidden',
  },
  dialogButtonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogButtonTextCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dialogButtonTextConfirm: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  errorDialogButton: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
});
