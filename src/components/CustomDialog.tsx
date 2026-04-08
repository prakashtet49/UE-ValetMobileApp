import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TouchableWithoutFeedback,
  Platform,
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
                        <View style={styles.buttonClip}>
                          <LinearGradient
                            colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                            start={{x: 0, y: 0}}
                            end={{x: 1, y: 0}}
                            style={styles.buttonGradient}>
                            <View style={styles.buttonLabelWrap} pointerEvents="none">
                              <Text style={styles.buttonTextPrimary}>{button.text}</Text>
                            </View>
                          </LinearGradient>
                        </View>
                      ) : (
                        <View
                          style={[
                            styles.buttonClip,
                            styles.buttonSolid,
                            isDestructive && styles.buttonDestructive,
                            isCancel && styles.buttonCancel,
                          ]}>
                          <View style={styles.buttonLabelWrap} pointerEvents="none">
                            <Text
                              style={[
                                styles.buttonText,
                                isDestructive && styles.buttonTextDestructive,
                                isCancel && styles.buttonTextCancel,
                              ]}>
                              {button.text}
                            </Text>
                          </View>
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
    paddingHorizontal: 24,
    paddingTop: 24,
    // Extra bottom room so elevated dialog + rounded corners do not clip actions (Android).
    paddingBottom: Platform.OS === 'android' ? 28 : 24,
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
    alignItems: 'stretch',
  },
  button: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  buttonSingle: {
    flex: 1,
    alignSelf: 'stretch',
  },
  buttonClip: {
    width: '100%',
    borderRadius: 26,
    overflow: 'hidden',
  },
  buttonGradient: {
    height: 52,
    borderRadius: 26,
    width: '100%',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  buttonSolid: {
    height: 52,
    borderRadius: 26,
    paddingHorizontal: 20,
    backgroundColor: COLORS.backgroundLight,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  buttonLabelWrap: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'stretch',
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
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 22,
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 20,
    width: '100%',
  },
  buttonTextCancel: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 20,
    width: '100%',
  },
  buttonTextDestructive: {
    color: COLORS.white,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 20,
    width: '100%',
  },
});

