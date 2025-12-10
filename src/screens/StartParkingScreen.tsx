import React, {useState} from 'react';
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
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {launchCamera} from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import {startParking, uploadParkingPhotos, completeParking} from '../api/parking';
import type {AppStackParamList} from '../navigation/AppNavigator';
import BackButton from '../components/BackButton';
import GradientButton from '../components/GradientButton';
import CustomDialog from '../components/CustomDialog';
import {COLORS, SHADOWS} from '../constants/theme';

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
  const [error, setError] = useState<string | null>(null);
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
        const newPhotos = [...photos];
        newPhotos[index] = {
          uri: asset.uri || '',
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

  const handleAddPhotos = () => {
    if (!keyTagVerified) {
      setDialog({
        visible: true,
        title: 'Info',
        message: 'Please verify key tag first before adding photos',
        buttons: [{text: 'OK', style: 'default'}],
      });
      return;
    }
    // Find first empty slot
    const emptyIndex = photos.findIndex(p => p === null);
    if (emptyIndex !== -1) {
      handleTakePhoto(emptyIndex);
    } else {
      setDialog({
        visible: true,
        title: 'Info',
        message: 'All photo slots are filled. Click on a photo to replace it.',
        buttons: [{text: 'OK', style: 'default'}],
      });
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
      const response = await startParking(keyTagCode.trim());
      setParkingJobId(response.parkingJobId);
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
        message: `Vehicle ${response.vehicleNumber} parked successfully in ${response.slotOrZone}!`,
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton color="#1f2937" useIcon={true} />
        <View style={styles.headerLogoContainer}>
          <Image source={urbaneaseLogo} style={styles.headerLogo} />
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
              style={styles.input}
              placeholder="Key Tag Code"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
              value={keyTagCode}
              onChangeText={text => setKeyTagCode(text.toUpperCase())}
              editable={!keyTagVerified}
            />
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
          </View>

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

          {/* Add Photos Button */}
          <TouchableOpacity
            style={styles.photoButton}
            onPress={handleAddPhotos}>
            <LinearGradient
              colors={['#76D0E3', '#3156D8']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.photoIconContainer}>
              <Text style={styles.photoIcon}>📷</Text>
            </LinearGradient>
            <Text style={styles.photoButtonText}>Add Photos</Text>
          </TouchableOpacity>

          {/* Photo Preview */}
          <View style={styles.photoPreviewContainer}>
            {photos.map((photo, index) => (
              <TouchableOpacity
                key={index}
                style={styles.photoPlaceholder}
                onPress={() => handleTakePhoto(index)}
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
  content: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  inputContainer: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    width: 60,
    height: 56,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: -1,
  },
  iconText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  input: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
    ...SHADOWS.small,
  },
  inputFull: {
    flex: 1,
    height: 56,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
    ...SHADOWS.small,
  },
  inputDisabled: {
    backgroundColor: COLORS.backgroundLight,
    color: COLORS.textSecondary,
  },
  submitArrow: {
    width: 56,
    height: 56,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -1,
    overflow: 'hidden',
  },
  submitArrowGradient: {
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitArrowSuccess: {
    backgroundColor: COLORS.success,
    width: 56,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitArrowText: {
    fontSize: 24,
    color: COLORS.white,
  },
  arrowIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.white,
  },
  photoButton: {
    alignItems: 'center',
    marginVertical: 24,
  },
  photoIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    ...SHADOWS.medium,
  },
  photoIcon: {
    fontSize: 48,
  },
  photoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gradientEnd,
  },
  photoPreviewContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  photoPlaceholder: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: COLORS.border,
    ...SHADOWS.small,
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  photoEmpty: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  photoEmptyIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  photoEmptyText: {
    fontSize: 12,
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
    borderRadius: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
});
