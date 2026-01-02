import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import type {AppStackParamList} from '../navigation/AppNavigator';
import {getPickupJobDetails, updatePickupStatus} from '../api/pickup';
import {stampImageWithWatermarkAndTimestamp} from '../utils/imageStamp';
import ImagePreviewModal from '../components/ImagePreviewModal';

// We don't have a detailed type from Swagger yet, so keep it loose but logged.
type PickupJobDetail = any;

type PickupDetailRouteProp = RouteProp<AppStackParamList, 'PickupDetail'>;

export default function PickupDetailScreen() {
  const route = useRoute<PickupDetailRouteProp>();
  const navigation =
    useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const {pickupJobId} = route.params;

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<PickupJobDetail | null>(null);
  const [updating, setUpdating] = useState<
    'PICKUP_STARTED' | 'VEHICLE_PICKED_UP' | 'DELIVERED' | null
  >(null);
  const [beforePhotoUri, setBeforePhotoUri] = useState<string | null>(null);
  const [handoverPhotoUri, setHandoverPhotoUri] = useState<string | null>(null);
  const [damagePhotoUri, setDamagePhotoUri] = useState<string | null>(null);
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
      console.log('[PickupDetail] Selected photo', {which, uri: stampedUri});

      if (which === 'before') {
        setBeforePhotoUri(stampedUri);
      } else if (which === 'handover') {
        setHandoverPhotoUri(stampedUri);
      } else {
        setDamagePhotoUri(stampedUri);
      }
    } catch (error) {
      console.error('[PickupDetail] Failed to select photo', {which, source, error});
    }
  };

  async function loadDetails() {
    try {
      setLoading(true);
      console.log('[PickupDetail] Fetching pickup job details', {pickupJobId});
      const data = await getPickupJobDetails(pickupJobId);
      console.log('[PickupDetail] Details response', data);
      setJob(data as PickupJobDetail);
    } catch (error) {
      console.error('[PickupDetail] Failed to load pickup job', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupJobId]);

  const handleStatusUpdate = async (
    status: 'PICKUP_STARTED' | 'VEHICLE_PICKED_UP' | 'DELIVERED',
  ) => {
    try {
      setUpdating(status);
      console.log('[PickupDetail] Updating status', {pickupJobId, status});
      await updatePickupStatus({pickupJobId, status});
      await loadDetails();
    } catch (error) {
      console.error('[PickupDetail] Failed to update status', error);
    } finally {
      setUpdating(null);
    }
  };

  const renderStatusChip = () => {
    if (!job || !job.status) {
      return null;
    }
    return (
      <View style={styles.statusChip}>
        <Text style={styles.statusChipText}>{String(job.status)}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color="#a5b4fc" />
        <Text style={styles.loadingText}>Loading pickup job...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Pickup job not found.</Text>
      </View>
    );
  }

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.title}>Pickup #{pickupJobId.slice(0, 6)}...</Text>
            <Text style={styles.subtitle}>Vehicle & guest details</Text>
          </View>
          {renderStatusChip()}
        </View>

        <View style={styles.sectionBlock}>
          <Text style={styles.label}>Vehicle number</Text>
          <Text style={styles.value}>{job.vehicleNumber ?? '-'}</Text>
        </View>
        <View style={styles.sectionBlock}>
          <Text style={styles.label}>Tag</Text>
          <Text style={styles.value}>{job.tagNumber ?? '-'}</Text>
        </View>
        <View style={styles.sectionBlock}>
          <Text style={styles.label}>Pickup point</Text>
          <Text style={styles.value}>{job.pickupPoint ?? '-'}</Text>
        </View>
        <View style={styles.sectionBlock}>
          <Text style={styles.label}>Requested at</Text>
          <Text style={styles.value}>
            {job.requestedAt
              ? new Date(job.requestedAt).toLocaleString()
              : '-'}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Status actions</Text>
        <Text style={styles.cardSubtitle}>
          Update the pickup as you move through the flow.
        </Text>

        <View style={styles.actionsColumn}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => handleStatusUpdate('PICKUP_STARTED')}
            disabled={!!updating}>
            {updating === 'PICKUP_STARTED' ? (
              <ActivityIndicator size="small" color="#f9fafb" />
            ) : (
              <Text style={styles.primaryButtonText}>Start pickup</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => handleStatusUpdate('VEHICLE_PICKED_UP')}
            disabled={!!updating}>
            {updating === 'VEHICLE_PICKED_UP' ? (
              <ActivityIndicator size="small" color="#e5e7eb" />
            ) : (
              <Text style={styles.secondaryButtonText}>Vehicle picked</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => handleStatusUpdate('DELIVERED')}
            disabled={!!updating}>
            {updating === 'DELIVERED' ? (
              <ActivityIndicator size="small" color="#e5e7eb" />
            ) : (
              <Text style={styles.secondaryButtonText}>Delivered to guest</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, {marginTop: 12}]}
          onPress={() => navigation.navigate('DriveToPickup', {pickupJobId})}>
          <Text style={styles.primaryButtonText}>Drive to pickup point</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, {marginTop: 10}]}
          onPress={() =>
            navigation.navigate('IncidentReport', {
              contextType: 'PICKUP',
              contextId: pickupJobId,
              vehicleNumber: job?.vehicleNumber ?? null,
              keyTagCode: job?.tagNumber ?? null,
            })
          }>
          <Text style={styles.secondaryButtonText}>Report incident / damage</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pickup photos (optional)</Text>
        <Text style={styles.cardSubtitle}>
          Capture photos before and during handover for your records.
        </Text>

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
      </View>
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
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
  },
  content: {
    padding: 16,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#050816',
  },
  loadingText: {
    marginTop: 8,
    color: '#e5e7eb',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f9fafb',
  },
  subtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: '#1d4ed8',
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#dbeafe',
  },
  sectionBlock: {
    marginTop: 8,
  },
  label: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    color: '#f9fafb',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#e5e7eb',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 10,
  },
  actionsColumn: {
    gap: 10,
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 999,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  secondaryButtonText: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '500',
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
});
