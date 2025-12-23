import {Platform, PermissionsAndroid} from 'react-native';
import Geolocation from '@react-native-community/geolocation';

export type WeatherData = {
  temp: number;
  condition: string;
  location: string;
};

// Using wttr.in - a free weather service that doesn't require API key
const WEATHER_API_BASE = 'https://wttr.in';

/**
 * Request location permission on Android
 */
async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'This app needs access to your location to show accurate weather information.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.warn('[Weather] Location permission error:', err);
      return false;
    }
  }
  return true; // iOS handles permissions automatically
}

/**
 * Get device GPS coordinates
 */
async function getDeviceLocation(): Promise<{latitude: number; longitude: number} | null> {
  try {
    // Request permission first
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      console.log('[Weather] Location permission denied');
      return null;
    }

    return new Promise((resolve, reject) => {
      Geolocation.getCurrentPosition(
        (position) => {
          console.log('[Weather] GPS location obtained:', position.coords.latitude, position.coords.longitude);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('[Weather] GPS error:', error);
          reject(error);
        },
        {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 10000,
        },
      );
    });
  } catch (error) {
    console.error('[Weather] Failed to get device location:', error);
    return null;
  }
}

/**
 * Parse wttr.in weather description to simple condition
 */
function parseWeatherCondition(description: string): string {
  const desc = description.toLowerCase();
  
  if (desc.includes('sunny') || desc.includes('clear')) return 'Sunny';
  if (desc.includes('rain') || desc.includes('drizzle')) return 'Rainy';
  if (desc.includes('cloud') || desc.includes('overcast')) return 'Cloudy';
  if (desc.includes('thunder') || desc.includes('storm')) return 'Stormy';
  if (desc.includes('snow')) return 'Snowy';
  if (desc.includes('fog') || desc.includes('mist')) return 'Foggy';
  
  return description;
}

/**
 * Fetch weather data from wttr.in API using device GPS location
 */
export async function fetchWeatherData(): Promise<WeatherData> {
  try {
    // Get device GPS coordinates
    const coords = await getDeviceLocation();
    
    let locationQuery: string;
    if (coords) {
      // Use GPS coordinates
      locationQuery = `${coords.latitude},${coords.longitude}`;
      console.log('[Weather] Using GPS coordinates:', locationQuery);
    } else {
      // Fallback to default location if GPS fails
      locationQuery = 'Hyderabad';
      console.log('[Weather] GPS unavailable, using fallback location:', locationQuery);
    }

    // Fetch weather data from wttr.in in JSON format
    const url = `${WEATHER_API_BASE}/${encodeURIComponent(locationQuery)}?format=j1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'UrbanEaseValet/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Weather] API response received');

    const currentCondition = data.current_condition[0];
    const weatherData: WeatherData = {
      temp: Math.round(parseFloat(currentCondition.temp_C)),
      condition: parseWeatherCondition(currentCondition.weatherDesc[0].value),
      location: data.nearest_area[0].areaName[0].value || 'Unknown',
    };

    console.log('[Weather] Parsed data:', weatherData);
    return weatherData;
  } catch (error: any) {
    console.error('[Weather] Error fetching weather:', error);
    throw new Error(error.message || 'Unable to fetch weather data');
  }
}

/**
 * Get fallback weather data (used when API fails)
 */
export function getFallbackWeather(): WeatherData {
  return {
    temp: 25,
    condition: 'Unavailable',
    location: 'Unknown',
  };
}
