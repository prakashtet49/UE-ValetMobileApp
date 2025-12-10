import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TouchableWithoutFeedback,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import {COLORS, SHADOWS} from '../constants/theme';

export interface DialogButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomDialogProps {
  visible: boolean;
  title: string;
  message: string;
  buttons?: DialogButton[];
  onDismiss?: () => void;
}

export default function CustomDialog({
  visible,
  title,
  message,
  buttons = [{text: 'OK', style: 'default'}],
  onDismiss,
}: CustomDialogProps) {
  const handleButtonPress = (button: DialogButton) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleBackdropPress = () => {
    // Only dismiss if there's a cancel button
    const hasCancelButton = buttons.some(b => b.style === 'cancel');
    if (hasCancelButton && onDismiss) {
      onDismiss();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}>
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.dialog}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>
              <View style={styles.buttonContainer}>
                {buttons.map((button, index) => {
                  const isDestructive = button.style === 'destructive';
                  const isCancel = button.style === 'cancel';
                  
                  return (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.button,
                        buttons.length === 1 && styles.buttonSingle,
                      ]}
                      onPress={() => handleButtonPress(button)}
                      activeOpacity={0.8}>
                      {!isCancel && !isDestructive ? (
                        <LinearGradient
                          colors={['#76D0E3', '#3156D8']}
                          start={{x: 0, y: 0}}
                          end={{x: 1, y: 1}}
                          style={styles.buttonGradient}>
                          <Text style={styles.buttonTextPrimary}>{button.text}</Text>
                        </LinearGradient>
                      ) : (
                        <View
                          style={[
                            styles.buttonSolid,
                            isDestructive && styles.buttonDestructive,
                            isCancel && styles.buttonCancel,
                          ]}>
                          <Text
                            style={[
                              styles.buttonText,
                              isDestructive && styles.buttonTextDestructive,
                              isCancel && styles.buttonTextCancel,
                            ]}>
                            {button.text}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    ...SHADOWS.large,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 12,
  },
  buttonSingle: {
    flex: 1,
  },
  buttonGradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  buttonSolid: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: COLORS.backgroundLight,
  },
  buttonCancel: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  buttonDestructive: {
    backgroundColor: COLORS.error,
  },
  buttonTextPrimary: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  buttonTextCancel: {
    color: COLORS.textSecondary,
  },
  buttonTextDestructive: {
    color: COLORS.white,
  },
});

