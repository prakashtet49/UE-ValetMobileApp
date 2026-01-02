import React, {useState, useEffect} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  ActivityIndicator,
  PermissionsAndroid,
  Switch,
} from 'react-native';
import {moderateScale, verticalScale, getResponsiveFontSize, getResponsiveSpacing} from '../utils/responsive';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {launchCamera} from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import {startParking, uploadParkingPhotos, completeParking, startManualBooking} from '../api/parking';
import {getInProgressBooking} from '../api/pickup';
import type {AppStackParamList} from '../navigation/AppNavigator';
import BackButton from '../components/BackButton';
import GradientButton from '../components/GradientButton';
import CustomDialog from '../components/CustomDialog';
import {COLORS, SHADOWS} from '../constants/theme';
import {stampImageWithWatermarkAndTimestamp} from '../utils/imageStamp';
import ImagePreviewModal from '../components/ImagePreviewModal';

const urbaneaseLogo = require('../assets/icons/urbanease-logo.png');
const arrowRightIcon = require('../assets/icons/arrow-right.png');

export default function StartParkingScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [keyTagCode, setKeyTagCode] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [slotNumber, setSlotNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [photos, setPhotos] = useState<Array<{uri: string; name: string; type: string} | null>>([null, null, null]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingKeyTag, setVerifyingKeyTag] = useState(false);
  const [keyTagVerified, setKeyTagVerified] = useState(false);
  const [parkingJobId, setParkingJobId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isManualPark, setIsManualPark] = useState(true);
  const [customerMobile, setCustomerMobile] = useState('');
  const [submittingManual, setSubmittingManual] = useState(false);
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
  const [previewImage, setPreviewImage] = useState<{visible: boolean; uri: string | null; index: number | null}>({
    visible: false,
    uri: null,
    index: null,
  });
  const [initialLoading, setInitialLoading] = useState(true);
  const [inProgressBooking, setInProgressBooking] = useState<any>(null);

  // Fetch in-progress booking on mount
  useEffect(() => {
    const fetchInProgressBooking = async () => {
      try {
        console.log('[StartParkingScreen] Fetching in-progress booking...');
        const response = await getInProgressBooking();
        console.log('[StartParkingScreen] In-progress booking response:', response);
        
        if (response.success && response.booking) {
          setInProgressBooking(response.booking);
          console.log('[StartParkingScreen] Found in-progress booking:', response.booking);
          
          // Pre-fill form fields from in-progress booking
          if (response.booking.keyTagCode) {
            // Remove UE prefix if present
            const keyTag = response.booking.keyTagCode.replace(/^UE/i, '');
            setKeyTagCode(keyTag);
            setKeyTagVerified(true); // Mark as verified since it's from backend
            console.log('[StartParkingScreen] Pre-filled keyTagCode (trimmed):', keyTag);
          }
          
          if (response.booking.customerPhone) {
            // Remove +91 prefix if present
            const phoneNumber = response.booking.customerPhone.replace(/^\+91/, '');
            setCustomerMobile(phoneNumber);
            console.log('[StartParkingScreen] Pre-filled customerPhone (trimmed):', phoneNumber);
          }
          
          if (response.booking.parkingJobId) {
            setParkingJobId(response.booking.parkingJobId);
            console.log('[StartParkingScreen] Set parkingJobId:', response.booking.parkingJobId);
          }
          
          if (response.booking.vehicleNumber) {
            setVehicleNumber(response.booking.vehicleNumber);
            console.log('[StartParkingScreen] Pre-filled vehicleNumber:', response.booking.vehicleNumber);
          }
          
          if (response.booking.slotNumber) {
            setSlotNumber(response.booking.slotNumber);
            console.log('[StartParkingScreen] Pre-filled slotNumber:', response.booking.slotNumber);
          }
          
          if (response.booking.locationDescription) {
            setRemarks(response.booking.locationDescription);
            console.log('[StartParkingScreen] Pre-filled locationDescription:', response.booking.locationDescription);
          }
        } else {
          console.log('[StartParkingScreen] No in-progress booking found');
        }
      } catch (error) {
        console.error('[StartParkingScreen] Failed to fetch in-progress booking:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchInProgressBooking();
  }, []);

  const requestCameraPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Camera Permission',
            message: 'This app needs access to your camera to take photos of vehicles.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('Camera permission error:', err);
        return false;
      }
    }
    return true; // iOS handles permissions automatically
  };

  const handleTakePhoto = async (index: number) => {
    if (!keyTagVerified || !parkingJobId) {
      setDialog({
        visible: true,
        title: 'Error',
        message: 'Please verify key tag first',
        buttons: [{text: 'OK', style: 'default'}],
      });
      return;
    }

    // Request camera permission
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      setDialog({
        visible: true,
        title: 'Permission Denied',
        message: 'Camera permission is required to take photos. Please enable it in your device settings.',
        buttons: [
          {text: 'Cancel', style: 'cancel'},
          {text: 'Open Settings', onPress: () => {
            if (Platform.OS === 'android') {
              setDialog({
                visible: true,
                title: 'Info',
                message: 'Please enable Camera permission in App Settings',
                buttons: [{text: 'OK', style: 'default'}],
              });
            }
          }, style: 'default'},
        ],
      });
      return;
    }

    try {
      const result = await launchCamera({
        mediaType: 'photo',
        cameraType: 'back',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
        includeBase64: false,
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        setDialog({
          visible: true,
          title: 'Error',
          message: result.errorMessage || 'Failed to capture photo',
          buttons: [{text: 'OK', style: 'default'}],
        });
        return;
      }

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const originalUri = asset.uri || '';
        const stampedUri = originalUri
          ? await stampImageWithWatermarkAndTimestamp(originalUri)
          : '';
        const newPhotos = [...photos];
        newPhotos[index] = {
          uri: stampedUri,
          name: asset.fileName || `photo_${index}.jpg`,
          type: asset.type || 'image/jpeg',
        };
        setPhotos(newPhotos);

        // Upload photo immediately
        await uploadPhoto(index, newPhotos[index]);
      }
    } catch (error) {
      console.error('Camera error:', error);
      setDialog({
        visible: true,
        title: 'Error',
        message: 'Failed to open camera',
        buttons: [{text: 'OK', style: 'default'}],
      });
    }
  };

  const uploadPhoto = async (index: number, photo: {uri: string; name: string; type: string} | null) => {
    if (!photo || !parkingJobId) return;

    setUploadingPhotos(true);
    try {
      const photoKeys = ['frontPhoto', 'backPhoto', 'damagePhoto'] as const;
      const photoData = {
        [photoKeys[index]]: photo,
      };

      await uploadParkingPhotos(parkingJobId, photoData);
    } catch (error) {
      console.error('Failed to upload photo:', error);
      setDialog({
        visible: true,
        title: 'Upload Failed',
        message: 'Failed to upload photo. Please try again.',
        buttons: [{text: 'OK', style: 'default'}],
      });
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleVerifyKeyTag = async () => {
    if (!keyTagCode.trim()) {
      setError('Please enter the key tag code');
      return;
    }
    setVerifyingKeyTag(true);
    setError(null);
    try {
      // Concatenate UE prefix with the numeric code
      const fullKeyTagCode = `UE${keyTagCode.trim()}`;
      console.log('[StartParking] Verifying key tag:', fullKeyTagCode);
      const response = await startParking(fullKeyTagCode);
      setParkingJobId(response.parkingJobId);
      setLocationName(response.locationName);
      setKeyTagVerified(true);
      setError(null);
    } catch (error) {
      console.error('Failed to verify key tag', error);
      setError('Invalid key tag code. Please try again.');
      setKeyTagVerified(false);
    } finally {
      setVerifyingKeyTag(false);
    }
  };

  const handleManualBooking = async () => {
    if (!customerMobile.trim()) {
      setError('Please enter customer mobile number');
      return;
    }
    if (!keyTagCode.trim()) {
      setError('Please enter the key tag code');
      return;
    }
    
    // Validate mobile number (10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(customerMobile.trim())) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    
    setSubmittingManual(true);
    setError(null);
    try {
      const fullKeyTagCode = `UE${keyTagCode.trim()}`;
      const response = await startManualBooking({
        customer_mobile: `91${customerMobile.trim()}`,
        keytag_uid: fullKeyTagCode,
        customer_name: 'GUEST',
      });
      
      console.log('Manual booking started:', response);
      
      // Set as verified so rest of the fields become enabled
      setKeyTagVerified(true);
      setParkingJobId(response.parkingJobId || response.bookingId || 'manual-booking');
      setLocationName(response.locationName || 'the location');
      setError(null);
      
      // Show success message but don't navigate back
      setDialog({
        visible: true,
        title: 'Success',
        message: response.message || 'Manual booking created successfully! Please continue with vehicle details.',
        buttons: [{text: 'OK', style: 'default'}],
      });
    } catch (error: any) {
      console.error('Failed to create manual booking:', error);
      const errorMessage = error?.body?.message || error?.message || 'Failed to create manual booking. Please try again.';
      setError(errorMessage);
      setDialog({
        visible: true,
        title: 'Error',
        message: errorMessage,
        buttons: [{text: 'OK', style: 'default'}],
      });
    } finally {
      setSubmittingManual(false);
    }
  };

  const onStartParking = async () => {
    if (!vehicleNumber.trim()) {
      setError('Please enter the vehicle number');
      return;
    }
    if (!slotNumber.trim()) {
      setError('Please enter the slot number');
      return;
    }
    if (!parkingJobId) {
      setError('Please verify key tag first');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // Call completeParking API
      const response = await completeParking({
        parkingJobId: parkingJobId,
        vehicleNumber: vehicleNumber.trim(),
        slotNumber: slotNumber.trim(),
        locationDescription: remarks.trim() || undefined,
      });

      console.log('Parking completed successfully:', response);
      
      // Show success message and navigate back
      setDialog({
        visible: true,
        title: 'Success',
        message: `Thank you for parking at ${locationName}. Vehicle ${response.vehicleNumber} parked successfully!`,
        buttons: [{text: 'OK', onPress: () => navigation.goBack(), style: 'default'}],
      });
    } catch (error: any) {
      console.error('Failed to complete parking:', error);
      const errorMessage = error?.body?.message || error?.message || 'Failed to complete parking. Please try again.';
      setError(errorMessage);
      setDialog({
        visible: true,
        title: 'Error',
        message: errorMessage,
        buttons: [{text: 'OK', style: 'default'}],
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading screen while fetching in-progress booking
  if (initialLoading) {
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
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton color="#1f2937" useIcon={true} />
        <View style={styles.headerLogoContainer}>
          <Image source={urbaneaseLogo} style={styles.headerLogo} />
        </View>
        {/* Manual Park Toggle in Header */}
        <View style={styles.headerToggle}>
          <Text style={styles.headerToggleLabel}>Manual{'\n'}Park</Text>
          <Switch
            value={isManualPark}
            onValueChange={setIsManualPark}
            trackColor={{false: '#d1d5db', true: '#76D0E3'}}
            thumbColor={isManualPark ? '#3156D8' : '#f3f4f6'}
            style={styles.headerSwitch}
          />
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled">
          
          {/* Key Tag Code Input */}
          <View style={styles.inputContainer}>
            <LinearGradient
              colors={['#76D0E3', '#3156D8']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.inputIcon}>
              <Text style={styles.iconText}>UE</Text>
            </LinearGradient>
            <TextInput
              style={[
                styles.input,
                isManualPark && styles.inputFullRadius,
              ]}
              placeholder="00001"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={keyTagCode}
              onChangeText={text => {
                // Only allow numbers and limit to 5 digits
                const numericText = text.replace(/[^0-9]/g, '').slice(0, 5);
                setKeyTagCode(numericText);
              }}
              editable={isManualPark ? !keyTagVerified : !keyTagVerified}
              maxLength={5}
            />
            {!isManualPark && (
              <TouchableOpacity
                style={[
                  styles.submitArrow,
                  keyTagVerified && styles.submitArrowSuccess,
                ]}
                onPress={handleVerifyKeyTag}
                disabled={verifyingKeyTag || keyTagVerified || !keyTagCode.trim()}>
                {keyTagVerified ? (
                  <View style={styles.submitArrowSuccess}>
                    <Text style={styles.submitArrowText}>✓</Text>
                  </View>
                ) : (
                  <LinearGradient
                    colors={['#76D0E3', '#3156D8']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.submitArrowGradient}>
                    {verifyingKeyTag ? (
                      <Text style={styles.submitArrowText}>⏳</Text>
                    ) : (
                      <Image source={arrowRightIcon} style={styles.arrowIcon} />
                    )}
                  </LinearGradient>
                )}
              </TouchableOpacity>
            )}
          </View>

          {/* Customer Mobile Number Input (Manual Park Only) */}
          {isManualPark && (
            <View style={styles.inputContainer}>
              <LinearGradient
                colors={['#76D0E3', '#3156D8']}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 1}}
                style={styles.inputIcon}>
                <Text style={styles.iconText}>+91</Text>
              </LinearGradient>
              <TextInput
                style={styles.input}
                placeholder="Mobile Number"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                value={customerMobile}
                onChangeText={text => {
                  // Only allow numbers and limit to 10 digits
                  const numericText = text.replace(/[^0-9]/g, '').slice(0, 10);
                  setCustomerMobile(numericText);
                }}
                maxLength={10}
                editable={!keyTagVerified}
              />
              {!keyTagVerified && (
                <TouchableOpacity
                  style={[
                    styles.submitArrow,
                    submittingManual && styles.submitArrowDisabled,
                  ]}
                  onPress={handleManualBooking}
                  disabled={submittingManual || !keyTagCode.trim() || !customerMobile.trim()}>
                  <LinearGradient
                    colors={['#76D0E3', '#3156D8']}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 1}}
                    style={styles.submitArrowGradient}>
                    {submittingManual ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Image source={arrowRightIcon} style={styles.arrowIcon} />
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Vehicle Number Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.inputFull,
                !keyTagVerified && styles.inputDisabled,
              ]}
              placeholder="Vehicle Number"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              value={vehicleNumber}
              onChangeText={text => setVehicleNumber(text.toUpperCase())}
              editable={keyTagVerified}
            />
          </View>

          {/* Slot Number Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={[
                styles.inputFull,
                !keyTagVerified && styles.inputDisabled,
              ]}
              placeholder="Slot Number"
              placeholderTextColor="#9ca3af"
              value={slotNumber}
              onChangeText={setSlotNumber}
              editable={keyTagVerified}
            />
          </View>

          {/* Photo Cards */}
          <View style={styles.photoPreviewContainer}>
            {photos.map((photo, index) => (
              <View key={index} style={styles.photoPlaceholder}>
                <TouchableOpacity
                  style={styles.photoTouchable}
                  onPress={() => {
                    if (photo) {
                      setPreviewImage({visible: true, uri: photo.uri, index});
                    } else {
                      handleTakePhoto(index);
                    }
                  }}
                  disabled={!keyTagVerified}>
                  {photo ? (
                    <Image
                      source={{uri: photo.uri}}
                      style={styles.photoPreview}
                    />
                  ) : (
                    <View style={styles.photoEmpty}>
                      <Text style={styles.photoEmptyIcon}>📷</Text>
                      <Text style={styles.photoEmptyText}>
                        {index === 0 ? 'Image 1' : index === 1 ? 'Image 2' : 'Image 3'}
                      </Text>
                    </View>
                  )}
                  {uploadingPhotos && photo && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator size="small" color="#ffffff" />
                    </View>
                  )}
                </TouchableOpacity>
                {photo && (
                  <TouchableOpacity
                    style={styles.cancelIcon}
                    onPress={() => {
                      const newPhotos = [...photos];
                      newPhotos[index] = null;
                      setPhotos(newPhotos);
                    }}
                    activeOpacity={0.7}>
                    <Text style={styles.cancelIconText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>

          {/* Remarks Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.inputFull}
              placeholder="Remarks"
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              value={remarks}
              onChangeText={setRemarks}
            />
          </View>

          {/* Error Message */}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {/* PARKED Button */}
          <GradientButton
            onPress={onStartParking}
            disabled={submitting || !keyTagCode.trim() || !vehicleNumber.trim() || !slotNumber.trim()}>
            {submitting ? 'PARKING...' : 'PARKED'}
          </GradientButton>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Custom Dialog */}
      <CustomDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        buttons={dialog.buttons}
        onDismiss={() => setDialog({...dialog, visible: false})}
      />

      {/* Image Preview Modal */}
      <ImagePreviewModal
        visible={previewImage.visible}
        imageUri={previewImage.uri}
        onClose={() => setPreviewImage({visible: false, uri: null, index: null})}
        onRecapture={() => {
          if (previewImage.index !== null) {
            handleTakePhoto(previewImage.index);
          }
        }}
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
    paddingHorizontal: getResponsiveSpacing(20),
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.small,
  },
  headerLogoContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    height: verticalScale(40),
    width: moderateScale(150),
    resizeMode: 'contain',
  },
  headerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerToggleLabel: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: verticalScale(16),
  },
  headerSwitch: {
    transform: [{scaleX: 0.9}, {scaleY: 0.9}],
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: getResponsiveSpacing(20),
    paddingBottom: verticalScale(40),
  },
  inputContainer: {
    marginBottom: verticalScale(16),
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    width: moderateScale(60),
    height: verticalScale(56),
    borderTopLeftRadius: moderateScale(16),
    borderBottomLeftRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -1,
  },
  iconText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: COLORS.white,
  },
  input: {
    flex: 1,
    height: verticalScale(56),
    backgroundColor: COLORS.white,
    paddingHorizontal: getResponsiveSpacing(16),
    fontSize: getResponsiveFontSize(16),
    color: COLORS.textPrimary,
    ...SHADOWS.small,
  },
  inputFullRadius: {
    borderTopRightRadius: moderateScale(16),
    borderBottomRightRadius: moderateScale(16),
  },
  inputFull: {
    flex: 1,
    height: verticalScale(56),
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    paddingHorizontal: getResponsiveSpacing(16),
    fontSize: getResponsiveFontSize(16),
    color: COLORS.textPrimary,
    ...SHADOWS.small,
  },
  inputDisabled: {
    backgroundColor: COLORS.backgroundLight,
    color: COLORS.textSecondary,
  },
  submitArrow: {
    width: moderateScale(56),
    height: verticalScale(56),
    borderTopRightRadius: moderateScale(16),
    borderBottomRightRadius: moderateScale(16),
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -1,
    overflow: 'hidden',
  },
  submitArrowGradient: {
    width: moderateScale(56),
    height: verticalScale(56),
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitArrowSuccess: {
    backgroundColor: COLORS.success,
    width: moderateScale(56),
    height: verticalScale(56),
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitArrowText: {
    fontSize: getResponsiveFontSize(24),
    color: COLORS.white,
  },
  arrowIcon: {
    width: moderateScale(24),
    height: moderateScale(24),
    tintColor: COLORS.white,
  },
  photoPreviewContainer: {
    flexDirection: 'row',
    gap: moderateScale(12),
    marginBottom: verticalScale(20),
  },
  photoPlaceholder: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: moderateScale(16),
    overflow: 'visible',
    backgroundColor: COLORS.border,
    ...SHADOWS.small,
  },
  photoTouchable: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(16),
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  cancelIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  cancelIconText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  photoEmpty: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  photoEmptyIcon: {
    fontSize: getResponsiveFontSize(32),
    marginBottom: verticalScale(4),
  },
  photoEmptyText: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: moderateScale(16),
  },
  errorText: {
    color: COLORS.error,
    fontSize: getResponsiveFontSize(14),
    textAlign: 'center',
    marginBottom: verticalScale(12),
  },
  submitArrowDisabled: {
    opacity: 0.5,
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
});
