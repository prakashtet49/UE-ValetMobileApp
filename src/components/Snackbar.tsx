import React, {useEffect} from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';

type SnackbarProps = {
  visible: boolean;
  message: string;
  type?: 'success' | 'error' | 'info';
  duration?: number;
  onDismiss: () => void;
};

export default function Snackbar({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onDismiss,
}: SnackbarProps) {
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(duration),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onDismiss();
      });
    }
  }, [visible, duration, opacity, onDismiss]);

  if (!visible) {
    return null;
  }

  const backgroundColor =
    type === 'error'
      ? '#ef4444'
      : type === 'success'
      ? '#22c55e'
      : '#3b82f6';

  return (
    <Animated.View
      style={[
        styles.container,
        {backgroundColor, opacity},
      ]}>
      <View style={styles.content}>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    borderRadius: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 9999,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  message: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
