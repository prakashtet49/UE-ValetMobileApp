import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuth} from '../context/AuthContext';
import {getDriverProfile, getClientLocations, updatePickupETA, type DriverProfile, type Location} from '../api/driver';
import BackButton from '../components/BackButton';
import CustomDialog from '../components/CustomDialog';
import {COLORS, SHADOWS} from '../constants/theme';
import type {AppStackParamList} from '../navigation/AppNavigator';
import {logError, getUserFriendlyMessage} from '../utils/errorHandler';
import appConfig from '../../app.json';

const urbaneaseLogo = require('../assets/icons/urbanease-logo.png');
const logoutIcon = require('../assets/icons/logout.png');

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {logout, session} = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [etaMinutes, setEtaMinutes] = useState('');
  const [isEditingETA, setIsEditingETA] = useState(false);
  const [settingETA, setSettingETA] = useState(false);
  const [dialog, setDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive'}>;
  }>({visible: false, title: '', message: '', buttons: []});

  // Check if user has valet_billing role
  const isValetBilling = session?.user?.role === 'valet_billing';

  useEffect(() => {
    loadProfile();
    loadLocations();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getDriverProfile();
      setProfile(data);
      
      // Set existing ETA value if available
      if (data.pickupEstimatedMinutes) {
        setEtaMinutes(data.pickupEstimatedMinutes.toString());
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const response = await getClientLocations();
      setLocations(response.locations || []);
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  const handleEditETA = () => {
    // Enable editing mode
    setIsEditingETA(true);
  };

  const handleSetETA = async () => {
    const minutes = parseInt(etaMinutes, 10);
    
    if (!etaMinutes || isNaN(minutes) || minutes <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of minutes.');
      return;
    }

    if (locations.length === 0) {
      Alert.alert('No Location', 'No location found. Please try again later.');
      return;
    }

    setSettingETA(true);
    try {
      await updatePickupETA({
        locationId: locations[0].id,
        pickupEstimatedMinutes: minutes,
      });

      setDialog({
        visible: true,
        title: 'Success',
        message: `Pickup ETA updated to ${minutes} minutes successfully!`,
        buttons: [{text: 'OK', onPress: () => setDialog({...dialog, visible: false})}],
      });
      
      // Exit edit mode after successful update
      setIsEditingETA(false);
    } catch (error) {
      logError('ProfileScreen.handleSetETA', error);
      Alert.alert('Error', getUserFriendlyMessage(error));
    } finally {
      setSettingETA(false);
    }
  };

  const handleLogout = () => {
    setDialog({
      visible: true,
      title: 'Logout',
      message: 'Are you sure you want to logout?',
      buttons: [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
              // Navigation will be handled by AuthContext
            } catch (error) {
              console.error('Logout failed:', error);
            }
          },
        },
      ],
    });
  };

  const handleNotifications = () => {
    // TODO: Navigate to notifications screen
    console.log('Navigate to notifications');
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
          <Text style={styles.loadingText}>Loading profile...</Text>
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
      </View>

      <View style={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={['#76D0E3', '#3156D8']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.avatar}>
              <Text style={styles.avatarText}>
                {profile?.name?.charAt(0).toUpperCase() || 'D'}
              </Text>
            </LinearGradient>
          </View>

          <Text style={styles.name}>{profile?.name || 'Driver'}</Text>
          <Text style={styles.phone}>{profile?.phone || 'N/A'}</Text>
          {profile?.clientName && (
            <View style={styles.clientBadge}>
              <Text style={styles.clientLabel}>Company : </Text>
              <Text style={styles.clientName}>{profile.clientName}</Text>
            </View>
          )}
        </View>

        {/* ETA Setting Section - Only visible for valet_billing role */}
        {isValetBilling && (
          <View style={styles.etaCard}>
            <Text style={styles.etaTitle}>Set Pickup ETA</Text>
            <Text style={styles.etaSubtitle}>Set estimated time for pickup in minutes</Text>
            
            <View style={styles.etaInputContainer}>
              <TextInput
                style={[styles.etaInput, !isEditingETA && styles.etaInputDisabled]}
                placeholder="Enter minutes"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="numeric"
                value={etaMinutes}
                onChangeText={setEtaMinutes}
                editable={isEditingETA && !settingETA}
              />
              <TouchableOpacity
                style={[styles.etaButton, settingETA && styles.etaButtonDisabled]}
                onPress={isEditingETA ? handleSetETA : handleEditETA}
                disabled={settingETA}>
                {settingETA ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <LinearGradient
                    colors={['#76D0E3', '#3156D8']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.etaButtonGradient}>
                    <Text style={styles.etaButtonText}>{isEditingETA ? 'Set' : 'Edit'}</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.logoutButton]}
            onPress={handleLogout}>
            <View style={[styles.actionIconContainer, styles.logoutIconContainer]}>
              <Image source={logoutIcon} style={styles.actionIcon} />
            </View>
            <Text style={[styles.actionText, styles.logoutText]}>Logout</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version {appConfig.version}</Text>
        </View>
      </View>

      {/* Dialog */}
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
    backgroundColor: COLORS.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    ...SHADOWS.small,
  },
  headerLogoContainer: {
    flex: 1,
    alignItems: 'center',
    marginLeft: -40,
  },
  headerLogo: {
    height: 40,
    width: 150,
    resizeMode: 'contain',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
    ...SHADOWS.medium,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#ffffff',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  phone: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textSecondary,
  },
  statusDotActive: {
    backgroundColor: COLORS.success,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  actionsContainer: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    ...SHADOWS.small,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  actionIcon: {
    width: 20,
    height: 20,
    tintColor: COLORS.textPrimary,
  },
  actionIconText: {
    fontSize: 20,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  actionArrow: {
    fontSize: 24,
    color: COLORS.textSecondary,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  logoutIconContainer: {
    backgroundColor: '#FEE2E2',
  },
  logoutText: {
    color: '#DC2626',
  },
  clientBadge: {
    marginTop: 16,
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
  },
  clientName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gradientEnd,
  },
  etaCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...SHADOWS.medium,
  },
  etaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  etaSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  etaInputContainer: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  etaInput: {
    flex: 1,
    height: Platform.OS === 'ios' ? 56 : 52,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    paddingHorizontal: Platform.OS === 'ios' ? 18 : 16,
    paddingVertical: Platform.OS === 'ios' ? 16 : 0,
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  etaInputDisabled: {
    opacity: 0.6,
    backgroundColor: '#f0f0f0',
  },
  etaButton: {
    height: Platform.OS === 'ios' ? 56 : 52,
    borderRadius: 12,
    overflow: 'hidden',
    minWidth: 80,
  },
  etaButtonDisabled: {
    opacity: 0.6,
  },
  etaButtonGradient: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  etaButtonText: {
    color: '#ffffff',
    fontSize: Platform.OS === 'ios' ? 17 : 16,
    fontWeight: '700',
    letterSpacing: Platform.OS === 'ios' ? -0.4 : 0,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    marginTop: 'auto',
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
});
