import {logError} from '../utils/errorHandler';
import {NativeModules, Platform} from 'react-native';

const {BluetoothManager} = NativeModules;

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
        return [];
      }

      // Filter and map devices
      const printers = devices
        .filter((device: any) => {
          // Filter out devices without proper info
          if (!device.address || !device.name) {
            return false;
          }
          
          // Common printer name patterns (case-insensitive)
          const name = device.name.toLowerCase();
          const isPrinter = 
            name.includes('printer') ||
            name.includes('thermal') ||
            name.includes('pos') ||
            name.includes('receipt') ||
            name.includes('bluetooth') ||
            name.includes('bt-') ||
            name.includes('rpp') ||
            name.includes('mpt') ||
            name.includes('zj-') ||
            name.includes('tp-');
          
          return isPrinter;
        })
        .map((device: any) => ({
          id: device.address,
          name: device.name || 'Unknown Device',
          address: device.address,
          bonded: true,
        }));

      console.log('[PrinterService] Found potential printers:', printers.length);
      return printers;
    } catch (error) {
      logError('PrinterService.scanForPrinters', error);
      console.log('[PrinterService] Error scanning for printers, returning empty list');
      return [];
    }
  }

  /**
   * Connect to a specific Bluetooth printer (Mock)
   */
  async connectToPrinter(device: PrinterDevice): Promise<boolean> {
    console.log('[PrinterService] Mock: Connecting to printer:', device.name);
    
    // Simulate connection delay
    await new Promise<void>(resolve => setTimeout(() => resolve(), 500));
    
    this.connectedDeviceInfo = device;
    console.log('[PrinterService] Mock: Connected to printer:', device.name);
    return true;
  }

  /**
   * Disconnect from current printer (Mock)
   */
  async disconnect(): Promise<void> {
    console.log('[PrinterService] Mock: Disconnecting from printer');
    this.connectedDeviceInfo = null;
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
   * Print raw data to thermal printer (Mock)
   */
  async printRawData(base64Data: string): Promise<void> {
    if (!this.connectedDeviceInfo) {
      throw new Error('No printer connected. Please connect to a printer first.');
    }

    console.log('[PrinterService] Mock: Printing data...');
    console.log('[PrinterService] Mock: Base64 data length:', base64Data.length);
    
    // Simulate printing delay
    await new Promise<void>(resolve => setTimeout(() => resolve(), 1000));
    
    console.log('[PrinterService] Mock: Print completed successfully');
  }

  /**
   * Check printer connection status (Mock)
   */
  async checkConnection(): Promise<boolean> {
    return this.connectedDeviceInfo !== null;
  }
}

export default new PrinterService();
