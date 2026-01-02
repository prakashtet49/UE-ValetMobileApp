import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {completeParking, uploadParkingPhotos} from '../api/parking';
import {sendParkingConfirmation} from '../api/whatsapp';
import type {AppStackParamList} from '../navigation/AppNavigator';
import {stampImageWithWatermarkAndTimestamp} from '../utils/imageStamp';
import ImagePreviewModal from '../components/ImagePreviewModal';

export type ParkVehicleScreenProps = NativeStackScreenProps<
  AppStackParamList,
  'ParkVehicle'
>;

export default function ParkVehicleScreen({route}: ParkVehicleScreenProps) {
  const {parkingJobId, keyTagCode} = route.params;
  const navigation = useNavigation();
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [slotNumber, setSlotNumber] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [frontPhotoUri, setFrontPhotoUri] = useState<string | null>(null);
  const [backPhotoUri, setBackPhotoUri] = useState<string | null>(null);
  const [damagePhotoUri, setDamagePhotoUri] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{visible: boolean; uri: string | null; photoType: 'front' | 'back' | 'damage' | null}>({
    visible: false,
    uri: null,
    photoType: null,
  });

  const pickImage = async (
    which: 'front' | 'back' | 'damage',
    source: 'camera' | 'library',
  ) => {
    try {
      const fn = source === 'camera' ? launchCamera : launchImageLibrary;
      const result = await fn({mediaType: 'photo', quality: 0.7});
      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }
      const asset = result.assets[0];
      if (!asset.uri) {
        return;
      }

      const originalUri = asset.uri;
      const stampedUri = await stampImageWithWatermarkAndTimestamp(originalUri);
      console.log('[ParkVehicle] Selected photo', {which, uri: stampedUri});

      if (which === 'front') {
        setFrontPhotoUri(stampedUri);
      } else if (which === 'back') {
        setBackPhotoUri(stampedUri);
      } else {
        setDamagePhotoUri(stampedUri);
      }
    } catch (error) {
      console.error('[ParkVehicle] Failed to select photo', {which, source, error});
    }
  };

  const onCompleteParking = async () => {
    if (!vehicleNumber.trim()) {
      setErrorMessage('Please enter the vehicle number to mark as parked.');
      return;
    }
    setSubmitting(true);
    setSuccessMessage(null);
    setErrorMessage(null);
    try {
      const response = await completeParking({
        parkingJobId,
        vehicleNumber: vehicleNumber.trim(),
        slotNumber: slotNumber.trim() || undefined,
        locationDescription: locationDescription.trim() || undefined,
      });

      setFinished(true);
      setSuccessMessage(
        `Vehicle ${response.vehicleNumber} parked at ${response.slotOrZone} for tag ${response.keyTagCode}.`,
      );

      // Upload photos if any were captured/selected
      if (frontPhotoUri || backPhotoUri || damagePhotoUri) {
        try {
          console.log('[ParkVehicle] Uploading parking photos', {
            parkingJobId: response.parkingJobId,
            front: !!frontPhotoUri,
            back: !!backPhotoUri,
            damage: !!damagePhotoUri,
          });

          await uploadParkingPhotos(response.parkingJobId, {
            frontPhoto: frontPhotoUri
              ? {
                  uri: frontPhotoUri,
                  name: 'front.jpg',
                  type: 'image/jpeg',
                }
              : undefined,
            backPhoto: backPhotoUri
              ? {
                  uri: backPhotoUri,
                  name: 'back.jpg',
                  type: 'image/jpeg',
                }
              : undefined,
            damagePhoto: damagePhotoUri
              ? {
                  uri: damagePhotoUri,
                  name: 'damage.jpg',
                  type: 'image/jpeg',
                }
              : undefined,
          });
        } catch (error) {
          console.error('[ParkVehicle] Failed to upload parking photos', error);
        }
      }

      // Optional: trigger WhatsApp parking confirmation through backend template API
      try {
        await sendParkingConfirmation({
          bookingId: response.parkingJobId,
          customerPhone: '',
          vehicleNumber: response.vehicleNumber,
          locationName: response.slotOrZone,
          parkedAtTime: response.parkedAt,
        });
      } catch (error) {
        console.error('Failed to send parking confirmation template', error);
      }
    } catch (error) {
      console.error('Failed to complete parking job', error);
      setErrorMessage('Failed to complete parking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Park Vehicle</Text>
        <Text style={styles.subtitle}>Key tag: {keyTagCode}</Text>

        <Text style={styles.label}>Vehicle number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., DL-01-AB-1234"
          placeholderTextColor="#6b7280"
          autoCapitalize="characters"
          value={vehicleNumber}
          onChangeText={text => setVehicleNumber(text.toUpperCase())}
        />

        <Text style={styles.label}>Slot number (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., B2-14"
          placeholderTextColor="#6b7280"
          value={slotNumber}
          onChangeText={setSlotNumber}
        />

        <Text style={styles.label}>Location description (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Near pillar B2, basement"
          placeholderTextColor="#6b7280"
          value={locationDescription}
          onChangeText={setLocationDescription}
        />

        <Text style={styles.label}>Notes (driver only, optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Any extra notes about vehicle condition or location"
          placeholderTextColor="#6b7280"
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        <Text style={[styles.label, {marginTop: 8}]}>Vehicle photos (optional)</Text>
        <View style={styles.photoRow}>
          <View style={styles.photoColumn}>
            <Text style={styles.photoLabel}>Front</Text>
            <View style={styles.photoThumbnailContainer}>
              {frontPhotoUri ? (
                <TouchableOpacity
                  style={styles.photoThumbnail}
                  onPress={() => setPreviewImage({visible: true, uri: frontPhotoUri, photoType: 'front'})}>
                  <Image source={{uri: frontPhotoUri}} style={styles.photoThumbnailImage} />
                  <TouchableOpacity
                    style={styles.cancelIcon}
                    onPress={() => setFrontPhotoUri(null)}
                    activeOpacity={0.7}>
                    <Text style={styles.cancelIconText}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ) : (
                <View style={styles.photoEmpty}>
                  <Text style={styles.photoEmptyIcon}>📷</Text>
                </View>
              )}
            </View>
            <View style={styles.photoActionsRow}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => pickImage('front', 'camera')}>
                <Text style={styles.photoButtonText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoButtonSecondary}
                onPress={() => pickImage('front', 'library')}>
                <Text style={styles.photoButtonSecondaryText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.photoColumn}>
            <Text style={styles.photoLabel}>Back</Text>
            <View style={styles.photoThumbnailContainer}>
              {backPhotoUri ? (
                <TouchableOpacity
                  style={styles.photoThumbnail}
                  onPress={() => setPreviewImage({visible: true, uri: backPhotoUri, photoType: 'back'})}>
                  <Image source={{uri: backPhotoUri}} style={styles.photoThumbnailImage} />
                  <TouchableOpacity
                    style={styles.cancelIcon}
                    onPress={() => setBackPhotoUri(null)}
                    activeOpacity={0.7}>
                    <Text style={styles.cancelIconText}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ) : (
                <View style={styles.photoEmpty}>
                  <Text style={styles.photoEmptyIcon}>📷</Text>
                </View>
              )}
            </View>
            <View style={styles.photoActionsRow}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => pickImage('back', 'camera')}>
                <Text style={styles.photoButtonText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoButtonSecondary}
                onPress={() => pickImage('back', 'library')}>
                <Text style={styles.photoButtonSecondaryText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.photoRowBottom}>
          <View style={styles.photoColumnWide}>
            <Text style={styles.photoLabel}>Damage (if any)</Text>
            <View style={styles.photoThumbnailContainer}>
              {damagePhotoUri ? (
                <TouchableOpacity
                  style={styles.photoThumbnail}
                  onPress={() => setPreviewImage({visible: true, uri: damagePhotoUri, photoType: 'damage'})}>
                  <Image source={{uri: damagePhotoUri}} style={styles.photoThumbnailImage} />
                  <TouchableOpacity
                    style={styles.cancelIcon}
                    onPress={() => setDamagePhotoUri(null)}
                    activeOpacity={0.7}>
                    <Text style={styles.cancelIconText}>✕</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ) : (
                <View style={styles.photoEmpty}>
                  <Text style={styles.photoEmptyIcon}>📷</Text>
                </View>
              )}
            </View>
            <View style={styles.photoActionsRow}>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => pickImage('damage', 'camera')}>
                <Text style={styles.photoButtonText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoButtonSecondary}
                onPress={() => pickImage('damage', 'library')}>
                <Text style={styles.photoButtonSecondaryText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={onCompleteParking}
          disabled={submitting || finished || !vehicleNumber.trim()}>
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Saving...' : finished ? 'Completed' : 'Mark as Parked'}
          </Text>
        </TouchableOpacity>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}
        {successMessage ? (
          <Text style={styles.successText}>{successMessage}</Text>
        ) : null}
      </ScrollView>

      <ImagePreviewModal
        visible={previewImage.visible}
        imageUri={previewImage.uri}
        onClose={() => setPreviewImage({visible: false, uri: null, photoType: null})}
        onRecapture={() => {
          if (previewImage.photoType) {
            pickImage(previewImage.photoType, 'camera');
          }
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
  },
  inner: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 14,
    color: '#a1a1aa',
    marginBottom: 24,
  },
  label: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
  input: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    marginBottom: 16,
    color: '#ffffff',
    backgroundColor: '#09090b',
  },
  notesInput: {
    height: 96,
    textAlignVertical: 'top',
  },
  primaryButton: {
    height: 48,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 16,
    color: '#fecaca',
    fontSize: 14,
  },
  successText: {
    marginTop: 16,
    color: '#bbf7d0',
    fontSize: 14,
  },
  secondaryButton: {
    marginTop: 12,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '500',
  },
  photoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  photoRowBottom: {
    marginTop: 12,
  },
  photoColumn: {
    flex: 1,
    marginRight: 8,
  },
  photoColumnWide: {
    flex: 1,
  },
  photoLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 4,
  },
  photoActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButtonText: {
    color: '#f9fafb',
    fontSize: 12,
    fontWeight: '600',
  },
  photoButtonSecondary: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButtonSecondaryText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '500',
  },
  photoStatusText: {
    marginTop: 4,
    fontSize: 11,
    color: '#bbf7d0',
  },
  photoStatusTextMuted: {
    marginTop: 4,
    fontSize: 11,
    color: '#6b7280',
  },
  photoThumbnailContainer: {
    marginBottom: 8,
  },
  photoThumbnail: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'visible',
    position: 'relative',
  },
  photoThumbnailImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
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
    aspectRatio: 1,
    borderRadius: 8,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  photoEmptyIcon: {
    fontSize: 32,
  },
});
