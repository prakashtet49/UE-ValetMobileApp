import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {useNavigation} from '@react-navigation/native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {useAuth} from '../context/AuthContext';
import {getDriverProfile, type DriverProfile} from '../api/driver';
import BackButton from '../components/BackButton';
import CustomDialog from '../components/CustomDialog';
import {COLORS, SHADOWS} from '../constants/theme';
import type {AppStackParamList} from '../navigation/AppNavigator';

const urbaneaseLogo = require('../assets/icons/urbanease-logo.png');
const logoutIcon = require('../assets/icons/logout.png');

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {logout} = useAuth();
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive'}>;
  }>({visible: false, title: '', message: '', buttons: []});

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await getDriverProfile();
      setProfile(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
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
});
