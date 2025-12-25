import {BASE_URL, ApiException, HttpMethod} from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'urbanease.accessToken';
const REFRESH_TOKEN_KEY = 'urbanease.refreshToken';
const SESSION_DATA_KEY = 'urbanease.sessionData';
const SESSION_TIMESTAMP_KEY = 'urbanease.sessionTimestamp';

const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function setStoredTokens(accessToken: string, refreshToken?: string) {
  await AsyncStorage.multiSet([
    [ACCESS_TOKEN_KEY, accessToken],
    [REFRESH_TOKEN_KEY, refreshToken ?? ''],
  ]);
}

export async function clearStoredTokens() {
  await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);
}

export async function getStoredTokens() {
  const [[, accessToken], [, refreshToken]] = await AsyncStorage.multiGet([
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
  ]);
  return {accessToken: accessToken || null, refreshToken: refreshToken || null};
}

// Session persistence functions
export async function setStoredSession(sessionData: {
  accessToken: string;
  refreshToken?: string;
  driverName: string;
}) {
  const timestamp = Date.now().toString();
  await AsyncStorage.multiSet([
    [SESSION_DATA_KEY, JSON.stringify(sessionData)],
    [SESSION_TIMESTAMP_KEY, timestamp],
  ]);
}

export async function getStoredSession(): Promise<{
  accessToken: string;
  refreshToken?: string;
  driverName: string;
} | null> {
  try {
    const [[, sessionData], [, timestamp]] = await AsyncStorage.multiGet([
      SESSION_DATA_KEY,
      SESSION_TIMESTAMP_KEY,
    ]);

    if (!sessionData || !timestamp) {
      return null;
    }

    const loginTime = parseInt(timestamp, 10);
    const currentTime = Date.now();
    const elapsed = currentTime - loginTime;

    // Check if session has expired (more than 1 hour)
    if (elapsed > SESSION_DURATION_MS) {
      console.log('[Session] Session expired, clearing stored data');
      await clearStoredSession();
      return null;
    }

    console.log('[Session] Valid session found, expires in:', Math.floor((SESSION_DURATION_MS - elapsed) / 1000 / 60), 'minutes');
    return JSON.parse(sessionData);
  } catch (error) {
    console.error('[Session] Error retrieving stored session:', error);
    return null;
  }
}

export async function clearStoredSession() {
  await AsyncStorage.multiRemove([
    SESSION_DATA_KEY,
    SESSION_TIMESTAMP_KEY,
    ACCESS_TOKEN_KEY,
    REFRESH_TOKEN_KEY,
  ]);
}

export type RequestOptions = {
  method?: HttpMethod;
  body?: any;
  auth?: boolean;
  headers?: Record<string, string>;
};

async function doFetch(path: string, options: RequestOptions = {}) {
  const {method = 'GET', body, auth = false, headers = {}} = options;

  const url = `${BASE_URL}${path}`;

  const finalHeaders: Record<string, string> = {
    'Content-Type': body instanceof FormData ? 'multipart/form-data' : 'application/json',
    ...headers,
  };

  let token: string | null = null;
  if (auth) {
    const stored = await getStoredTokens();
    token = stored.accessToken;
    if (token) {
      finalHeaders.Authorization = `Bearer ${token}`;
    }
  }

  console.log('[API REQUEST]', {
    url,
    method,
    auth,
    headers: finalHeaders,
    body: body instanceof FormData ? 'FormData' : body,
  });

  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body
        ? body instanceof FormData
          ? body
          : JSON.stringify(body)
        : undefined,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    const json = text ? JSON.parse(text) : undefined;

    console.log('[API RESPONSE]', {
      url,
      status: response.status,
      ok: response.ok,
      body: json,
    });

    if (!response.ok) {
      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        console.log('[API] 401 Unauthorized - clearing session');
        await clearStoredSession();
        // The app will automatically redirect to login via AuthContext
      }
      throw new ApiException(response.status, json?.message || 'API error', json);
    }

    return json;
  } catch (error: any) {
    // Provide more helpful error messages
    if (error.name === 'AbortError') {
      console.error('[API ERROR] Request timeout after 30 seconds:', {url, method});
      throw new Error('Request timeout - server is not responding');
    } else if (error.message === 'Network request failed') {
      console.error('[API ERROR] Network request failed:', {url, method});
      throw new Error('Cannot connect to server. Please check your internet connection or try again later.');
    }
    console.error('[API ERROR]', {url, method, error});
    throw error;
  }
}

export async function apiGet<T>(path: string, auth = false): Promise<T> {
  return doFetch(path, {method: 'GET', auth});
}

export async function apiPost<T>(
  path: string,
  body: any,
  auth = false,
  isFormData = false,
): Promise<T> {
  return doFetch(path, {
    method: 'POST',
    body,
    auth,
    headers: isFormData ? {'Content-Type': 'multipart/form-data'} : undefined,
  });
}

export async function apiPut<T>(
  path: string,
  body: any,
  auth = false,
): Promise<T> {
  return doFetch(path, {
    method: 'PUT',
    body,
    auth,
  });
}
