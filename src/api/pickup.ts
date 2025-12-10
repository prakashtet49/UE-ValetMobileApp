import {apiGet, apiPost} from './client';

export type CreatePickupRequest = {
  bookingId: string;
  locationId: string;
  vehicleNumber: string;
  tagNumber?: string;
  pickupPoint?: string;
};

export async function createPickupJob(payload: CreatePickupRequest) {
  return apiPost<unknown>('/api/pickup/create', payload, true);
}

export type PendingPickupJob = {
  id: string;
  vehicleNumber: string;
  tagNumber: string;
  keyTagCode?: string;
  pickupPoint: string;
  slotNumber?: string;
  locationDescription?: string;
  requestedAt: string;
  status: string;
};

export type PendingPickupResponse = {
  requests: PendingPickupJob[];
  count: number;
};

export async function getPendingPickupRequests() {
  return apiGet<PendingPickupResponse>(
    '/api/driver/pickup-requests/new',
    true,
  );
}

export type PickupJobResponse = {
  id: string;
  bookingId: string;
  parkingJobId: string;
  vehicleNumber: string;
  keyTagCode: string;
  tagNumber: string;
  slotNumber: string;
  pickupPoint: string;
  locationDescription: string;
  status: string;
  requestedAt: string;
  assignedAt: string;
  assignedDriverId: string;
};

export type RespondToPickupResponse = {
  success: boolean;
  pickupJob: PickupJobResponse;
};

export async function respondToPickupRequest(payload: {
  pickupJobId: string;
  action: 'ACCEPT' | 'DECLINE';
}) {
  return apiPost<RespondToPickupResponse>(
    '/api/driver/pickup-requests/respond',
    payload,
    true,
  );
}

export async function updatePickupStatus(payload: {
  pickupJobId: string;
  status: 'PICKUP_STARTED' | 'VEHICLE_PICKED_UP' | 'DELIVERED';
}) {
  return apiPost<unknown>(
    '/api/driver/pickup-requests/update-status',
    payload,
    true,
  );
}

export async function getPickupJobDetails(jobId: string) {
  return apiGet<unknown>(`/api/driver/pickup-requests/${jobId}`, true);
}
