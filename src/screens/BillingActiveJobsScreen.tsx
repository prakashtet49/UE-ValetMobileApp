import React from 'react';
import {View, StyleSheet, Text, Image} from 'react-native';
import {COLORS, SHADOWS} from '../constants/theme';
import {moderateScale, verticalScale, getResponsiveFontSize, getResponsiveSpacing} from '../utils/responsive';
import ActiveJobsTab from '../components/billing/ActiveJobsTab';
import BackButton from '../components/BackButton';

const urbaneaseLogo = require('../assets/icons/urbanease-logo.png');

export default function BillingActiveJobsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton color="#1f2937" useIcon={true} />
        <View style={styles.headerCenter}>
          <Image source={urbaneaseLogo} style={styles.headerLogo} />
        </View>
        <View style={styles.headerRight} />
      </View>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Active Jobs</Text>
      </View>
      <ActiveJobsTab />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: getResponsiveSpacing(20),
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(16),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.small,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerLogo: {
    height: moderateScale(40),
    width: moderateScale(150),
    resizeMode: 'contain',
  },
  headerRight: {
    width: moderateScale(40),
  },
  titleContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: getResponsiveSpacing(20),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
});
