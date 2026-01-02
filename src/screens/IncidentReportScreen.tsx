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
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import type {AppStackParamList} from '../navigation/AppNavigator';
import {stampImageWithWatermarkAndTimestamp} from '../utils/imageStamp';
import ImagePreviewModal from '../components/ImagePreviewModal';

// Generic incident report that can be opened from parking or pickup flows.
// It currently just logs the payload; backend wiring can be added once the API is final.

type IncidentRouteProp = RouteProp<AppStackParamList, 'IncidentReport'>;

export default function IncidentReportScreen() {
  const route = useRoute<IncidentRouteProp>();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {contextType, contextId, vehicleNumber, keyTagCode} = route.params;

  const [category, setCategory] = useState('Damage');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<{visible: boolean; uri: string | null}>({
    visible: false,
    uri: null,
  });

  const pickImage = async (source: 'camera' | 'library') => {
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
      const stampedUri = await stampImageWithWatermarkAndTimestamp(asset.uri);
      console.log('[IncidentReport] Selected photo', {uri: stampedUri});
      setPhotoUri(stampedUri);
    } catch (e) {
      console.error('[IncidentReport] Failed to select photo', e);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Please describe the incident before submitting.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);
      console.log('[IncidentReport] Submitting incident', {
        contextType,
        contextId,
        vehicleNumber,
        keyTagCode,
        category,
        description,
        photoUri,
      });
      // TODO: wire to real incident-report API once available
      setSuccess('Incident recorded for internal review.');
    } catch (e) {
      console.error('[IncidentReport] Failed to submit incident', e);
      setError('Failed to submit incident. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner}>
        <Text style={styles.title}>Report incident</Text>
        <Text style={styles.subtitle}>
          Use this to log damage, complaints, or any other issues for this job.
        </Text>

        <View style={styles.contextPillRow}>
          <Text style={styles.contextPill}>{contextType.toUpperCase()}</Text>
          {vehicleNumber ? (
            <Text style={styles.contextMeta}>Vehicle: {vehicleNumber}</Text>
          ) : null}
          {keyTagCode ? (
            <Text style={styles.contextMeta}>Tag: {keyTagCode}</Text>
          ) : null}
        </View>

        <Text style={styles.label}>Category</Text>
        <View style={styles.categoryRow}>
          {['Damage', 'Guest complaint', 'Delay', 'Other'].map(option => {
            const selected = category === option;
            return (
              <TouchableOpacity
                key={option}
                style={selected ? styles.chipSelected : styles.chip}
                onPress={() => setCategory(option)}>
                <Text
                  style={
                    selected ? styles.chipTextSelected : styles.chipText
                  }>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Describe what happened, including any guest comments."
          placeholderTextColor="#6b7280"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Photo (optional)</Text>
        <View style={styles.photoThumbnailContainer}>
          {photoUri ? (
            <TouchableOpacity
              style={styles.photoThumbnail}
              onPress={() => setPreviewImage({visible: true, uri: photoUri})}>
              <Image source={{uri: photoUri}} style={styles.photoThumbnailImage} />
              <TouchableOpacity
                style={styles.cancelIcon}
                onPress={() => setPhotoUri(null)}
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
        <View style={styles.photoRow}>
          <TouchableOpacity
            style={styles.photoButton}
            onPress={() => pickImage('camera')}>
            <Text style={styles.photoButtonText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.photoButtonSecondary}
            onPress={() => pickImage('library')}>
            <Text style={styles.photoButtonSecondaryText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSubmit}
          disabled={submitting || !description.trim()}>
          <Text style={styles.primaryButtonText}>
            {submitting ? 'Submitting...' : 'Submit incident'}
          </Text>
        </TouchableOpacity>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>

      <ImagePreviewModal
        visible={previewImage.visible}
        imageUri={previewImage.uri}
        onClose={() => setPreviewImage({visible: false, uri: null})}
        onRecapture={() => pickImage('camera')}
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
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 16,
  },
  contextPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  contextPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#1d4ed8',
    color: '#dbeafe',
    fontSize: 11,
    fontWeight: '600',
  },
  contextMeta: {
    fontSize: 12,
    color: '#e5e7eb',
  },
  label: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  chipSelected: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#4f46e5',
  },
  chipText: {
    fontSize: 12,
    color: '#e5e7eb',
  },
  chipTextSelected: {
    fontSize: 12,
    color: '#f9fafb',
    fontWeight: '600',
  },
  descriptionInput: {
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#27272a',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    color: '#ffffff',
    backgroundColor: '#09090b',
    textAlignVertical: 'top',
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
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
    marginBottom: 16,
    fontSize: 11,
    color: '#bbf7d0',
  },
  photoStatusTextMuted: {
    marginBottom: 16,
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
    height: 48,
    borderRadius: 8,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 8,
    color: '#fecaca',
    fontSize: 13,
  },
  successText: {
    marginTop: 8,
    color: '#bbf7d0',
    fontSize: 13,
  },
  secondaryButton: {
    marginTop: 16,
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
});
