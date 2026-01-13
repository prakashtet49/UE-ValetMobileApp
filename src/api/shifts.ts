import {apiPost, apiGet} from './client';
import type {ShiftResponse} from './types';

export type StartShiftRequest = {
  locationId: string;
  deviceInfo?: {
    deviceId?: string;
    appVersion?: string;
    osVersion?: string;
  };
};

export type ShiftStatusResponse = {
  status: 'active' | 'paused' | 'offline';
  hasActiveShift: boolean;
  shift?: ShiftResponse;
};

export type StartEndShiftResponse = {
  message: string;
  shift: {
    id: string;
    driver_id: string;
    driver_name: string;
    location_id: string;
    shift_config_id: string;
    shift_name: string;
    shift_start_time: string;
    shift_end_time: string;
    started_at: string;
    ended_at: string | null;
    status: 'active' | 'paused' | 'offline';
    duration_minutes: number | null;
    current_duration_minutes: number;
    is_resumed: boolean;
    created_at: string;
    updated_at: string;
  };
};

export async function getShiftStatus() {
  return apiGet<ShiftStatusResponse>('/api/v1/drivers/shift/status', true);
}

export async function startDriverShift() {
  return apiPost<StartEndShiftResponse>('/api/v1/drivers/shift/start', {}, true);
}

export async function endDriverShift() {
  return apiPost<StartEndShiftResponse>('/api/v1/drivers/shift/end', {}, true);
}

export async function startShift(payload: StartShiftRequest) {
  return apiPost<ShiftResponse>('/api/v1/shifts/start', payload, true);
}

export async function pauseShift() {
  return apiPost<ShiftResponse>('/api/v1/shifts/pause', {}, true);
}
