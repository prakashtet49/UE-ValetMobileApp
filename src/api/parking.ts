import {apiGet, apiPost} from './client';

export type PendingParkingRequest = {
  bookingId: string;
  customerPhone: string;
  keyTag: string;
  arrivedAt: string;
  status: 'waiting_for_parking';
  requestType: 'parking';
};

export type PendingParkingResponse = {
  success: boolean;
  data: {
    requests: PendingParkingRequest[];
    total: number;
    locationId: string;
    locationName: string;
  };
};

export type ParkingStartResponse = {
  parkingJobId: string;
  keyTagCode: string;
  locationName: string;
};

export type ParkingCompleteRequest = {
  parkingJobId: string;
  vehicleNumber: string;
  vehicleType?: string;
  vehicleColor?: string;
  slotNumber?: string;
  locationDescription?: string;
};

export type ParkingCompleteResponse = {
  parkingJobId: string;
  vehicleNumber: string;
  keyTagCode: string;
  parkedAt: string;
  slotOrZone: string;
};

export async function getPendingParking(limit = 50) {
  return apiGet<PendingParkingResponse>(
    `/api/driver/parking/pending?limit=${limit}`,
    true,
  );
}

export async function getPendingParkingById(bookingId: string) {
  return apiGet<PendingParkingResponse['data']>(
    `/api/driver/parking/pending/${bookingId}`,
    true,
  );
}

export async function startParking(keyTagCode: string) {
  return apiPost<ParkingStartResponse>(
    '/api/driver/parking/start',
    {keyTagCode},
    true,
  );
}

export async function uploadParkingPhotos(
  parkingJobId: string,
  options: {
    frontPhoto?: {name: string; type: string; uri: string};
    backPhoto?: {name: string; type: string; uri: string};
    damagePhoto?: {name: string; type: string; uri: string};
  },
) {
  const form = new FormData();
  form.append('parkingJobId', parkingJobId);
  if (options.frontPhoto) {
    form.append('frontPhoto', options.frontPhoto as any);
  }
  if (options.backPhoto) {
    form.append('backPhoto', options.backPhoto as any);
  }
  if (options.damagePhoto) {
    form.append('damagePhoto', options.damagePhoto as any);
  }

  return apiPost<{success: boolean}>(
    '/api/driver/parking/upload-photos',
    form,
    true,
    true,
  );
}

export async function completeParking(payload: ParkingCompleteRequest) {
  return apiPost<ParkingCompleteResponse>(
    '/api/driver/parking/complete',
    payload,
    true,
  );
}

export async function sendParkingConfirmationTemplate(payload: {
  bookingId: string;
  vehicleNumber: string;
  locationDescription?: string;
  parkedAt: string;
  estimatedPickupTime?: string;
}) {
  return apiPost<unknown>(
    '/api/driver/parking/send-parking-confirmation',
    payload,
    true,
  );
}

export async function markVehicleArrived(payload: {bookingId: string}) {
  return apiPost<unknown>(
    '/api/driver/parking/vehicle-arrived',
    payload,
    true,
  );
}

export async function markVehicleHandedOver(payload: {bookingId: string}) {
  return apiPost<unknown>(
    '/api/driver/parking/vehicle-handed-over',
    payload,
    true,
  );
}

// WhatsApp Template Endpoints (as per swagger)
export async function sendVehicleArrivedTemplate(payload: {bookingId: string}) {
  return apiPost<unknown>(
    '/api/driver/parking/send-vehicle-arrived',
    payload,
    true,
  );
}

export async function sendHandoverFeedbackTemplate(payload: {bookingId: string}) {
  return apiPost<unknown>(
    '/api/driver/parking/send-handover-feedback',
    payload,
    true,
  );
}
