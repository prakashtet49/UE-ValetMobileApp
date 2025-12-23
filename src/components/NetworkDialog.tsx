import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import {COLORS} from '../constants/theme';
import LinearGradient from 'react-native-linear-gradient';

const noNetworkIcon = require('../assets/icons/no_network_icon.png');

type NetworkDialogProps = {
  visible: boolean;
  onRetry: () => void;
};

const NetworkDialog: React.FC<NetworkDialogProps> = ({visible, onRetry}) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.dialogContainer}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Image source={noNetworkIcon} style={styles.icon} />
          </View>

          {/* Title */}
          <Text style={styles.title}>Oops!</Text>

          {/* Message */}
          <Text style={styles.message}>
            It looks like you're offline. Please check your internet connection
            and try again.
          </Text>

          {/* Try Again Button */}
          <TouchableOpacity
            style={styles.buttonContainer}
            onPress={onRetry}
            activeOpacity={0.8}>
            <LinearGradient
              colors={['#76D0E3', '#3156D8']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.button}>
              <Text style={styles.buttonText}>Try Again</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialogContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 32,
    width: Dimensions.get('window').width - 60,
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  icon: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default NetworkDialog;
