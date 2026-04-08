import React, {useEffect, useState, useCallback} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {moderateScale, verticalScale, getResponsiveFontSize, getResponsiveSpacing} from '../../utils/responsive';
import printerService, {type PrinterDevice} from '../../services/printerService';
import {COLORS} from '../../constants/theme';
import {logError, getUserFriendlyMessage} from '../../utils/errorHandler';
import CustomDialog from '../CustomDialog';

export type BillingPrinterConnectionProps = {
  /**
   * When set, the printer button is passed to the parent (e.g. Generate Bills title row).
   * Modals still mount here.
   */
  onPrinterButtonRender?: (node: React.ReactNode) => void;
  /** When true and no onPrinterButtonRender, wraps the button in the standard bills toolbar strip */
  showPrinterContainer?: boolean;
  /** `header` matches Home header controls size; `default` matches Generate Bills toolbar */
  variant?: 'default' | 'header';
  /** Optional style for the printer touchable */
  buttonStyle?: StyleProp<ViewStyle>;
};

export default function BillingPrinterConnection({
  onPrinterButtonRender,
  showPrinterContainer = true,
  variant = 'default',
  buttonStyle,
}: BillingPrinterConnectionProps) {
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [connectedPrinter, setConnectedPrinter] = useState<PrinterDevice | null>(null);
  const [showPrinterDialog, setShowPrinterDialog] = useState(false);
  const [scanningPrinters, setScanningPrinters] = useState(false);

  async function autoConnectPrinter() {
    try {
      const reconnected = await printerService.autoReconnect();
      if (reconnected) {
        const printer = printerService.getConnectedPrinter();
        if (printer) {
          setConnectedPrinter(printer);
          console.log('[BillingPrinterConnection] Auto-reconnected to printer:', printer.name);
        }
      }
    } catch (error) {
      console.error('[BillingPrinterConnection] Auto-reconnect failed:', error);
    }
  }

  useEffect(() => {
    autoConnectPrinter();
  }, []);

  const handleConnectPrinter = useCallback(async (printer: PrinterDevice) => {
    try {
      await printerService.connectToPrinter(printer);
      setConnectedPrinter(printer);
      setShowPrinterDialog(false);
      Alert.alert('Success', `Connected to ${printer.name}`);
    } catch (error) {
      logError('BillingPrinterConnection.handleConnectPrinter', error);
      Alert.alert('Connection Failed', getUserFriendlyMessage(error));
    }
  }, []);

  const handleScanPrinters = useCallback(async () => {
    let hasPermissions = true;
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);

        hasPermissions =
          granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        hasPermissions = false;
      }
    }

    if (!hasPermissions) {
      Alert.alert(
        'Permissions Required',
        'Bluetooth and Location permissions are required to scan for printers.',
      );
      return;
    }

    setScanningPrinters(true);
    try {
      const devices = await printerService.scanForPrinters();
      setPrinters(devices);
      setShowPrinterDialog(true);
    } catch (error) {
      logError('BillingPrinterConnection.handleScanPrinters', error);
      Alert.alert('Scan Failed', getUserFriendlyMessage(error));
    } finally {
      setScanningPrinters(false);
    }
  }, []);

  const renderPrinterButton = useCallback(() => {
    const isHeader = variant === 'header';
    return (
      <TouchableOpacity
        style={[
          styles.touchableTransparent,
          isHeader ? styles.printerButtonHeader : styles.printerButton,
          buttonStyle,
        ]}
        activeOpacity={0.65}
        onPress={handleScanPrinters}
        disabled={scanningPrinters}
        accessibilityLabel="Printer">
        {scanningPrinters ? (
          <ActivityIndicator size="small" color={COLORS.gradientEnd} />
        ) : (
          <View style={styles.printerIconContainer}>
            <Text style={isHeader ? styles.printerIconHeader : styles.printerIcon}>🖨️</Text>
            {connectedPrinter && <View style={styles.connectedDot} />}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [variant, buttonStyle, scanningPrinters, connectedPrinter, handleScanPrinters]);

  useEffect(() => {
    if (onPrinterButtonRender) {
      onPrinterButtonRender(renderPrinterButton());
    }
  }, [onPrinterButtonRender, renderPrinterButton]);

  const inlineButton = renderPrinterButton();

  return (
    <>
      {onPrinterButtonRender ? null : showPrinterContainer ? (
        <View style={styles.printerContainer}>{inlineButton}</View>
      ) : (
        inlineButton
      )}

      {showPrinterDialog && printers.length === 0 && (
        <CustomDialog
          visible={showPrinterDialog}
          title="No Printers Found"
          message="No paired Bluetooth devices found. Please pair your printer in Bluetooth settings first."
          buttons={[
            {
              text: 'OK',
              onPress: () => setShowPrinterDialog(false),
            },
          ]}
          onDismiss={() => setShowPrinterDialog(false)}
        />
      )}

      <Modal
        visible={showPrinterDialog && printers.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPrinterDialog(false)}>
        <View style={styles.printerDialogOverlay}>
          <View style={styles.printerDialogContainer}>
            <Text style={styles.printerDialogTitle}>Select Printer</Text>
            <ScrollView style={styles.printerList}>
              {printers.map((printer, index) => (
                <TouchableOpacity
                  key={printer.id || printer.address || `printer-${index}`}
                  style={[
                    styles.printerItem,
                    connectedPrinter?.id === printer.id && styles.printerItemSelected,
                  ]}
                  onPress={() => handleConnectPrinter(printer)}>
                  <View style={styles.printerItemContent}>
                    <Text style={styles.printerName}>{printer.name}</Text>
                    <Text style={styles.printerAddress}>{printer.address}</Text>
                  </View>
                  {connectedPrinter?.id === printer.id && (
                    <Text style={styles.connectedBadge}>✓ Connected</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.printerDialogButton}
              onPress={() => setShowPrinterDialog(false)}>
              <Text style={styles.printerDialogButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  printerContainer: {
    paddingHorizontal: getResponsiveSpacing(20),
    paddingVertical: verticalScale(12),
    alignItems: 'flex-end',
  },
  touchableTransparent: {
    backgroundColor: 'transparent',
  },
  printerButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: getResponsiveSpacing(12),
    paddingVertical: verticalScale(12),
    minWidth: moderateScale(44),
    minHeight: moderateScale(44),
  },
  printerButtonHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: moderateScale(4),
    minWidth: moderateScale(36),
    minHeight: moderateScale(36),
  },
  printerIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  printerIcon: {
    fontSize: getResponsiveFontSize(24),
  },
  printerIconHeader: {
    fontSize: getResponsiveFontSize(18),
  },
  connectedDot: {
    width: moderateScale(10),
    height: moderateScale(10),
    borderRadius: moderateScale(5),
    backgroundColor: '#22c55e',
    position: 'absolute',
    top: -2,
    right: -2,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  printerDialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  printerDialogContainer: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    padding: getResponsiveSpacing(20),
    width: '85%',
    maxHeight: '70%',
  },
  printerDialogTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(16),
    textAlign: 'center',
  },
  printerList: {
    maxHeight: moderateScale(300),
  },
  printerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getResponsiveSpacing(12),
    borderRadius: moderateScale(8),
    marginBottom: verticalScale(8),
    backgroundColor: COLORS.backgroundLight,
  },
  printerItemSelected: {
    backgroundColor: '#E3F2FD',
  },
  printerItemContent: {
    flex: 1,
  },
  printerName: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  printerAddress: {
    fontSize: getResponsiveFontSize(12),
    color: COLORS.textSecondary,
    marginTop: verticalScale(2),
  },
  connectedBadge: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    color: '#22c55e',
  },
  printerDialogButton: {
    backgroundColor: COLORS.backgroundLight,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    marginTop: verticalScale(12),
  },
  printerDialogButtonText: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
