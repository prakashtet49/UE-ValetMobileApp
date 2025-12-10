import {apiGet} from './client';

export type TodayJobStatsResponse = {
  parkedCount: number;
  deliveredCount: number;
};

export type ParkedTodayItem = {
  id: string;
  vehicleNumber: string;
  slot: string;
  locationName: string;
  parkedAt: string;
  parkedDurationMinutes: number;
  tagNumber: string;
};

export type DeliveredTodayItem = {
  id: string;
  vehicleNumber: string;
  slot: string;
  locationName: string;
  parkedAt: string;
  deliveredAt: string;
  totalDurationMinutes: number;
};

export async function getTodayJobStats() {
  return apiGet<TodayJobStatsResponse>('/api/driver/job-stats/today', true);
}

export async function getParkedToday(limit = 100) {
  return apiGet<ParkedTodayItem[]>(`/api/driver/job-stats/parked-today?limit=${limit}`, true);
}

export async function getDeliveredToday(limit = 100) {
  return apiGet<DeliveredTodayItem[]>(
    `/api/driver/job-stats/delivered-today?limit=${limit}`,
    true,
  );
}
