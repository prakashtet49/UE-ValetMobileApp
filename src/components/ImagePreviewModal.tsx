import React from 'react';
import {
  Modal,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Text,
} from 'react-native';
import {COLORS} from '../constants/theme';

const {width, height} = Dimensions.get('window');

interface ImagePreviewModalProps {
  visible: boolean;
  imageUri: string | null;
  onClose: () => void;
  onRecapture: () => void;
}

export default function ImagePreviewModal({
  visible,
  imageUri,
  onClose,
  onRecapture,
}: ImagePreviewModalProps) {
  if (!imageUri) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.8}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>

        <Image source={{uri: imageUri}} style={styles.fullImage} resizeMode="contain" />

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity
            style={styles.recaptureButton}
            onPress={() => {
              onClose();
              onRecapture();
            }}
            activeOpacity={0.8}>
            <Text style={styles.recaptureButtonText}>📷 Recapture</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  closeButtonText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
  },
  fullImage: {
    width: width,
    height: height * 0.7,
  },
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 60,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recaptureButton: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  recaptureButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
