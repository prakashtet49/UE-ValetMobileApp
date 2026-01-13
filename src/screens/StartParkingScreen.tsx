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
  Modal,
} from 'react-native';
import {moderateScale, verticalScale, getResponsiveFontSize, getResponsiveSpacing} from '../utils/responsive';
import {useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp, NativeStackScreenProps} from '@react-navigation/native-stack';
import {launchCamera} from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import Video from 'react-native-video';
import {startParking, uploadParkingPhotos, completeParking, startManualBooking} from '../api/parking';
import type {AppStackParamList} from '../navigation/AppNavigator';
import BackButton from '../components/BackButton';
import GradientButton from '../components/GradientButton';
import CustomDialog from '../components/CustomDialog';
import {COLORS, SHADOWS} from '../constants/theme';
import {stampImageWithWatermarkAndTimestamp} from '../utils/imageStamp';
import ImagePreviewModal from '../components/ImagePreviewModal';

const urbaneaseLogo = require('../assets/icons/urbanease-logo.png');
const arrowRightIcon = require('../assets/icons/arrow-right.png');

type StartParkingScreenProps = NativeStackScreenProps<AppStackParamList, 'StartParking'>;

export default function StartParkingScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const route = useRoute<StartParkingScreenProps['route']>();
  
  // Get params from route (if navigated from InProgressJobsScreen)
  const params = route.params;
  
  const [keyTagCode, setKeyTagCode] = useState(params?.keyTagCode || '');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [slotNumber, setSlotNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [photos, setPhotos] = useState<Array<{uri: string; name: string; type: string}>>([]);
  const [video, setVideo] = useState<{uri: string; name: string; type: string} | null>(null);
  const [uploadingPhotoIndex, setUploadingPhotoIndex] = useState<number | null>(null);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [showImagesViewer, setShowImagesViewer] = useState(false);
  const [showVideoViewer, setShowVideoViewer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifyingKeyTag, setVerifyingKeyTag] = useState(false);
  const [keyTagVerified, setKeyTagVerified] = useState(params?.keyTagCode ? true : false);
  const [parkingJobId, setParkingJobId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  // Set manual park mode based on source:
  // - If source is "manual", enable manual park (toggle ON/green)
  // - If keyTagCode exists and source is not "manual", disable manual park (key tag flow)
  // - Otherwise, default to manual park
  const [isManualPark, setIsManualPark] = useState(
    params?.source === 'manual' ? true : (!params?.keyTagCode)
  );
  const [customerMobile, setCustomerMobile] = useState(params?.customerPhone || '');
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

  const handleCaptureImages = async () => {
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
        const newPhoto = {
          uri: stampedUri,
          name: asset.fileName || `photo_${photos.length}.jpg`,
          type: asset.type || 'image/jpeg',
        };
        const updatedPhotos = [...photos, newPhoto];
        setPhotos(updatedPhotos);

        // Upload photo immediately
        await uploadPhoto(photos.length, newPhoto);
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

  const handleCaptureVideo = async () => {
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
        message: 'Camera permission is required to record video. Please enable it in your device settings.',
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
        mediaType: 'video',
        cameraType: 'back',
        videoQuality: 'medium',
        durationLimit: 30, // 30 seconds max
      });

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        setDialog({
          visible: true,
          title: 'Error',
          message: result.errorMessage || 'Failed to capture video',
          buttons: [{text: 'OK', style: 'default'}],
        });
        return;
      }

      if (result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const videoData = {
          uri: asset.uri || '',
          name: asset.fileName || 'video.mp4',
          type: asset.type || 'video/mp4',
        };
        setVideo(videoData);

        // Upload video immediately
        await uploadVideo(videoData);
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

  const uploadPhoto = async (index: number, photo: {uri: string; name: string; type: string}) => {
    if (!parkingJobId) return;

    setUploadingPhotoIndex(index);
    try {
      const photoKeys = ['frontPhoto', 'backPhoto', 'damagePhoto'] as const;
      const photoKey = photoKeys[Math.min(index, 2)];
      const photoData = {
        [photoKey]: photo,
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
      setUploadingPhotoIndex(null);
    }
  };

  const uploadVideo = async (videoData: {uri: string; name: string; type: string}) => {
    if (!parkingJobId) return;

    setUploadingVideo(true);
    try {
      // Upload video using the video option (not damagePhoto)
      await uploadParkingPhotos(parkingJobId, {video: videoData});
    } catch (error) {
      console.error('Failed to upload video:', error);
      setDialog({
        visible: true,
        title: 'Upload Failed',
        message: 'Failed to upload video. Please try again.',
        buttons: [{text: 'OK', style: 'default'}],
      });
    } finally {
      setUploadingVideo(false);
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

  // Auto-verify key tag when navigating from InProgressJobsScreen with params
  useEffect(() => {
    // Only auto-verify if:
    // 1. keyTagCode exists in params (navigated from InProgress)
    // 2. parkingJobId is not set (not already verified)
    // 3. Not currently verifying
    // 4. keyTagCode is not empty
    if (params?.keyTagCode && !parkingJobId && !verifyingKeyTag && keyTagCode.trim()) {
      console.log('[StartParking] Auto-verifying key tag from params:', params.keyTagCode);
      handleVerifyKeyTag();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.keyTagCode]); // Only run when params change (on mount or navigation)

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

          {/* Media Capture Cards */}
          <View style={styles.photoPreviewContainer}>
            {/* Images Box */}
            <View style={styles.mediaPlaceholder}>
              <TouchableOpacity
                style={styles.mediaTouchable}
                onPress={handleCaptureImages}
                disabled={!keyTagVerified}>
                <View style={styles.mediaEmpty}>
                  <Text style={styles.mediaEmptyIcon}>📷</Text>
                  <Text style={styles.mediaEmptyText}>Capture Images</Text>
                  {photos.length > 0 && (
                    <Text style={styles.mediaCount}>{photos.length} image{photos.length > 1 ? 's' : ''}</Text>
                  )}
                </View>
                {uploadingPhotoIndex !== null && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
              {photos.length > 0 && (
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => setShowImagesViewer(true)}
                  activeOpacity={0.7}>
                  <Text style={styles.viewButtonText}>View</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Video Box */}
            <View style={styles.mediaPlaceholder}>
              <TouchableOpacity
                style={styles.mediaTouchable}
                onPress={handleCaptureVideo}
                disabled={!keyTagVerified || video !== null}>
                <View style={styles.mediaEmpty}>
                  <Text style={styles.mediaEmptyIcon}>🎥</Text>
                  <Text style={styles.mediaEmptyText}>Capture Video</Text>
                  {video && (
                    <Text style={styles.mediaCount}>1 video</Text>
                  )}
                </View>
                {uploadingVideo && (
                  <View style={styles.uploadingOverlay}>
                    <ActivityIndicator size="small" color="#ffffff" />
                  </View>
                )}
              </TouchableOpacity>
              {video && (
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => setShowVideoViewer(true)}
                  activeOpacity={0.7}>
                  <Text style={styles.viewButtonText}>View</Text>
                </TouchableOpacity>
              )}
            </View>
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

      {/* Images Viewer Modal */}
      <Modal
        visible={showImagesViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImagesViewer(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Captured Images ({photos.length})</Text>
              <TouchableOpacity onPress={() => setShowImagesViewer(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScroll}>
              {photos.map((photo, index) => (
                <View key={index} style={styles.imagePreviewItem}>
                  <Image source={{uri: photo.uri}} style={styles.imagePreviewFull} />
                  <TouchableOpacity
                    style={styles.deleteImageButton}
                    onPress={() => {
                      setDialog({
                        visible: true,
                        title: 'Delete Image',
                        message: 'Are you sure you want to delete this image?',
                        buttons: [
                          {text: 'Cancel', style: 'cancel'},
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => {
                              const newPhotos = photos.filter((_, i) => i !== index);
                              setPhotos(newPhotos);
                              if (newPhotos.length === 0) {
                                setShowImagesViewer(false);
                              }
                            }
                          }
                        ],
                      });
                    }}>
                    <Text style={styles.deleteImageButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.captureMoreButton}
              onPress={() => {
                setShowImagesViewer(false);
                setTimeout(() => handleCaptureImages(), 300);
              }}>
              <Text style={styles.captureMoreButtonText}>Capture More</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Video Viewer Modal */}
      <Modal
        visible={showVideoViewer}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowVideoViewer(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Captured Video</Text>
              <TouchableOpacity onPress={() => setShowVideoViewer(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.videoPreviewContainer}>
              {video && (
                <Video
                  source={{uri: video.uri}}
                  style={styles.videoPlayer}
                  controls={true}
                  resizeMode="contain"
                  paused={false}
                />
              )}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.deleteVideoButton}
                onPress={() => {
                  setDialog({
                    visible: true,
                    title: 'Delete Video',
                    message: 'Are you sure you want to delete this video?',
                    buttons: [
                      {text: 'Cancel', style: 'cancel'},
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: () => {
                          setVideo(null);
                          setShowVideoViewer(false);
                        }
                      }
                    ],
                  });
                }}>
                <Text style={styles.deleteVideoButtonText}>Delete Video</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  mediaPlaceholder: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: moderateScale(16),
    overflow: 'visible',
    backgroundColor: COLORS.border,
    ...SHADOWS.small,
  },
  mediaTouchable: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(16),
    overflow: 'hidden',
  },
  mediaEmpty: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  mediaEmptyIcon: {
    fontSize: getResponsiveFontSize(32),
    marginBottom: verticalScale(4),
  },
  mediaEmptyText: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  mediaCount: {
    fontSize: getResponsiveFontSize(10),
    fontWeight: '500',
    color: COLORS.gradientEnd,
    marginTop: verticalScale(4),
  },
  viewButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: COLORS.gradientEnd,
    paddingHorizontal: moderateScale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(8),
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  viewButtonText: {
    color: '#ffffff',
    fontSize: getResponsiveFontSize(11),
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSpacing(20),
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    width: '100%',
    maxHeight: '80%',
    ...SHADOWS.large,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getResponsiveSpacing(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  modalCloseButton: {
    fontSize: getResponsiveFontSize(24),
    color: COLORS.textSecondary,
    fontWeight: '300',
  },
  modalScroll: {
    maxHeight: moderateScale(400),
  },
  imagePreviewItem: {
    marginBottom: verticalScale(16),
    padding: getResponsiveSpacing(12),
  },
  imagePreviewFull: {
    width: '100%',
    height: moderateScale(250),
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(8),
  },
  deleteImageButton: {
    backgroundColor: '#ef4444',
    padding: getResponsiveSpacing(8),
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
  deleteImageButtonText: {
    color: '#ffffff',
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
  },
  captureMoreButton: {
    backgroundColor: COLORS.gradientEnd,
    padding: getResponsiveSpacing(14),
    margin: getResponsiveSpacing(16),
    borderRadius: moderateScale(12),
    alignItems: 'center',
  },
  captureMoreButtonText: {
    color: '#ffffff',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
  },
  videoPreviewContainer: {
    padding: getResponsiveSpacing(16),
    alignItems: 'center',
    minHeight: moderateScale(300),
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  videoPlayer: {
    width: '100%',
    height: moderateScale(300),
  },
  videoPlaceholder: {
    fontSize: getResponsiveFontSize(48),
    marginBottom: verticalScale(12),
  },
  videoInfo: {
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textSecondary,
  },
  modalActions: {
    padding: getResponsiveSpacing(16),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  deleteVideoButton: {
    backgroundColor: '#ef4444',
    padding: getResponsiveSpacing(12),
    borderRadius: moderateScale(12),
    alignItems: 'center',
  },
  deleteVideoButtonText: {
    color: '#ffffff',
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
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
