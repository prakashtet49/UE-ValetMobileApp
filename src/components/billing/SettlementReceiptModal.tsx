import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {calculateReceipt, printReceiptWithPayment} from '../../api/receipt';
import {COLORS, SHADOWS} from '../../constants/theme';
import {logError, getUserFriendlyMessage} from '../../utils/errorHandler';
import printerService from '../../services/printerService';
import {
  moderateScale,
  verticalScale,
  getResponsiveFontSize,
  getResponsiveSpacing,
} from '../../utils/responsive';

export type SettlementReceiptModalProps = {
  visible: boolean;
  bookingId: string | null;
  vehicleNumber: string;
  /** Cancel, Android back, or calculation error — parent should hide modal and clear booking context */
  onCancel: () => void;
  /** After a successful print, hide modal only (keep booking context for Reprint from alert) */
  onHiddenAfterPrintSuccess: () => void;
  /** User tapped Done on the success alert */
  onPrintedAndFinished?: () => void;
};

export default function SettlementReceiptModal({
  visible,
  bookingId,
  vehicleNumber,
  onCancel,
  onHiddenAfterPrintSuccess,
  onPrintedAndFinished,
}: SettlementReceiptModalProps) {
  const [calculatedAmount, setCalculatedAmount] = useState<number | null>(null);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [calculatingAmount, setCalculatingAmount] = useState(false);
  const [printingFromDialog, setPrintingFromDialog] = useState(false);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<
    'Cash' | 'Card' | 'UPI' | null
  >(null);

  const onCancelRef = useRef(onCancel);
  onCancelRef.current = onCancel;

  const settlementAmountRef = useRef(settlementAmount);
  const selectedPaymentModeRef = useRef(selectedPaymentMode);
  settlementAmountRef.current = settlementAmount;
  selectedPaymentModeRef.current = selectedPaymentMode;

  useEffect(() => {
    if (!visible || !bookingId) {
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await printerService.autoReconnect();
      } catch {
        // non-fatal
      }
    })();

    setCalculatedAmount(null);
    setSettlementAmount('');
    setSelectedPaymentMode(null);
    setCalculatingAmount(true);
    calculateReceipt(bookingId)
      .then(response => {
        if (cancelled) return;
        setCalculatedAmount(response.charges);
        setSettlementAmount(response.charges.toString());
      })
      .catch(error => {
        if (cancelled) return;
        logError('SettlementReceiptModal.calculateReceipt', error);
        Alert.alert('Calculation Failed', getUserFriendlyMessage(error));
        onCancelRef.current();
      })
      .finally(() => {
        if (!cancelled) {
          setCalculatingAmount(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [visible, bookingId]);

  const runPrint = async () => {
    const amountStr = settlementAmountRef.current;
    const mode = selectedPaymentModeRef.current;
    if (!bookingId || !amountStr) {
      Alert.alert('Invalid Input', 'Please enter a settlement amount');
      return;
    }
    if (!mode) {
      Alert.alert(
        'Payment Mode Required',
        'Please select a payment mode (Cash, Card, or UPI)',
      );
      return;
    }
    const overrideAmount = parseFloat(amountStr);
    if (isNaN(overrideAmount) || overrideAmount < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    setPrintingFromDialog(true);
    try {
      if (!printerService.getConnectedPrinter()) {
        Alert.alert(
          'Printer Not Connected',
          'Please connect to a printer first using the printer icon on Home or Generate Bills.',
        );
        return;
      }

      const response = await printReceiptWithPayment(
        bookingId,
        vehicleNumber,
        overrideAmount,
        mode,
      );

      await printerService.printRawData(response.printBuffer);

      onHiddenAfterPrintSuccess();

      Alert.alert(
        'Receipt Printed Successfully',
        `Vehicle: ${vehicleNumber}\nCharges: ₹${response.receiptData.charges}\nSettlement: ₹${response.receiptData.overrideAmount}\nDuration: ${response.receiptData.duration}`,
        [
          {
            text: 'Done',
            style: 'cancel',
            onPress: () => {
              onPrintedAndFinished?.();
            },
          },
          {
            text: 'Reprint',
            onPress: () => {
              runPrint();
            },
          },
        ],
      );
    } catch (error) {
      logError('SettlementReceiptModal.runPrint', error);
      Alert.alert('Print Failed', getUserFriendlyMessage(error));
    } finally {
      setPrintingFromDialog(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.settlementDialogOverlay}>
        <View style={styles.settlementDialogContainer}>
          <Text style={styles.settlementDialogTitle}>Settlement Amount</Text>

          {calculatingAmount ? (
            <View style={styles.calculatingContainer}>
              <ActivityIndicator size="large" color={COLORS.gradientEnd} />
              <Text style={styles.calculatingText}>Calculating amount...</Text>
            </View>
          ) : (
            <>
              <View style={styles.amountDisplayContainer}>
                <Text style={styles.amountLabel}>Calculated Amount:</Text>
                <Text style={styles.amountDisplay}>
                  ₹{calculatedAmount?.toFixed(2) || '0.00'}
                </Text>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Settlement Amount:</Text>
                <TextInput
                  style={styles.settlementInput}
                  value={settlementAmount}
                  onChangeText={setSettlementAmount}
                  keyboardType="numeric"
                  placeholder="Enter amount"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>

              <View style={styles.paymentModeContainer}>
                <Text style={styles.paymentModeLabel}>Select Payment Mode:</Text>
                <View style={styles.paymentModeCards}>
                  <TouchableOpacity
                    style={[
                      styles.paymentModeCard,
                      selectedPaymentMode === 'Cash' && styles.paymentModeCardSelected,
                    ]}
                    onPress={() => setSelectedPaymentMode('Cash')}>
                    <Text style={styles.paymentModeIcon}>💵</Text>
                    <Text
                      style={[
                        styles.paymentModeText,
                        selectedPaymentMode === 'Cash' && styles.paymentModeTextSelected,
                      ]}>
                      Cash
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentModeCard,
                      selectedPaymentMode === 'Card' && styles.paymentModeCardSelected,
                    ]}
                    onPress={() => setSelectedPaymentMode('Card')}>
                    <Text style={styles.paymentModeIcon}>💳</Text>
                    <Text
                      style={[
                        styles.paymentModeText,
                        selectedPaymentMode === 'Card' && styles.paymentModeTextSelected,
                      ]}>
                      Card
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentModeCard,
                      selectedPaymentMode === 'UPI' && styles.paymentModeCardSelected,
                    ]}
                    onPress={() => setSelectedPaymentMode('UPI')}>
                    <Text style={styles.paymentModeIcon}>📱</Text>
                    <Text
                      style={[
                        styles.paymentModeText,
                        selectedPaymentMode === 'UPI' && styles.paymentModeTextSelected,
                      ]}>
                      UPI
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.dialogButtonsRow}>
                <TouchableOpacity
                  style={styles.dialogCancelButton}
                  onPress={onCancel}
                  disabled={printingFromDialog}>
                  <Text style={styles.dialogCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.dialogPrintButton,
                    printingFromDialog && styles.dialogPrintButtonDisabled,
                  ]}
                  onPress={runPrint}
                  disabled={printingFromDialog}>
                  {printingFromDialog ? (
                    <>
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text style={styles.dialogPrintButtonText}>Printing...</Text>
                    </>
                  ) : (
                    <>
                      <Text style={styles.dialogPrintIcon}>🖨️</Text>
                      <Text style={styles.dialogPrintButtonText}>Print</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  settlementDialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settlementDialogContainer: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    padding: getResponsiveSpacing(24),
    width: '85%',
    maxWidth: 400,
  },
  settlementDialogTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(20),
    textAlign: 'center',
  },
  calculatingContainer: {
    alignItems: 'center',
    paddingVertical: verticalScale(40),
  },
  calculatingText: {
    marginTop: verticalScale(12),
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textSecondary,
  },
  amountDisplayContainer: {
    backgroundColor: '#E3F2FD',
    padding: getResponsiveSpacing(16),
    borderRadius: moderateScale(12),
    marginBottom: verticalScale(16),
  },
  amountLabel: {
    fontSize: getResponsiveFontSize(13),
    color: COLORS.textSecondary,
    marginBottom: verticalScale(4),
  },
  amountDisplay: {
    fontSize: getResponsiveFontSize(28),
    fontWeight: '700',
    color: COLORS.gradientEnd,
  },
  inputContainer: {
    marginBottom: verticalScale(20),
  },
  inputLabel: {
    fontSize: getResponsiveFontSize(13),
    color: COLORS.textSecondary,
    marginBottom: verticalScale(8),
  },
  settlementInput: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: moderateScale(8),
    padding: getResponsiveSpacing(12),
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  paymentModeContainer: {
    marginBottom: verticalScale(20),
  },
  paymentModeLabel: {
    fontSize: getResponsiveFontSize(13),
    color: COLORS.textSecondary,
    marginBottom: verticalScale(12),
  },
  paymentModeCards: {
    flexDirection: 'row',
    gap: getResponsiveSpacing(8),
  },
  paymentModeCard: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: moderateScale(12),
    padding: getResponsiveSpacing(16),
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.small,
  },
  paymentModeCardSelected: {
    borderColor: COLORS.gradientEnd,
    backgroundColor: '#F0F9FF',
  },
  paymentModeIcon: {
    fontSize: getResponsiveFontSize(32),
    marginBottom: verticalScale(8),
  },
  paymentModeText: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  paymentModeTextSelected: {
    color: COLORS.gradientEnd,
    fontWeight: '700',
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    gap: getResponsiveSpacing(12),
  },
  dialogCancelButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    alignItems: 'center',
  },
  dialogCancelButtonText: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  dialogPrintButton: {
    flex: 1,
    backgroundColor: COLORS.gradientEnd,
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: getResponsiveSpacing(8),
  },
  dialogPrintButtonDisabled: {
    opacity: 0.6,
  },
  dialogPrintIcon: {
    fontSize: getResponsiveFontSize(18),
  },
  dialogPrintButtonText: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '700',
    color: COLORS.white,
  },
});
