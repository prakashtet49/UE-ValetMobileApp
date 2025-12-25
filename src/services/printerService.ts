import {logError} from '../utils/errorHandler';
import {NativeModules, Platform, Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const {BluetoothManager} = NativeModules;

const PRINTER_STORAGE_KEY = '@connected_printer';

export type PrinterDevice = {
  id: string;
  name: string;
  address: string;
  bonded: boolean;
};

/**
 * Printer Service using Native Bluetooth
 * 
 * This service uses Android's native Bluetooth APIs to scan for and connect to
 * actual Bluetooth thermal printers. It filters devices to show only paired
 * Bluetooth devices that are likely to be printers.
 */
class PrinterService {
  private connectedDeviceInfo: PrinterDevice | null = null;

  /**
   * Request Bluetooth permissions
   */
  async requestBluetoothPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.log('[PrinterService] Bluetooth only supported on Android');
      return false;
    }

    try {
      // Permissions are already in AndroidManifest.xml
      // This method can be extended to request runtime permissions if needed
      console.log('[PrinterService] Bluetooth permissions check');
      return true;
    } catch (error) {
      logError('PrinterService.requestBluetoothPermissions', error);
      return false;
    }
  }

  /**
   * Scan for bonded (paired) Bluetooth devices
   * Filters to show only devices that could be printers
   */
  async scanForPrinters(): Promise<PrinterDevice[]> {
    console.log('[PrinterService] Scanning for paired Bluetooth devices...');
    
    try {
      if (Platform.OS !== 'android') {
        console.log('[PrinterService] Bluetooth scanning only supported on Android');
        return [];
      }

      // Use native module if available, otherwise fall back to empty list
      if (!BluetoothManager || !BluetoothManager.getBondedDevices) {
        console.log('[PrinterService] Native Bluetooth module not available');
        console.log('[PrinterService] Please pair your printer in Android Bluetooth settings');
        return [];
      }

      const devices = await BluetoothManager.getBondedDevices();
      console.log('[PrinterService] Found bonded devices:', devices?.length || 0);
      
      if (!devices || devices.length === 0) {
        console.log('[PrinterService] No bonded devices found');
        return [];
      }

      // Log all bonded devices for debugging
      console.log('[PrinterService] All bonded devices:');
      devices.forEach((device: any, index: number) => {
        console.log(`  ${index + 1}. Name: "${device.name}", Address: ${device.address}`);
      });

      // Filter and map devices - Show ALL bonded devices for now
      // This allows users to see and select any paired Bluetooth device
      const printers = devices
        .filter((device: any) => {
          // Only filter out devices without proper info
          if (!device.address || !device.name) {
            console.log('[PrinterService] Filtered out device with missing info:', device);
            return false;
          }
          return true;
        })
        .map((device: any) => ({
          id: device.address,
          name: device.name || 'Unknown Device',
          address: device.address,
          bonded: true,
        }));

      console.log('[PrinterService] Showing all paired devices:', printers.length);
      printers.forEach((printer: PrinterDevice, index: number) => {
        console.log(`  ${index + 1}. ${printer.name} (${printer.address})`);
      });
      
      return printers;
    } catch (error: any) {
      // Check if it's a Bluetooth disabled error
      if (error?.code === 'BLUETOOTH_DISABLED' || 
          error?.message?.toLowerCase().includes('bluetooth is disabled')) {
        Alert.alert(
          'Bluetooth Disabled',
          'Please enable Bluetooth to scan for printers.',
          [
            {text: 'OK', style: 'default'}
          ]
        );
        return [];
      }
      
      // For other errors, log and show generic message
      logError('PrinterService.scanForPrinters', error);
      Alert.alert(
        'Scan Failed',
        'Unable to scan for printers. Please check Bluetooth is enabled and permissions are granted.',
        [{text: 'OK', style: 'default'}]
      );
      return [];
    }
  }

  /**
   * Connect to a specific Bluetooth printer
   */
  async connectToPrinter(device: PrinterDevice): Promise<boolean> {
    console.log('[PrinterService] Connecting to printer:', device.name);
    
    try {
      if (Platform.OS !== 'android') {
        console.log('[PrinterService] Bluetooth printing only supported on Android');
        return false;
      }

      if (!BluetoothManager || !BluetoothManager.connectToDevice) {
        console.log('[PrinterService] Native Bluetooth module not available');
        return false;
      }

      await BluetoothManager.connectToDevice(device.address);
      this.connectedDeviceInfo = device;
      
      // Save connected printer to AsyncStorage for persistence
      await this.saveConnectedPrinter(device);
      
      console.log('[PrinterService] Connected to printer:', device.name);
      return true;
    } catch (error) {
      logError('PrinterService.connectToPrinter', error);
      throw error;
    }
  }

  /**
   * Disconnect from current printer
   */
  async disconnect(): Promise<void> {
    console.log('[PrinterService] Disconnecting from printer');
    
    try {
      if (Platform.OS === 'android' && BluetoothManager && BluetoothManager.disconnect) {
        BluetoothManager.disconnect();
      }
      this.connectedDeviceInfo = null;
      
      // Clear saved printer from storage
      await this.clearSavedPrinter();
    } catch (error) {
      logError('PrinterService.disconnect', error);
    }
  }

  /**
   * Save connected printer to AsyncStorage
   */
  private async saveConnectedPrinter(device: PrinterDevice): Promise<void> {
    try {
      await AsyncStorage.setItem(PRINTER_STORAGE_KEY, JSON.stringify(device));
      console.log('[PrinterService] Saved printer to storage:', device.name);
    } catch (error) {
      logError('PrinterService.saveConnectedPrinter', error);
    }
  }

  /**
   * Load saved printer from AsyncStorage
   */
  private async loadSavedPrinter(): Promise<PrinterDevice | null> {
    try {
      const saved = await AsyncStorage.getItem(PRINTER_STORAGE_KEY);
      if (saved) {
        const device = JSON.parse(saved) as PrinterDevice;
        console.log('[PrinterService] Loaded saved printer:', device.name);
        return device;
      }
      return null;
    } catch (error) {
      logError('PrinterService.loadSavedPrinter', error);
      return null;
    }
  }

  /**
   * Clear saved printer from AsyncStorage
   */
  private async clearSavedPrinter(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PRINTER_STORAGE_KEY);
      console.log('[PrinterService] Cleared saved printer from storage');
    } catch (error) {
      logError('PrinterService.clearSavedPrinter', error);
    }
  }

  /**
   * Auto-reconnect to last connected printer
   */
  async autoReconnect(): Promise<boolean> {
    console.log('[PrinterService] Attempting auto-reconnect...');
    
    try {
      const savedPrinter = await this.loadSavedPrinter();
      if (!savedPrinter) {
        console.log('[PrinterService] No saved printer found');
        return false;
      }

      console.log('[PrinterService] Found saved printer, attempting to reconnect:', savedPrinter.name);
      
      // Try to reconnect
      const connected = await this.connectToPrinter(savedPrinter);
      
      if (connected) {
        console.log('[PrinterService] Auto-reconnect successful');
      } else {
        console.log('[PrinterService] Auto-reconnect failed');
      }
      
      return connected;
    } catch (error) {
      logError('PrinterService.autoReconnect', error);
      console.log('[PrinterService] Auto-reconnect failed with error');
      return false;
    }
  }

  /**
   * Check if printer is connected
   */
  isConnected(): boolean {
    return this.connectedDeviceInfo !== null;
  }

  /**
   * Get connected printer info
   */
  getConnectedPrinter(): PrinterDevice | null {
    return this.connectedDeviceInfo;
  }

  /**
   * Print raw data to thermal printer
   */
  async printRawData(base64Data: string): Promise<void> {
    if (!this.connectedDeviceInfo) {
      throw new Error('No printer connected. Please connect to a printer first.');
    }

    console.log('[PrinterService] Printing data...');
    console.log('[PrinterService] Base64 data length:', base64Data.length);
    
    try {
      if (Platform.OS !== 'android') {
        throw new Error('Bluetooth printing only supported on Android');
      }

      if (!BluetoothManager || !BluetoothManager.printRawData) {
        throw new Error('Native Bluetooth module not available');
      }

      await BluetoothManager.printRawData(base64Data);
      console.log('[PrinterService] Print completed successfully');
    } catch (error) {
      logError('PrinterService.printRawData', error);
      throw error;
    }
  }

  /**
   * Check printer connection status
   */
  async checkConnection(): Promise<boolean> {
    try {
      if (Platform.OS !== 'android') {
        return false;
      }

      if (!BluetoothManager || !BluetoothManager.isConnected) {
        return this.connectedDeviceInfo !== null;
      }

      const connected = await BluetoothManager.isConnected();
      
      // Update local state if disconnected
      if (!connected) {
        this.connectedDeviceInfo = null;
      }
      
      return connected;
    } catch (error) {
      logError('PrinterService.checkConnection', error);
      return false;
    }
  }
}

export default new PrinterService();
