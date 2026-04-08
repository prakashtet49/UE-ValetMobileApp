import React from 'react';
import {TouchableOpacity, Text, View, StyleSheet, ViewStyle, TextStyle} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

type GradientButtonProps = {
  children: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
};

const GradientButton: React.FC<GradientButtonProps> = ({
  children,
  onPress,
  style,
  textStyle,
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.buttonContainer, style]}
      disabled={disabled}>
      <LinearGradient
        colors={['#76D0E3', '#3156D8']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={[styles.gradient, disabled && styles.disabled]}>
        <View style={styles.labelWrap} pointerEvents="none">
          <Text style={[styles.text, textStyle]}>{children}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    width: '100%',
    minHeight: 52,
    borderRadius: 26,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  gradient: {
    height: 52,
    borderRadius: 26,
    width: '100%',
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  labelWrap: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 22,
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },
});

export default GradientButton;
