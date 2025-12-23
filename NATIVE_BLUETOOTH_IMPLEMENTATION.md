# Native Bluetooth Implementation

## Overview

The printer service now uses a **native Android Bluetooth module** to scan for real paired Bluetooth devices instead of showing mock printers.

## What Changed

### 1. Removed Mock Printers
- No more dummy "Thermal Printer 1" and "Thermal Printer 2"
- Only shows actual paired Bluetooth devices

### 2. Smart Printer Filtering
The service filters Bluetooth devices to show only those likely to be printers based on common naming patterns:
- Contains "printer"
- Contains "thermal"
- Contains "pos" (Point of Sale)
- Contains "receipt"
- Contains "bluetooth"
- Contains "bt-"
- Contains "rpp" (Receipt Printer Protocol)
- Contains "mpt" (Mobile Printer Terminal)
- Contains "zj-" (common printer brand prefix)
- Contains "tp-" (Thermal Printer prefix)

### 3. Native Android Module
Created custom native module: `BluetoothManagerModule.java`
- Accesses Android's BluetoothAdapter
- Retrieves bonded (paired) devices
- Returns device name and MAC address

## Files Created/Modified

### New Files:
1. **`android/app/src/main/java/com/valletmobileapp/BluetoothManagerModule.java`**
   - Native module to access Android Bluetooth API
   - Method: `getBondedDevices()` - returns all paired devices

2. **`android/app/src/main/java/com/valletmobileapp/BluetoothManagerPackage.java`**
   - Package to register the native module

### Modified Files:
1. **`src/services/printerService.ts`**
   - Replaced mock implementation with native Bluetooth scanning
   - Added printer name filtering logic
   - Improved error handling and logging

2. **`android/app/src/main/java/com/valletmobileapp/MainApplication.kt`**
   - Registered BluetoothManagerPackage

## How It Works

1. **User taps printer icon** → Calls `scanForPrinters()`
2. **Service checks platform** → Android only (iOS not supported yet)
3. **Calls native module** → `BluetoothManager.getBondedDevices()`
4. **Gets paired devices** → All Bluetooth devices paired in Android settings
5. **Filters by name** → Only shows devices matching printer patterns
6. **Returns list** → Shows in printer selection dialog

## User Instructions

### To Use a Bluetooth Printer:

1. **Pair the printer first** in Android Bluetooth settings:
   - Go to Android Settings → Bluetooth
   - Turn on Bluetooth
   - Pair with your thermal printer
   - Note: Printer must be turned on and in pairing mode

2. **In the app**:
   - Tap the printer icon (🖨️) in header
   - Your paired printer should appear in the list
   - If it doesn't appear, check if the printer name contains common keywords
   - Select the printer to connect

### Troubleshooting:

**Printer doesn't appear in list:**
- Ensure printer is paired in Android Bluetooth settings
- Check if printer name contains keywords like "printer", "thermal", "POS", etc.
- If printer has an unusual name, it may be filtered out
- Check console logs for all bonded devices

**No devices found:**
- Make sure Bluetooth is enabled on the phone
- Pair at least one Bluetooth device in Android settings
- Check app permissions for Bluetooth

## Console Logs

The service provides detailed logging:
```
[PrinterService] Scanning for paired Bluetooth devices...
[PrinterService] Found bonded devices: 5
[PrinterService] Found potential printers: 1
```

## Future Enhancements

1. **Add manual device selection** - Allow users to select any Bluetooth device, not just filtered ones
2. **iOS support** - Implement iOS Bluetooth scanning
3. **Device class filtering** - Use Bluetooth device class to identify printers more accurately
4. **Connection testing** - Test connection before showing device as available
5. **Remember last printer** - Auto-connect to previously used printer

## Technical Notes

- Uses Android's `BluetoothAdapter.getBondedDevices()`
- Only shows paired devices (not discoverable devices)
- Filtering is case-insensitive
- No additional dependencies required
- Native module is lightweight and fast
