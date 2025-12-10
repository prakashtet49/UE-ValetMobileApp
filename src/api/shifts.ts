import {apiPost} from './client';
import type {ShiftResponse} from './types';

export type StartShiftRequest = {
  locationId: string;
  deviceInfo?: {
    deviceId?: string;
    appVersion?: string;
    osVersion?: string;
  };
};

export async function startShift(payload: StartShiftRequest) {
  return apiPost<ShiftResponse>('/api/v1/shifts/start', payload, true);
}

export async function pauseShift() {
  return apiPost<ShiftResponse>('/api/v1/shifts/pause', {}, true);
}
