import {launchCamera, ImagePickerResponse, CameraOptions} from 'react-native-image-picker';
import {PermissionsAndroid, Platform} from 'react-native';
import {logError, getUserFriendlyMessage} from './errorHandler';

/**
 * Request camera permission
 */
export async function requestCameraPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Camera Permission',
          message: 'This app needs camera access to take photos',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // iOS handles permissions automatically
  } catch (error) {
    logError('requestCameraPermission', error);
    return false;
  }
}

/**
 * Safe camera launch with error handling
 */
export async function safeLaunchCamera(
  options: CameraOptions = {mediaType: 'photo'},
): Promise<ImagePickerResponse | null> {
  try {
    // Request permission first
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      throw new Error('Camera permission denied');
    }

    // Launch camera
    const response = await new Promise<ImagePickerResponse>((resolve, reject) => {
      launchCamera(options, (result) => {
        if (result.errorCode) {
          reject(new Error(result.errorMessage || 'Camera error'));
        } else {
          resolve(result);
        }
      });
    });

    // Check if user cancelled
    if (response.didCancel) {
      console.log('[Camera] User cancelled');
      return null;
    }

    // Check for errors
    if (response.errorCode || response.errorMessage) {
      throw new Error(response.errorMessage || 'Camera error');
    }

    return response;
  } catch (error) {
    logError('safeLaunchCamera', error);
    throw error; // Re-throw so caller can handle
  }
}

/**
 * Get user-friendly camera error message
 */
export function getCameraErrorMessage(error: any): string {
  if (error?.message?.includes('permission')) {
    return 'Camera permission is required. Please enable it in settings.';
  }
  if (error?.message?.includes('cancelled')) {
    return 'Camera was cancelled';
  }
  return getUserFriendlyMessage(error);
}
