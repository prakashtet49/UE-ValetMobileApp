import React, {useState, useEffect, useMemo} from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  FlatList,
  Alert,
  PermissionsAndroid,
  Platform,
  TextInput,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {moderateScale, verticalScale, getResponsiveFontSize, getResponsiveSpacing} from '../utils/responsive';
import {useNavigation, useFocusEffect} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import LinearGradient from 'react-native-linear-gradient';
import {useAuth} from '../context/AuthContext';
import {getClientLocations, assignLocation, type Location} from '../api/driver';
import {getCompletedJobs, type CompletedJob} from '../api/jobs';
import {printReceipt, calculateReceipt, printReceiptWithOverride, getTodaySummary, type CalculateReceiptResponse, type TodaySummaryResponse} from '../api/receipt';
import type {BillingStackParamList} from '../navigation/AppNavigator';
import {COLORS, SHADOWS} from '../constants/theme';
import {logError, getUserFriendlyMessage} from '../utils/errorHandler';
import printerService, {type PrinterDevice} from '../services/printerService';
import CustomDialog from '../components/CustomDialog';

const urbaneaseLogo = require('../assets/icons/urbanease-logo.png');
const locationIcon = require('../assets/icons/location.png');

export default function BillingScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<BillingStackParamList>>();
  const {session} = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [changingLocation, setChangingLocation] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [connectedPrinter, setConnectedPrinter] = useState<PrinterDevice | null>(null);
  const [showPrinterDialog, setShowPrinterDialog] = useState(false);
  const [scanningPrinters, setScanningPrinters] = useState(false);
  const [printingJob, setPrintingJob] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialog, setDialog] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: Array<{text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive'}>;
  }>({visible: false, title: '', message: '', buttons: []});
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [selectedJob, setSelectedJob] = useState<CompletedJob | null>(null);
  const [calculatedAmount, setCalculatedAmount] = useState<number | null>(null);
  const [settlementAmount, setSettlementAmount] = useState('');
  const [calculatingAmount, setCalculatingAmount] = useState(false);
  const [printingFromDialog, setPrintingFromDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'summary'>('all');
  const [summaryData, setSummaryData] = useState<TodaySummaryResponse | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [locationsLoaded, setLocationsLoaded] = useState(false);

  useEffect(() => {
    loadLocations();
    autoConnectPrinter();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Only restore location on focus if locations are already loaded
      if (locationsLoaded && locations.length > 0) {
        restoreSelectedLocation();
      }
      loadCompletedJobs();
    }, [locationsLoaded, locations])
  );

  useEffect(() => {
    if (activeTab === 'summary') {
      loadTodaySummary();
    }
  }, [activeTab]);

  async function autoConnectPrinter() {
    try {
      const reconnected = await printerService.autoReconnect();
      if (reconnected) {
        const printer = printerService.getConnectedPrinter();
        if (printer) {
          setConnectedPrinter(printer);
          console.log('[BillingScreen] Auto-reconnected to printer:', printer.name);
        }
      }
    } catch (error) {
      console.log('[BillingScreen] Auto-reconnect failed:', error);
    }
  }

  async function loadCompletedJobs() {
    // Prevent multiple simultaneous loads
    if (loading && !refreshing) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await getCompletedJobs(50, 0);
      console.log('[BillingScreen] Completed jobs response:', response);
      if (response.data && response.data.length > 0) {
        console.log('[BillingScreen] First job sample:', JSON.stringify(response.data[0], null, 2));
      }
      setCompletedJobs(response.data || []);
    } catch (err) {
      logError('BillingScreen.loadCompletedJobs', err);
      setError(getUserFriendlyMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function restoreSelectedLocation() {
    try {
      const savedLocationId = await AsyncStorage.getItem('billing_selected_location_id');
      
      if (savedLocationId && locations.length > 0) {
        const savedLocation = locations.find(loc => loc.id === savedLocationId);
        if (savedLocation && savedLocation.id !== selectedLocation?.id) {
          console.log('[BillingScreen] Restoring saved location on focus:', savedLocation.name);
          setSelectedLocation(savedLocation);
        }
      }
    } catch (error) {
      console.error('[BillingScreen] Failed to restore location:', error);
    }
  }

  async function loadLocations() {
    try {
      const response = await getClientLocations();
      setLocations(response.locations || []);
      
      // Try to restore previously selected location
      const savedLocationId = await AsyncStorage.getItem('billing_selected_location_id');
      
      if (savedLocationId && response.locations) {
        const savedLocation = response.locations.find(loc => loc.id === savedLocationId);
        if (savedLocation) {
          console.log('[BillingScreen] Restored saved location:', savedLocation.name);
          setSelectedLocation(savedLocation);
          // Assign the saved location to backend to ensure data matches
          try {
            await assignLocation({locationId: savedLocation.id});
            console.log('[BillingScreen] Assigned saved location to backend:', savedLocation.name);
          } catch (error) {
            console.error('[BillingScreen] Failed to assign saved location:', error);
          }
          setLocationsLoaded(true);
          return;
        }
      }
      
      // Only set first location if no saved location exists
      if (response.locations && response.locations.length > 0) {
        console.log('[BillingScreen] No saved location, using first location');
        setSelectedLocation(response.locations[0]);
        // Save the first location as default
        await AsyncStorage.setItem('billing_selected_location_id', response.locations[0].id);
        // Assign the first location to backend
        try {
          await assignLocation({locationId: response.locations[0].id});
          console.log('[BillingScreen] Assigned first location to backend:', response.locations[0].name);
        } catch (error) {
          console.error('[BillingScreen] Failed to assign first location:', error);
        }
      }
      setLocationsLoaded(true);
    } catch (error) {
      console.error('Failed to load locations', error);
    }
  }


  const handleLocationSelect = async (location: Location) => {
    // Prevent multiple clicks
    if (changingLocation) {
      console.log('[BillingScreen] Location change already in progress, ignoring click');
      return;
    }

    // Don't change if same location
    if (selectedLocation?.id === location.id) {
      console.log('[BillingScreen] Same location selected, closing dropdown');
      setShowLocationDropdown(false);
      return;
    }

    try {
      setChangingLocation(true);
      console.log('[BillingScreen] Assigning location:', location.id, location.name);
      
      await assignLocation({locationId: location.id});
      setSelectedLocation(location);
      
      // Save selected location to AsyncStorage
      await AsyncStorage.setItem('billing_selected_location_id', location.id);
      console.log('[BillingScreen] Saved location to storage:', location.name);
      
      setShowLocationDropdown(false);
      
      // Refresh completed jobs to get data for the new location
      console.log('[BillingScreen] Location assigned successfully, refreshing completed jobs...');
      await loadCompletedJobs();
      
      setDialog({
        visible: true,
        title: 'Success',
        message: `Location changed to ${location.name}`,
        buttons: [{text: 'OK', style: 'default'}],
      });
    } catch (error) {
      console.error('Failed to assign location:', error);
      setDialog({
        visible: true,
        title: 'Error',
        message: 'Failed to change location. Please try again.',
        buttons: [{text: 'OK', style: 'default'}],
      });
    } finally {
      setChangingLocation(false);
    }
  };

  const handleProfile = () => {
    navigation.navigate('Profile');
  };

  const loadTodaySummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      console.log('[BillingScreen] Loading today summary...');
      const response = await getTodaySummary();
      console.log('[BillingScreen] Summary response:', response);
      setSummaryData(response);
    } catch (error) {
      console.error('[BillingScreen] Summary error:', error);
      logError('BillingScreen.loadTodaySummary', error);
      setSummaryError(getUserFriendlyMessage(error));
    } finally {
      setSummaryLoading(false);
    }
  };

  const onRefresh = async () => {
    if (refreshing) return; // Prevent multiple simultaneous refreshes
    
    setRefreshing(true);
    try {
      // Clear search to show all refreshed jobs
      if (searchQuery) {
        setSearchQuery('');
      }
      // Refresh based on active tab
      if (activeTab === 'summary') {
        await loadTodaySummary();
      } else {
        await loadCompletedJobs();
      }
    } catch (error) {
      logError('BillingScreen.onRefresh', error);
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: string | undefined) => {
    if (!status) {
      return COLORS.textSecondary;
    }
    switch (status.toLowerCase()) {
      case 'completed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      default:
        return COLORS.textSecondary;
    }
  };

  const requestBluetoothPermissions = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true;
    }

    try {
      const granted = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      return (
        granted['android.permission.BLUETOOTH_CONNECT'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.BLUETOOTH_SCAN'] === PermissionsAndroid.RESULTS.GRANTED &&
        granted['android.permission.ACCESS_FINE_LOCATION'] === PermissionsAndroid.RESULTS.GRANTED
      );
    } catch (error) {
      logError('BillingScreen.requestBluetoothPermissions', error);
      return false;
    }
  };

  const handleScanPrinters = async () => {
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      Alert.alert(
        'Permission Required',
        'Bluetooth permissions are required to connect to printers.',
      );
      return;
    }

    setScanningPrinters(true);
    try {
      const devices = await printerService.scanForPrinters();
      setPrinters(devices);
      if (devices.length > 0) {
        setShowPrinterDialog(true);
      } else {
        Alert.alert(
          'No Printers Found',
          'No paired Bluetooth devices found. Please pair your printer in Bluetooth settings first.',
        );
      }
    } catch (error) {
      // Error is already handled in printerService with Alert dialog
      // Just log it here for debugging
      console.log('[BillingScreen] Scan error handled by printerService');
    } finally {
      setScanningPrinters(false);
    }
  };

  const handleConnectPrinter = async (printer: PrinterDevice) => {
    try {
      await printerService.connectToPrinter(printer);
      setConnectedPrinter(printer);
      setShowPrinterDialog(false);
      Alert.alert('Success', `Connected to ${printer.name}`);
    } catch (error) {
      logError('BillingScreen.handleConnectPrinter', error);
      
      // Provide more helpful error message with retry option
      Alert.alert(
        'Connection Failed',
        `Failed to connect to ${printer.name}.\n\nTips:\n• Make sure the printer is turned on\n• Ensure Bluetooth is enabled\n• Try moving closer to the printer\n• The printer may already be connected to another device`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Retry',
            onPress: () => handleConnectPrinter(printer),
          },
        ],
      );
    }
  };

  const handleGenerateBill = async (job: CompletedJob) => {
    setSelectedJob(job);
    setCalculatedAmount(null);
    setSettlementAmount('');
    setShowSettlementDialog(true);
    
    // Call calculate API
    setCalculatingAmount(true);
    try {
      const response = await calculateReceipt(job.bookingId);
      setCalculatedAmount(response.charges);
      setSettlementAmount(response.charges.toString());
    } catch (error) {
      logError('BillingScreen.handleGenerateBill', error);
      Alert.alert('Calculation Failed', getUserFriendlyMessage(error));
      setShowSettlementDialog(false);
    } finally {
      setCalculatingAmount(false);
    }
  };

  const handlePrintFromDialog = async () => {
    if (!selectedJob || !settlementAmount) {
      Alert.alert('Invalid Input', 'Please enter a settlement amount');
      return;
    }

    const overrideAmount = parseFloat(settlementAmount);
    if (isNaN(overrideAmount) || overrideAmount < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    setPrintingFromDialog(true);
    try {
      // Check if printer is connected
      if (!connectedPrinter) {
        Alert.alert(
          'Printer Not Connected',
          'Please connect to a printer first using the printer icon in the header.',
        );
        return;
      }

      // Call backend API with override amount
      const response = await printReceiptWithOverride(
        selectedJob.bookingId,
        selectedJob.vehicleNumber,
        overrideAmount
      );

      // Print to thermal printer
      await printerService.printRawData(response.printBuffer);

      // Close dialog and show success
      setShowSettlementDialog(false);
      Alert.alert(
        'Receipt Printed Successfully',
        `Vehicle: ${selectedJob.vehicleNumber}\nCharges: ₹${response.receiptData.charges}\nSettlement: ₹${response.receiptData.overrideAmount}\nDuration: ${response.receiptData.duration}`,
        [
          {
            text: 'Done',
            style: 'cancel',
            onPress: () => {
              // Remove printed job from list
              setCompletedJobs(prev => prev.filter(j => j.id !== selectedJob.id));
              setSelectedJob(null);
            },
          },
          {
            text: 'Reprint',
            onPress: () => {
              // Reprint the same receipt
              handlePrintFromDialog();
            },
          },
        ],
      );
    } catch (error) {
      logError('BillingScreen.handlePrintFromDialog', error);
      Alert.alert('Print Failed', getUserFriendlyMessage(error));
    } finally {
      setPrintingFromDialog(false);
    }
  };

  // Filter jobs based on active tab and receiptPrinted status
  const tabFilteredJobs = useMemo(() => {
    if (activeTab === 'all') {
      // All tab shows all completed jobs
      return completedJobs;
    } else if (activeTab === 'pending') {
      // Pending tab shows jobs with receiptPrinted = false
      return completedJobs.filter(job => job.receiptPrinted === false);
    }
    return completedJobs;
  }, [completedJobs, activeTab]);

  // Filter jobs based on search query
  const filteredJobs = useMemo(() => {
    if (!searchQuery.trim()) {
      return tabFilteredJobs;
    }

    const query = searchQuery.toLowerCase().trim();
    return tabFilteredJobs.filter(job => {
      // Search in vehicle number
      if (job.vehicleNumber.toLowerCase().includes(query)) {
        return true;
      }
      // Search in tag number
      if (job.tagNumber.toLowerCase().includes(query)) {
        return true;
      }
      // Search in customer phone
      if (job.customerPhone.toLowerCase().includes(query)) {
        return true;
      }
      return false;
    });
  }, [tabFilteredJobs, searchQuery]);

  const renderJobItem = ({item}: {item: CompletedJob}) => (
    <View style={styles.jobCard}>
      <View style={styles.jobHeader}>
        <Text style={styles.vehicleNumber}>{item.vehicleNumber}</Text>
        <Text style={styles.tagNumber}>Tag: {item.tagNumber}</Text>
      </View>

      <View style={styles.separator} />

      <View style={styles.jobDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Phone:</Text>
          <Text style={styles.detailValue}>{item.customerPhone}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Location:</Text>
          <Text style={styles.detailValue}>{item.locationDescription}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Slot:</Text>
          <Text style={styles.detailValue}>{item.slotOrZone}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Duration:</Text>
          <Text style={styles.durationValue}>{item.duration}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.printButton, printingJob === item.id && styles.printButtonDisabled]} 
        onPress={() => handleGenerateBill(item)}
        disabled={printingJob === item.id}>
        {printingJob === item.id ? (
          <>
            <ActivityIndicator size="small" color="#EF4444" />
            <Text style={styles.printButtonText}>Generating...</Text>
          </>
        ) : (
          <>
            <Text style={styles.printIcon}>📄</Text>
            <Text style={styles.printButtonText}>Generate Bill</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <LinearGradient
      colors={['#E3F2FD', '#F3E5F5', '#E8EAF6', '#E1F5FE']}
      start={{x: 0, y: 0}}
      end={{x: 1, y: 1}}
      style={styles.container}>
      
      {/* Header with logo, printer, and profile */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={urbaneaseLogo} style={styles.headerLogo} />
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.printerButton} 
            onPress={handleScanPrinters}
            disabled={scanningPrinters}>
            {scanningPrinters ? (
              <ActivityIndicator size="small" color={COLORS.gradientEnd} />
            ) : (
              <>
                <Text style={styles.printerIcon}>🖨️</Text>
                {connectedPrinter && <View style={styles.connectedDot} />}
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={handleProfile}>
            <LinearGradient
              colors={['#76D0E3', '#3156D8']}
              start={{x: 0, y: 0}}
              end={{x: 1, y: 1}}
              style={styles.profileIconButton}>
              <Text style={styles.profileIconText}>
                {session?.driverName?.trim().charAt(0).toUpperCase() || 'B'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Driver info section */}
      <View style={styles.driverSection}>
        <View style={styles.driverInfo}>
          <View style={styles.driverInfoLeft}>
            <Text style={styles.driverName}>{session?.driverName ?? 'Billing User'}</Text>
            <TouchableOpacity 
              style={styles.locationRow}
              onPress={() => !changingLocation && setShowLocationDropdown(!showLocationDropdown)}
              disabled={changingLocation}>
              <Image source={locationIcon} style={styles.locationIconImage} />
              <Text style={styles.locationText}>
                {changingLocation ? 'Changing location...' : (selectedLocation ? selectedLocation.name : 'Select Location')}
              </Text>
              {changingLocation ? (
                <ActivityIndicator size="small" color={COLORS.gradientEnd} style={{marginLeft: moderateScale(4)}} />
              ) : (
                <Text style={styles.dropdownArrow}>{showLocationDropdown ? '▲' : '▼'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        {/* Location Dropdown - Outside driverInfo to prevent overlap */}
        {showLocationDropdown && locations.length > 0 && !changingLocation && (
          <View style={styles.locationDropdown}>
            {locations.map((location) => (
              <TouchableOpacity
                key={location.id}
                style={[
                  styles.locationOption,
                  selectedLocation?.id === location.id && styles.locationOptionSelected
                ]}
                onPress={() => handleLocationSelect(location)}
                disabled={changingLocation}>
                <Text style={[
                  styles.locationOptionText,
                  selectedLocation?.id === location.id && styles.locationOptionTextSelected
                ]}>
                  {location.name}
                </Text>
                <Text style={styles.locationOptionAddress}>{location.address}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Overlay when dropdown is open */}
      {showLocationDropdown && (
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowLocationDropdown(false)}
        />
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by vehicle, tag, or phone number..."
            placeholderTextColor={COLORS.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {searchQuery.trim() && (
          <Text style={styles.searchResultText}>
            {filteredJobs.length} result{filteredJobs.length !== 1 ? 's' : ''} found
          </Text>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.activeTab]}
          onPress={() => setActiveTab('all')}>
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
          onPress={() => setActiveTab('pending')}>
          <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
            Pending
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'summary' && styles.activeTab]}
          onPress={() => setActiveTab('summary')}>
          <Text style={[styles.tabText, activeTab === 'summary' && styles.activeTabText]}>
            Summary
          </Text>
        </TouchableOpacity>
      </View>

      {/* Printer Selection Dialog */}
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
        />
      )}

      {showPrinterDialog && printers.length > 0 && (
        <View style={styles.printerDialogOverlay}>
          <View style={styles.printerDialogContainer}>
            <Text style={styles.printerDialogTitle}>Select Printer</Text>
            <ScrollView style={styles.printerList}>
              {printers.map((printer) => (
                <TouchableOpacity
                  key={printer.id}
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
      )}

      {/* Location Change Dialog */}
      <CustomDialog
        visible={dialog.visible}
        title={dialog.title}
        message={dialog.message}
        buttons={dialog.buttons}
        onDismiss={() => setDialog({...dialog, visible: false})}
      />

      {/* Settlement Dialog */}
      <Modal
        visible={showSettlementDialog}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSettlementDialog(false)}>
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
                  <Text style={styles.amountDisplay}>₹{calculatedAmount?.toFixed(2) || '0.00'}</Text>
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

                <View style={styles.dialogButtonsRow}>
                  <TouchableOpacity
                    style={styles.dialogCancelButton}
                    onPress={() => setShowSettlementDialog(false)}
                    disabled={printingFromDialog}>
                    <Text style={styles.dialogCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.dialogPrintButton, printingFromDialog && styles.dialogPrintButtonDisabled]}
                    onPress={handlePrintFromDialog}
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

      {/* Content Area */}
      {activeTab === 'all' && (
        loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.gradientEnd} />
            <Text style={styles.loadingText}>Loading all jobs...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadCompletedJobs}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : completedJobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>No jobs found</Text>
          </View>
        ) : filteredJobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>No jobs match your search</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => setSearchQuery('')}>
              <Text style={styles.retryButtonText}>Clear Search</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredJobs}
            renderItem={renderJobItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {activeTab === 'pending' && (
        loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.gradientEnd} />
            <Text style={styles.loadingText}>Loading pending jobs...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadCompletedJobs}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : tabFilteredJobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🚗</Text>
            <Text style={styles.emptyText}>No pending jobs found</Text>
            <Text style={styles.emptySubtext}>Jobs awaiting receipt printing</Text>
          </View>
        ) : filteredJobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyText}>No jobs match your search</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => setSearchQuery('')}>
              <Text style={styles.retryButtonText}>Clear Search</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredJobs}
            renderItem={renderJobItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}
          />
        )
      )}

      {activeTab === 'summary' && (
        summaryLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.gradientEnd} />
            <Text style={styles.loadingText}>Loading today's summary...</Text>
          </View>
        ) : summaryError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorEmoji}>⚠️</Text>
            <Text style={styles.errorText}>{summaryError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadTodaySummary}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : !summaryData ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📊</Text>
            <Text style={styles.emptyText}>No summary data available</Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.summaryContainer}
            contentContainerStyle={styles.summaryContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            showsVerticalScrollIndicator={false}>
            
            {/* Summary Header */}
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Today's Summary</Text>
              <Text style={styles.summaryDate}>{new Date(summaryData.date).toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</Text>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Text style={styles.statIcon}>🚗</Text>
                <Text style={styles.statValue}>{summaryData.summary.totalVehicles}</Text>
                <Text style={styles.statLabel}>Total Vehicles</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statIcon}>💰</Text>
                <Text style={styles.statValue}>₹{summaryData.summary.totalAmount.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Total Revenue</Text>
              </View>
            </View>

            {/* Recent Transactions */}
            {summaryData.transactions && summaryData.transactions.length > 0 && (
              <View style={styles.receiptsSection}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                {summaryData.transactions.map((transaction, index) => {
                  console.log('[BillingScreen] Transaction object:', transaction);
                  return (
                  <View key={`${transaction.bookingId}-${index}`} style={styles.receiptCard}>
                    <View style={styles.receiptHeader}>
                      <Text style={styles.receiptVehicle}>{transaction.vehicleNumber}</Text>
                      <Text style={styles.receiptTime}>
                        {new Date(transaction.printedAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                    <View style={styles.receiptDetails}>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Amount:</Text>
                        <Text style={styles.receiptAmount}>₹{(transaction.originalAmount || 0).toFixed(2)}</Text>
                      </View>
                      <View style={styles.receiptRow}>
                        <Text style={styles.receiptLabel}>Settlement:</Text>
                        <Text style={[styles.receiptAmount, transaction.wasOverridden && styles.receiptSettlement]}>
                          ₹{(transaction.amount || 0).toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: getResponsiveSpacing(20),
    paddingTop: verticalScale(50),
    paddingBottom: verticalScale(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerLogo: {
    height: verticalScale(40),
    width: moderateScale(150),
    resizeMode: 'contain',
    marginLeft: moderateScale(-50),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
  },
  iconButton: {
    padding: moderateScale(4),
  },
  profileIconButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconText: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: '#ffffff',
  },
  printerButton: {
    padding: moderateScale(8),
    position: 'relative',
  },
  printerIcon: {
    fontSize: getResponsiveFontSize(24),
  },
  connectedDot: {
    position: 'absolute',
    top: moderateScale(6),
    right: moderateScale(6),
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    backgroundColor: '#10B981',
  },
  driverSection: {
    backgroundColor: COLORS.backgroundLight,
    paddingHorizontal: getResponsiveSpacing(16),
    paddingVertical: verticalScale(12),
  },
  driverInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverInfoLeft: {
    flex: 1,
    marginRight: getResponsiveSpacing(12),
  },
  driverName: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(2),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  locationIconImage: {
    width: moderateScale(14),
    height: moderateScale(14),
  },
  locationText: {
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textSecondary,
  },
  dropdownArrow: {
    fontSize: getResponsiveFontSize(10),
    color: '#DC2626',
    marginLeft: moderateScale(4),
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1000,
  },
  locationDropdown: {
    position: 'absolute',
    top: verticalScale(60),
    left: getResponsiveSpacing(16),
    right: getResponsiveSpacing(16),
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12),
    maxHeight: verticalScale(200),
    ...SHADOWS.large,
    zIndex: 1001,
  },
  locationOption: {
    padding: getResponsiveSpacing(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  locationOptionSelected: {
    backgroundColor: COLORS.backgroundLight,
  },
  locationOptionText: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(2),
  },
  locationOptionTextSelected: {
    color: COLORS.gradientEnd,
  },
  locationOptionAddress: {
    fontSize: getResponsiveFontSize(12),
    color: COLORS.textSecondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSpacing(20),
  },
  loadingText: {
    fontSize: getResponsiveFontSize(16),
    color: COLORS.textSecondary,
    marginTop: verticalScale(12),
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSpacing(20),
  },
  errorEmoji: {
    fontSize: getResponsiveFontSize(48),
    marginBottom: verticalScale(12),
  },
  errorText: {
    fontSize: getResponsiveFontSize(16),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: verticalScale(20),
  },
  retryButton: {
    backgroundColor: COLORS.gradientEnd,
    paddingHorizontal: getResponsiveSpacing(24),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(8),
  },
  retryButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: COLORS.white,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: getResponsiveSpacing(20),
  },
  emptyEmoji: {
    fontSize: getResponsiveFontSize(64),
    marginBottom: verticalScale(16),
  },
  emptyText: {
    fontSize: getResponsiveFontSize(18),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  listContent: {
    padding: getResponsiveSpacing(16),
    paddingBottom: verticalScale(20),
  },
  jobCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12),
    padding: getResponsiveSpacing(16),
    marginBottom: verticalScale(12),
    ...SHADOWS.medium,
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: verticalScale(12),
  },
  jobHeaderLeft: {
    flex: 1,
  },
  vehicleNumber: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(4),
  },
  tagNumber: {
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: getResponsiveSpacing(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(6),
  },
  statusBadgeText: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '700',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginTop: verticalScale(8),
    marginBottom: verticalScale(12),
  },
  jobDetails: {
    gap: verticalScale(8),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  amountValue: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: '#10B981',
    flex: 2,
    textAlign: 'right',
  },
  durationValue: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '700',
    color: COLORS.gradientEnd,
    flex: 2,
    textAlign: 'right',
  },
  printButton: {
    marginTop: verticalScale(12),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(8),
  },
  printIcon: {
    fontSize: getResponsiveFontSize(20),
  },
  printButtonText: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#EF4444',
  },
  printButtonDisabled: {
    opacity: 0.5,
  },
  jobFooter: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: verticalScale(12),
  },
  jobId: {
    fontSize: getResponsiveFontSize(11),
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: getResponsiveFontSize(12),
    color: COLORS.textSecondary,
  },
  timeValue: {
    fontSize: getResponsiveFontSize(12),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  printerList: {
    maxHeight: verticalScale(300),
    marginTop: verticalScale(16),
  },
  printerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: getResponsiveSpacing(16),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  printerItemSelected: {
    backgroundColor: COLORS.backgroundLight,
  },
  printerItemContent: {
    flex: 1,
  },
  printerName: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(4),
  },
  printerAddress: {
    fontSize: getResponsiveFontSize(12),
    color: COLORS.textSecondary,
    fontFamily: 'monospace',
  },
  connectedBadge: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: '#10B981',
    marginLeft: getResponsiveSpacing(12),
  },
  printerDialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  printerDialogContainer: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    padding: getResponsiveSpacing(20),
    width: '85%',
    maxHeight: '70%',
    ...SHADOWS.large,
  },
  printerDialogTitle: {
    fontSize: getResponsiveFontSize(20),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(16),
    textAlign: 'center',
  },
  printerDialogButton: {
    backgroundColor: COLORS.backgroundLight,
    padding: getResponsiveSpacing(14),
    borderRadius: moderateScale(8),
    marginTop: verticalScale(16),
    alignItems: 'center',
  },
  printerDialogButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  searchContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: getResponsiveSpacing(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: moderateScale(12),
    paddingHorizontal: getResponsiveSpacing(12),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    fontSize: getResponsiveFontSize(18),
    marginRight: getResponsiveSpacing(8),
  },
  searchInput: {
    flex: 1,
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textPrimary,
    paddingVertical: verticalScale(10),
  },
  clearButton: {
    padding: moderateScale(4),
  },
  clearButtonText: {
    fontSize: getResponsiveFontSize(18),
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  searchResultText: {
    fontSize: getResponsiveFontSize(12),
    color: COLORS.textSecondary,
    marginTop: verticalScale(8),
    textAlign: 'center',
  },
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
    maxWidth: moderateScale(400),
    ...SHADOWS.large,
  },
  settlementDialogTitle: {
    fontSize: getResponsiveFontSize(22),
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
    fontSize: getResponsiveFontSize(16),
    color: COLORS.textSecondary,
    marginTop: verticalScale(12),
  },
  amountDisplayContainer: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: moderateScale(12),
    padding: getResponsiveSpacing(16),
    marginBottom: verticalScale(20),
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textSecondary,
    marginBottom: verticalScale(8),
  },
  amountDisplay: {
    fontSize: getResponsiveFontSize(32),
    fontWeight: '700',
    color: '#10B981',
  },
  inputContainer: {
    marginBottom: verticalScale(24),
  },
  inputLabel: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(8),
  },
  settlementInput: {
    backgroundColor: COLORS.backgroundLight,
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: getResponsiveSpacing(16),
    paddingVertical: verticalScale(12),
    fontSize: getResponsiveFontSize(18),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dialogButtonsRow: {
    flexDirection: 'row',
    gap: moderateScale(12),
  },
  dialogCancelButton: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(14),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dialogCancelButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  dialogPrintButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: moderateScale(12),
    paddingVertical: verticalScale(14),
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: moderateScale(8),
  },
  dialogPrintButtonDisabled: {
    opacity: 0.6,
  },
  dialogPrintIcon: {
    fontSize: getResponsiveFontSize(18),
  },
  dialogPrintButtonText: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '600',
    color: '#ffffff',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: getResponsiveSpacing(16),
  },
  tab: {
    flex: 1,
    paddingVertical: verticalScale(14),
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: COLORS.gradientEnd,
  },
  tabText: {
    fontSize: getResponsiveFontSize(15),
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  activeTabText: {
    color: COLORS.gradientEnd,
  },
  emptySubtext: {
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: verticalScale(8),
  },
  summaryContainer: {
    flex: 1,
  },
  summaryContent: {
    padding: getResponsiveSpacing(16),
  },
  summaryHeader: {
    marginBottom: verticalScale(24),
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(8),
  },
  summaryDate: {
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(12),
    marginBottom: verticalScale(24),
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(16),
    padding: getResponsiveSpacing(16),
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  statIcon: {
    fontSize: getResponsiveFontSize(32),
    marginBottom: verticalScale(8),
  },
  statValue: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(4),
  },
  statLabel: {
    fontSize: getResponsiveFontSize(12),
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  receiptsSection: {
    marginTop: verticalScale(8),
  },
  sectionTitle: {
    fontSize: getResponsiveFontSize(18),
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: verticalScale(12),
  },
  receiptCard: {
    backgroundColor: COLORS.white,
    borderRadius: moderateScale(12),
    padding: getResponsiveSpacing(16),
    marginBottom: verticalScale(12),
    ...SHADOWS.small,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: verticalScale(12),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  receiptVehicle: {
    fontSize: getResponsiveFontSize(16),
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  receiptTime: {
    fontSize: getResponsiveFontSize(12),
    color: COLORS.textSecondary,
  },
  receiptDetails: {
    gap: verticalScale(8),
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    fontSize: getResponsiveFontSize(14),
    color: COLORS.textSecondary,
  },
  receiptAmount: {
    fontSize: getResponsiveFontSize(14),
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  receiptSettlement: {
    color: '#10B981',
  },
});
