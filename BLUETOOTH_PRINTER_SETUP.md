# Bluetooth Thermal Printer Setup Guide

This guide explains the receipt printing functionality in the Valet Mobile App.

## ⚠️ Current Status: Mock Implementation

**The app currently uses a MOCK printer service** due to compatibility issues with the `react-native-bluetooth-classic` library and newer React Native versions.

### What Works Now:
✅ Complete UI for printer connection and printing
✅ Printer scanning and selection dialog
✅ Print button on each completed job
✅ API integration for receipt data
✅ Loading states and error handling
✅ Job removal after successful print

### What's Mocked:
- Bluetooth device scanning (returns 2 mock printers)
- Bluetooth connection (simulates connection)
- Actual printing to thermal printer (simulates print delay)

## Overview

When a billing user clicks the Print button on a completed job, the app:
1. Checks if a Bluetooth printer is connected
2. Prompts to scan and connect if not connected
3. Shows confirmation dialog
4. Calls backend API to get receipt data (`/api/v1/receipt/print`)
5. Simulates printing (or prints to real printer when implemented)
6. Shows success message and removes the printed job from the list

## Current Implementation (Mock)

The mock printer service is located at `src/services/printerService.ts` and provides:
- Mock printer scanning (returns 2 test printers)
- Mock connection with 500ms delay
- Mock printing with 1000ms delay
- All console logs for debugging

**No additional dependencies are required** - the app runs with standard React Native packages.

## Android Permissions

Bluetooth permissions have been added to `android/app/src/main/AndroidManifest.xml` for future real implementation:

```xml
<!-- Bluetooth permissions for thermal printer -->
<uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
<uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

## Usage

### For Billing Users

1. **Connect to Printer (First Time)**
   - Tap the printer icon (🖨️) in the header
   - Grant Bluetooth permissions if prompted
   - Select your thermal printer from the list
   - A green dot will appear on the printer icon when connected

2. **Print a Receipt**
   - Find the completed job you want to print
   - Tap the "Print" button at the bottom of the job card
   - Confirm the print action
   - Receipt will be printed and the job will be removed from the list

3. **Reconnect Printer**
   - If the printer disconnects, tap the printer icon again
   - Select the printer to reconnect

### Printer Requirements

- Must be a Bluetooth thermal printer (ESC/POS compatible)
- Must be paired with the Android device in Bluetooth settings
- Must be turned on and in range

## Backend API

### Endpoint: POST /api/v1/receipt/print

**Request:**
```json
{
  "bookingId": "string",
  "vehicleNumber": "string",
  "returnBuffer": true
}
```

**Response:**
```json
{
  "success": true,
  "printBuffer": "base64_encoded_ESC_POS_commands",
  "receiptData": {
    "charges": 100,
    "duration": "2h 30min",
    "vehicleNumber": "KA01AB1234",
    "bookingId": "abc-123",
    "timestamp": "2024-12-20T12:00:00Z"
  }
}
```

The `printBuffer` should contain base64-encoded ESC/POS commands that the thermal printer can understand.

## Files Created/Modified

### New Files:
- `src/services/printerService.ts` - Bluetooth printer service
- `src/api/receipt.ts` - Receipt printing API
- `BLUETOOTH_PRINTER_SETUP.md` - This documentation

### Modified Files:
- `android/app/src/main/AndroidManifest.xml` - Added Bluetooth permissions
- `src/screens/BillingScreen.tsx` - Added printer connection and print functionality

## Troubleshooting

### Printer Not Found
- Ensure the printer is paired in Android Bluetooth settings
- Make sure the printer is turned on
- Check if the printer is in range

### Print Failed
- Verify the printer is still connected
- Check if the printer has paper
- Ensure the backend API is returning valid ESC/POS commands

### Permission Denied
- Go to Android Settings → Apps → Valet App → Permissions
- Enable Bluetooth and Location permissions

### Connection Lost
- Tap the printer icon to reconnect
- If issues persist, unpair and re-pair the printer in Bluetooth settings

## Features

✅ Scan for paired Bluetooth devices
✅ Connect to thermal printer
✅ Visual indicator when printer is connected
✅ Print receipts with backend-generated data
✅ Automatic job removal after successful print
✅ Loading states during printing
✅ Comprehensive error handling
✅ Permission management
✅ Confirmation dialogs

## Security Notes

- Bluetooth permissions are only requested when needed
- Location permission is required for Bluetooth scanning on Android 12+
- All API calls use authentication tokens
- Print data is transmitted securely via HTTPS

## Future Implementation Options

When ready to implement real Bluetooth printing, consider these approaches:

### Option 1: Native Module (Recommended)
Create a custom native module for Android that directly interfaces with Bluetooth thermal printers using Android's Bluetooth APIs. This provides the most control and compatibility.

### Option 2: react-native-ble-plx
For BLE (Bluetooth Low Energy) thermal printers, use `react-native-ble-plx` which has better compatibility with newer React Native versions.

### Option 3: Updated Bluetooth Classic Library
Wait for an updated version of `react-native-bluetooth-classic` that's compatible with React Native 0.70+ and Android Gradle Plugin 8+.

### Option 4: Third-Party Printer SDKs
Some thermal printer manufacturers provide their own React Native SDKs (e.g., Zebra, Star Micronics, Epson).

## Implementation Steps for Real Bluetooth

1. Choose one of the options above
2. Replace the mock implementation in `src/services/printerService.ts`
3. Install required dependencies
4. Test with actual thermal printer hardware
5. Update this documentation

## Support

For issues or questions, contact the development team.
