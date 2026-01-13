import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {moderateScale, verticalScale, getResponsiveFontSize, getResponsiveSpacing} from '../utils/responsive';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {useAuth} from '../context/AuthContext';
import {getClientLocations, assignLocation, type Location} from '../api/driver';
import type {BillingStackParamList} from '../navigation/AppNavigator';
import {COLORS, SHADOWS} from '../constants/theme';
import CustomDialog from '../components/CustomDialog';

const urbaneaseLogo = require('../assets/icons/urbanease-logo.png');
const locationIcon = require('../assets/icons/location.png');

export default function BillingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BillingStackParamList>>();
  const {session} = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [changingLocation, setChangingLocation] = useState(false);
  const [dialog, setDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive'}>;
  }>({visible: false, title: '', message: '', buttons: []});
  const [locationsLoaded, setLocationsLoaded] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (locationsLoaded && locations.length > 0) {
        restoreSelectedLocation();
      }
    }, [locationsLoaded, locations])
  );

  async function loadLocations() {
    try {
      const response = await getClientLocations();
      setLocations(response.locations);
      
      // Try to restore previously selected location
      const savedLocationId = await AsyncStorage.getItem('billing_selected_location_id');
      
      if (savedLocationId && response.locations) {
        const savedLocation = response.locations.find(loc => loc.id === savedLocationId);
        if (savedLocation) {
          console.log('[BillingScreen] Restored saved location:', savedLocation.name);
          setSelectedLocation(savedLocation);
          // Assign the saved location to backend to ensure data matches
          try {
            await assignLocation({locationId: savedLocation.id});
            console.log('[BillingScreen] Assigned saved location to backend:', savedLocation.name);
          } catch (error) {
            console.error('[BillingScreen] Failed to assign saved location:', error);
          }
          setLocationsLoaded(true);
          return;
        }
      }
      
      // Only set first location if no saved location exists
      if (response.locations && response.locations.length > 0) {
        console.log('[BillingScreen] No saved location, using first location');
        setSelectedLocation(response.locations[0]);
        // Save the first location as default
        await AsyncStorage.setItem('billing_selected_location_id', response.locations[0].id);
        // Assign the first location to backend
        try {
          await assignLocation({locationId: response.locations[0].id});
          console.log('[BillingScreen] Assigned first location to backend:', response.locations[0].name);
        } catch (error) {
          console.error('[BillingScreen] Failed to assign first location:', error);
        }
      }
      setLocationsLoaded(true);
    } catch (error) {
      console.error('Failed to load locations:', error);
      setLocationsLoaded(true);
    }
  }

  async function restoreSelectedLocation() {
    try {
      const savedLocationId = await AsyncStorage.getItem('billing_selected_location_id');
      if (savedLocationId && locations.length > 0) {
        const savedLocation = locations.find(loc => loc.id === savedLocationId);
        if (savedLocation && savedLocation.id !== selectedLocation?.id) {
          console.log('[BillingScreen] Restoring location on focus:', savedLocation.name);
          setSelectedLocation(savedLocation);
        }
      }
    } catch (error) {
      console.error('[BillingScreen] Failed to restore location:', error);
    }
  }

  const handleLocationSelect = async (location: Location) => {
    if (changingLocation) {
      console.log('[BillingScreen] Location change already in progress, ignoring click');
      setShowLocationDropdown(false);
      return;
    }

    try {
      setChangingLocation(true);
      console.log('[BillingScreen] Assigning location:', location.id, location.name);
      
      await assignLocation({locationId: location.id});
      setSelectedLocation(location);
      await AsyncStorage.setItem('billing_selected_location_id', location.id);
      setShowLocationDropdown(false);
      
      console.log('[BillingScreen] Location assigned successfully');
      
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

  const handleProfile = () => {
    navigation.navigate('Profile');
  };

  const handleNavigateToPendingPickups = () => {
    navigation.navigate('BillingPendingPickups');
  };

  const handleNavigateToActiveJobs = () => {
    navigation.navigate('BillingActiveJobs');
  };

  const handleNavigateToGenerateBills = () => {
    navigation.navigate('GenerateBills');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#E3F2FD', '#F3E5F5', '#E8EAF6', '#E1F5FE']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
        style={styles.headerGradient}>
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
                  {session?.driverName?.trim().charAt(0).toUpperCase() || 'B'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Driver info section */}
        <View style={styles.driverSection}>
          <View style={styles.driverInfo}>
            <View style={styles.driverInfoLeft}>
              <Text style={styles.driverName}>{session?.driverName ?? 'Billing User'}</Text>
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
          </View>
        </View>
      </LinearGradient>

      {/* Location Dropdown */}
      {showLocationDropdown && (
        <View style={styles.locationDropdown}>
          {locations.map(location => (
            <TouchableOpacity
              key={location.id}
              style={[
                styles.locationOption,
                selectedLocation?.id === location.id && styles.locationOptionSelected,
              ]}
              onPress={() => handleLocationSelect(location)}>
              <Text
                style={[
                  styles.locationOptionText,
                  selectedLocation?.id === location.id && styles.locationOptionTextSelected,
                ]}>
                {location.name}
              </Text>
              {selectedLocation?.id === location.id && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Card Buttons */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.cardsContainer}
        showsVerticalScrollIndicator={false}>
        
        {/* Pending Pickups Card */}
        <TouchableOpacity 
          style={styles.card}
          onPress={handleNavigateToPendingPickups}
          activeOpacity={0.7}>
          <LinearGradient
            colors={['#76D0E3', '#3156D8']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.cardGradient}>
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIcon}>🚙</Text>
            </View>
            <Text style={styles.cardTitle}>Pending Pickups</Text>
            <Text style={styles.cardDescription}>View and accept pending pickup requests</Text>
            <View style={styles.cardArrow}>
              <Text style={styles.cardArrowText}>→</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Active Jobs Card */}
        <TouchableOpacity 
          style={styles.card}
          onPress={handleNavigateToActiveJobs}
          activeOpacity={0.7}>
          <LinearGradient
            colors={['#10B981', '#059669']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.cardGradient}>
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIcon}>🚗</Text>
            </View>
            <Text style={styles.cardTitle}>Active Jobs</Text>
            <Text style={styles.cardDescription}>Manage and checkout active parking jobs</Text>
            <View style={styles.cardArrow}>
              <Text style={styles.cardArrowText}>→</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* Generate Bills Card */}
        <TouchableOpacity 
          style={styles.card}
          onPress={handleNavigateToGenerateBills}
          activeOpacity={0.7}>
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.cardGradient}>
            <View style={styles.cardIconContainer}>
              <Text style={styles.cardIcon}>📄</Text>
            </View>
            <Text style={styles.cardTitle}>Generate Bills</Text>
            <Text style={styles.cardDescription}>Print receipts and manage billing</Text>
            <View style={styles.cardArrow}>
              <Text style={styles.cardArrowText}>→</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Custom Dialog */}
      <CustomDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        buttons={dialog.buttons}
        onDismiss={() => setDialog({...dialog, visible: false})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    paddingBottom: verticalScale(12),
  },
  header: {
    paddingHorizontal: getResponsiveSpacing(20),
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
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
  profileIconButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: '#ffffff',
  },
  driverSection: {
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: getResponsiveSpacing(16),
    paddingVertical: verticalScale(12),
  },
  driverInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverInfoLeft: {
    flex: 1,
    marginRight: getResponsiveSpacing(12),
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
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    maxHeight: verticalScale(200),
    ...SHADOWS.medium,
  },
  locationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: getResponsiveSpacing(20),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  locationOptionSelected: {
    backgroundColor: '#E3F2FD',
  },
  locationOptionText: {
    fontSize: getResponsiveFontSize(15),
    color: COLORS.textPrimary,
  },
  locationOptionTextSelected: {
    fontWeight: '600',
    color: COLORS.gradientEnd,
  },
  checkmark: {
    fontSize: getResponsiveFontSize(16),
    color: COLORS.gradientEnd,
    fontWeight: '700',
  },
  scrollView: {
    flex: 1,
  },
  cardsContainer: {
    padding: getResponsiveSpacing(20),
    gap: verticalScale(16),
  },
  card: {
    borderRadius: moderateScale(20),
    overflow: 'hidden',
    ...SHADOWS.large,
  },
  cardGradient: {
    padding: getResponsiveSpacing(24),
    minHeight: moderateScale(160),
    justifyContent: 'space-between',
  },
  cardIconContainer: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: verticalScale(12),
  },
  cardIcon: {
    fontSize: getResponsiveFontSize(28),
  },
  cardTitle: {
    fontSize: getResponsiveFontSize(22),
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: verticalScale(8),
  },
  cardDescription: {
    fontSize: getResponsiveFontSize(14),
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 20,
  },
  cardArrow: {
    position: 'absolute',
    top: getResponsiveSpacing(24),
    right: getResponsiveSpacing(24),
  },
  cardArrowText: {
    fontSize: getResponsiveFontSize(24),
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '700',
  },
});
