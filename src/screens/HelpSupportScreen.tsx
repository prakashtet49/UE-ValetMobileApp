import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Platform,
} from 'react-native';
import BackButton from '../components/BackButton';
import {COLORS, SHADOWS} from '../constants/theme';

const urbaneaseLogo = require('../assets/icons/urbanease-logo.png');

const SUPPORT_PHONES = [
  { display: '+91 9390120621', tel: '+919390120621' },
  { display: '+91 9182213739', tel: '+919182213739' },
];
const SUPPORT_EMAIL = 'contact@anvaron.in';

export default function HelpSupportScreen() {

  const handleCall = (tel: string) => {
    Linking.openURL(`tel:${tel}`);
  };

  const handleEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton color="#1f2937" useIcon={true} />
        <View style={styles.headerLogoContainer}>
          <Image source={urbaneaseLogo} style={styles.headerLogo} />
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.message}>
          Need assistance? Reach out to our team and we’ll get back to you as soon as we can.
        </Text>

        {SUPPORT_PHONES.map(({ display, tel }) => (
          <TouchableOpacity
            key={tel}
            style={styles.contactCard}
            onPress={() => handleCall(tel)}
            activeOpacity={0.7}>
            <Text style={styles.contactLabel}>Phone</Text>
            <Text style={styles.contactValue}>{display}</Text>
            <Text style={styles.contactHint}>Tap to call</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.contactCard} onPress={handleEmail} activeOpacity={0.7}>
          <Text style={styles.contactLabel}>Email</Text>
          <Text style={styles.contactValue}>{SUPPORT_EMAIL}</Text>
          <Text style={styles.contactHint}>Tap to send email</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    ...SHADOWS.small,
  },
  headerLogoContainer: {
    flex: 1,
    alignItems: 'center',
    marginLeft: -40,
  },
  headerLogo: {
    height: 40,
    width: 150,
    resizeMode: 'contain',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingTop: 24,
  },
  message: {
    fontSize: 16,
    lineHeight: 24,
    color: COLORS.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },
  contactCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  contactValue: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.gradientEnd,
    marginBottom: 4,
  },
  contactHint: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
