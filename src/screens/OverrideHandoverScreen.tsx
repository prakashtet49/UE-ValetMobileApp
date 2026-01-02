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
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {AppStackParamList} from '../navigation/AppNavigator';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {stampImageWithWatermarkAndTimestamp} from '../utils/imageStamp';
import ImagePreviewModal from '../components/ImagePreviewModal';

const OVERRIDE_REASONS = [
  'Guest lost phone',
  'Elderly / assistance needed',
  'Technical issue',
  'Emergency',
  'Other',
] as const;

type OverrideRouteProp = RouteProp<AppStackParamList, 'OverrideHandover'>;

export default function OverrideHandoverScreen() {
  const route = useRoute<OverrideRouteProp>();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {pickupJobId} = route.params;

  const [selectedReason, setSelectedReason] = useState<
    (typeof OVERRIDE_REASONS)[number] | null
  >(null);
  const [notes, setNotes] = useState('');
  const [beforePhotoUri, setBeforePhotoUri] = useState<string | null>(null);
  const [handoverPhotoUri, setHandoverPhotoUri] = useState<string | null>(null);
  const [damagePhotoUri, setDamagePhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<{visible: boolean; uri: string | null; photoType: 'before' | 'handover' | 'damage' | null}>({
    visible: false,
    uri: null,
    photoType: null,
  });

  const pickImage = async (
    which: 'before' | 'handover' | 'damage',
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
      console.log('[OverrideHandover] Selected photo', {which, uri: stampedUri});

      if (which === 'before') {
        setBeforePhotoUri(stampedUri);
      } else if (which === 'handover') {
        setHandoverPhotoUri(stampedUri);
      } else {
        setDamagePhotoUri(stampedUri);
      }
    } catch (error) {
      console.error('[OverrideHandover] Failed to select photo', {
        which,
        source,
        error,
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedReason) {
      return;
    }
    try {
      setSubmitting(true);
      console.log('[OverrideHandover] Submitting override', {
        pickupJobId,
        selectedReason,
        notes,
        beforePhotoUri,
        handoverPhotoUri,
        damagePhotoUri,
      });
      // TODO: wire to real override API once available
      navigation.replace('HandoverConfirmation', {pickupJobId});
    } catch (e) {
      console.error('[OverrideHandover] Failed to submit override', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Override handover</Text>
        <Text style={styles.subtitle}>
          Use this when the guest cannot show their reference number or in
          special cases. Provide a clear reason and notes.
        </Text>

        <Text style={styles.sectionTitle}>Reason</Text>
        <View style={styles.reasonsList}>
          {OVERRIDE_REASONS.map(reason => {
            const selected = selectedReason === reason;
            return (
              <TouchableOpacity
                key={reason}
                style={selected ? styles.reasonChipSelected : styles.reasonChip}
                onPress={() => setSelectedReason(reason)}>
                <Text
                  style={
                    selected
                      ? styles.reasonChipTextSelected
                      : styles.reasonChipText
                  }>
                  {reason}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Describe why override was used and any important details"
          placeholderTextColor="#6b7280"
          multiline
          value={notes}
          onChangeText={setNotes}
        />

        <Text style={styles.sectionTitle}>Photos (optional)</Text>

        <View style={styles.photoBlock}>
          <Text style={styles.photoLabel}>Before pickup</Text>
          <View style={styles.photoThumbnailContainer}>
            {beforePhotoUri ? (
              <TouchableOpacity
                style={styles.photoThumbnail}
                onPress={() => setPreviewImage({visible: true, uri: beforePhotoUri, photoType: 'before'})}>
                <Image source={{uri: beforePhotoUri}} style={styles.photoThumbnailImage} />
                <TouchableOpacity
                  style={styles.cancelIcon}
                  onPress={() => setBeforePhotoUri(null)}
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
              onPress={() => pickImage('before', 'camera')}>
              <Text style={styles.photoButtonText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoButtonSecondary}
              onPress={() => pickImage('before', 'library')}>
              <Text style={styles.photoButtonSecondaryText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.photoBlock}>
          <Text style={styles.photoLabel}>Handover</Text>
          <View style={styles.photoThumbnailContainer}>
            {handoverPhotoUri ? (
              <TouchableOpacity
                style={styles.photoThumbnail}
                onPress={() => setPreviewImage({visible: true, uri: handoverPhotoUri, photoType: 'handover'})}>
                <Image source={{uri: handoverPhotoUri}} style={styles.photoThumbnailImage} />
                <TouchableOpacity
                  style={styles.cancelIcon}
                  onPress={() => setHandoverPhotoUri(null)}
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
              onPress={() => pickImage('handover', 'camera')}>
              <Text style={styles.photoButtonText}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoButtonSecondary}
              onPress={() => pickImage('handover', 'library')}>
              <Text style={styles.photoButtonSecondaryText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.photoBlock}>
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

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSubmit}
          disabled={submitting || !selectedReason}>
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Submitting...' : 'Submit override & complete'}
          </Text>
        </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e5e7eb',
    marginTop: 12,
    marginBottom: 6,
  },
  reasonsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  reasonChipSelected: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#4f46e5',
    borderWidth: 0,
  },
  reasonChipText: {
    color: '#e5e7eb',
    fontSize: 12,
  },
  reasonChipTextSelected: {
    color: '#f9fafb',
    fontSize: 12,
    fontWeight: '600',
  },
  notesInput: {
    minHeight: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffffff',
    backgroundColor: '#09090b',
    textAlignVertical: 'top',
  },
  photoBlock: {
    marginTop: 10,
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
  primaryButton: {
    marginTop: 20,
    height: 48,
    borderRadius: 999,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#022c22',
    fontSize: 15,
    fontWeight: '600',
  },
});
