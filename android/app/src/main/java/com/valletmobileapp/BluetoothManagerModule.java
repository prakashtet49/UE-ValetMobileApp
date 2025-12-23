package com.valletmobileapp;

import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.bridge.Arguments;
import java.util.Set;

public class BluetoothManagerModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "BluetoothManager";

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
}
