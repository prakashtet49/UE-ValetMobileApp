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
  phoneNumber?: string;
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

export type CurrentPickupResponse = {
  success: boolean;
  pickupJob: PickupJobResponse | null;
};

export async function getCurrentPickupJob(): Promise<CurrentPickupResponse> {
  try {
    return await apiGet<CurrentPickupResponse>(
      '/api/driver/pickup-requests/current',
      true,
    );
  } catch (error: any) {
    // 404 is a normal case - no active pickup job found
    if (error?.status === 404) {
      return {
        success: true,
        pickupJob: null,
      };
    }
    // For other errors, rethrow
    throw error;
  }
}

export type InProgressBookingResponse = {
  success: boolean;
  booking: any | null;
};

export async function getInProgressBooking(): Promise<InProgressBookingResponse> {
  try {
    return await apiGet<InProgressBookingResponse>(
      '/api/driver/pickup-requests/in-progress-booking',
      true,
    );
  } catch (error: any) {
    // 404 is a normal case - no in-progress booking found
    if (error?.status === 404) {
      return {
        success: true,
        booking: null,
      };
    }
    // For other errors, rethrow
    throw error;
  }
}
