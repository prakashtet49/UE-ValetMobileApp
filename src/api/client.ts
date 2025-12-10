import {BASE_URL, ApiException, HttpMethod} from './config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ACCESS_TOKEN_KEY = 'urbanease.accessToken';
const REFRESH_TOKEN_KEY = 'urbanease.refreshToken';

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
    const response = await fetch(url, {
      method,
      headers: finalHeaders,
      body: body
        ? body instanceof FormData
          ? body
          : JSON.stringify(body)
        : undefined,
    });

    const text = await response.text();
    const json = text ? JSON.parse(text) : undefined;

    console.log('[API RESPONSE]', {
      url,
      status: response.status,
      ok: response.ok,
      body: json,
    });

    if (!response.ok) {
      throw new ApiException(response.status, json?.message || 'API error', json);
    }

    return json;
  } catch (error) {
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
