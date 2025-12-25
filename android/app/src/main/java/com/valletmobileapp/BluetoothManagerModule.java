package com.valletmobileapp;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.util.Base64;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import java.io.OutputStream;
import java.util.Set;
import java.util.UUID;

public class BluetoothManagerModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "BluetoothManager";
    private static final UUID PRINTER_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");
    
    private BluetoothSocket bluetoothSocket;
    private OutputStream outputStream;
    private String connectedDeviceAddress;

    public BluetoothManagerModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void getBondedDevices(Promise promise) {
        try {
            BluetoothAdapter bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
            
            if (bluetoothAdapter == null) {
                promise.reject("BLUETOOTH_NOT_AVAILABLE", "Bluetooth is not available on this device");
                return;
            }

            if (!bluetoothAdapter.isEnabled()) {
                promise.reject("BLUETOOTH_DISABLED", "Bluetooth is disabled");
                return;
            }

            Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
            WritableArray devices = Arguments.createArray();

            if (pairedDevices != null && pairedDevices.size() > 0) {
                for (BluetoothDevice device : pairedDevices) {
                    WritableMap deviceMap = Arguments.createMap();
                    deviceMap.putString("name", device.getName());
                    deviceMap.putString("address", device.getAddress());
                    devices.pushMap(deviceMap);
                }
            }

            promise.resolve(devices);
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to get bonded devices: " + e.getMessage());
        }
    }

    @ReactMethod
    public void connectToDevice(String address, Promise promise) {
        new Thread(() -> {
            try {
                // Close existing connection if any
                disconnect();

                BluetoothAdapter bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
                if (bluetoothAdapter == null) {
                    promise.reject("BLUETOOTH_NOT_AVAILABLE", "Bluetooth is not available");
                    return;
                }

                if (!bluetoothAdapter.isEnabled()) {
                    promise.reject("BLUETOOTH_DISABLED", "Bluetooth is disabled");
                    return;
                }

                BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
                
                // Try to connect using standard SPP UUID
                try {
                    bluetoothSocket = device.createRfcommSocketToServiceRecord(PRINTER_UUID);
                    bluetoothSocket.connect();
                } catch (Exception e) {
                    // If standard connection fails, try fallback method
                    try {
                        bluetoothSocket = (BluetoothSocket) device.getClass()
                            .getMethod("createRfcommSocket", new Class[] {int.class})
                            .invoke(device, 1);
                        bluetoothSocket.connect();
                    } catch (Exception e2) {
                        throw new Exception("Failed to connect using both methods: " + e2.getMessage());
                    }
                }
                
                outputStream = bluetoothSocket.getOutputStream();
                connectedDeviceAddress = address;

                promise.resolve(true);
            } catch (Exception e) {
                disconnect();
                promise.reject("CONNECTION_FAILED", "Failed to connect: " + e.getMessage());
            }
        }).start();
    }

    @ReactMethod
    public void disconnect() {
        try {
            if (outputStream != null) {
                outputStream.close();
                outputStream = null;
            }
            if (bluetoothSocket != null) {
                bluetoothSocket.close();
                bluetoothSocket = null;
            }
            connectedDeviceAddress = null;
        } catch (Exception e) {
            // Ignore errors during disconnect
        }
    }

    @ReactMethod
    public void isConnected(Promise promise) {
        boolean connected = bluetoothSocket != null && bluetoothSocket.isConnected();
        promise.resolve(connected);
    }

    @ReactMethod
    public void printRawData(String base64Data, Promise promise) {
        new Thread(() -> {
            try {
                if (outputStream == null || bluetoothSocket == null || !bluetoothSocket.isConnected()) {
                    promise.reject("NOT_CONNECTED", "Printer is not connected");
                    return;
                }

                // Decode base64 data to byte array
                byte[] data = Base64.decode(base64Data, Base64.DEFAULT);
                
                // Write data to printer in chunks to avoid buffer overflow
                int chunkSize = 1024;
                for (int i = 0; i < data.length; i += chunkSize) {
                    int length = Math.min(chunkSize, data.length - i);
                    outputStream.write(data, i, length);
                    outputStream.flush();
                    
                    // Small delay between chunks
                    try {
                        Thread.sleep(50);
                    } catch (InterruptedException e) {
                        // Ignore
                    }
                }

                promise.resolve(true);
            } catch (Exception e) {
                promise.reject("PRINT_FAILED", "Failed to print: " + e.getMessage());
            }
        }).start();
    }
}
