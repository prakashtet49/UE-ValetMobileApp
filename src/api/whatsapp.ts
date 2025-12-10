import {apiPost} from './client';

export async function sendParkingConfirmation(payload: {
  bookingId: string;
  customerPhone: string;
  vehicleNumber: string;
  locationName: string;
  parkedAtTime: string;
}) {
  return apiPost<{success: boolean; templateId: string}>(
    '/api/whatsapp/send-parking-confirmation',
    payload,
    true,
  );
}

export async function sendDriverArriving(payload: {
  bookingId: string;
  customerPhone: string;
  vehicleNumber: string;
  etaMinutes?: number;
}) {
  return apiPost<{success: boolean; templateId: string}>(
    '/api/whatsapp/send-driver-arriving',
    payload,
    true,
  );
}

export async function sendDeliveredFeedback(payload: {
  bookingId: string;
  customerPhone: string;
  vehicleNumber: string;
}) {
  return apiPost<{success: boolean; templateId: string}>(
    '/api/whatsapp/send-delivered',
    payload,
    true,
  );
}
