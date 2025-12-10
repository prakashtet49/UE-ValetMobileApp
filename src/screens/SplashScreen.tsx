import React, {useEffect} from 'react';
import {ActivityIndicator, Image, StyleSheet, Text, View} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {AuthStackParamList} from '../navigation/AppNavigator';
import {useAuth} from '../context/AuthContext';

const urbaneaseLogo = require('../assets/icons/urbanease-logo.png');

export type SplashScreenProps = NativeStackScreenProps<
  AuthStackParamList,
  'Splash'
>;

export default function SplashScreen({navigation}: SplashScreenProps) {
  const {session} = useAuth();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (session) {
        // AppNavigator will switch stack automatically
        return;
      }
      navigation.replace('Login');
    }, 1000);

    return () => clearTimeout(timeout);
  }, [navigation, session]);

  return (
    <View style={styles.container}>
      <Image source={urbaneaseLogo} style={styles.logo} />
      <ActivityIndicator size="small" color="#ffffff" style={styles.loader} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    height: 80,
    width: 250,
    resizeMode: 'contain',
    marginBottom: 16,
  },
  loader: {
    marginTop: 16,
  },
});
