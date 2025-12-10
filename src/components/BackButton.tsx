import React from 'react';
import {TouchableOpacity, Text, StyleSheet, View, Image} from 'react-native';
import {useNavigation} from '@react-navigation/native';

const backIcon = require('../assets/icons/back.png');

type BackButtonProps = {
  onPress?: () => void;
  label?: string;
  color?: string;
  backgroundColor?: string;
  useIcon?: boolean;
};

export default function BackButton({
  onPress,
  label = '← Back',
  color = '#ffffff',
  backgroundColor = 'transparent',
  useIcon = false,
}: BackButtonProps) {
  const navigation = useNavigation();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, {backgroundColor}]}
      onPress={handlePress}
      activeOpacity={0.7}>
      {useIcon ? (
        <Image source={backIcon} style={[styles.icon, {tintColor: color}]} />
      ) : (
        <Text style={[styles.buttonText, {color}]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  icon: {
    width: 24,
    height: 24,
  },
});
