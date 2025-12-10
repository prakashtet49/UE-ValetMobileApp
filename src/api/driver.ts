import {apiGet, apiPost} from './client';

// Driver Profile Types
export type DriverProfile = {
  id: string;
  name: string;
  phone: string;
};

export type Location = {
  id: string;
  name: string;
  address: string;
  type: string;
};

export type ClientLocationsResponse = {
  clientId: string;
  locations: Location[];
};

export type AssignLocationRequest = {
  locationId: string;
};

export type AssignLocationResponse = {
  success: boolean;
  driverId: string;
  locationId: string;
};

// Driver Profile APIs
export async function getDriverProfile() {
  return apiGet<DriverProfile>('/api/driver/profile', true);
}

export async function getClientLocations() {
  return apiGet<ClientLocationsResponse>('/api/driver/client/locations', true);
}

export async function assignLocation(payload: AssignLocationRequest) {
  return apiPost<AssignLocationResponse>(
    '/api/driver/location/assign',
    payload,
    true,
  );
}

// Temporary Access Types
export type TempLoginRequest = {
  code: string;
};

export type TempLoginResponse = {
  ok: boolean;
  session?: {
    auth_type: 'temp';
    role: string;
    driver_id: string;
  };
};

export type TempLogoutResponse = {
  ok: boolean;
};

export type GenerateAccessTokenRequest = {
  days?: number;
};

export type GenerateAccessTokenResponse = {
  ok: boolean;
  token: string;
  expires_at: string;
};

// Temporary Access APIs
export async function tempLogin(payload: TempLoginRequest) {
  return apiPost<TempLoginResponse>('/api/drivers/login', payload, false);
}

export async function tempLogout() {
  return apiPost<TempLogoutResponse>('/api/drivers/logout', {}, false);
}

export async function generateAccessToken(
  driverId: string,
  payload?: GenerateAccessTokenRequest,
) {
  return apiPost<GenerateAccessTokenResponse>(
    `/api/drivers/${driverId}/access-token`,
    payload || {},
    true,
  );
}
