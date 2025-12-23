import {apiPost} from './client';

export type PrintReceiptRequest = {
  bookingId: string;
  vehicleNumber: string;
  returnBuffer: boolean;
};

export type PrintReceiptResponse = {
  success: boolean;
  printBuffer: string;
  receiptData: {
    charges: number;
    duration: string;
    vehicleNumber: string;
    bookingId: string;
    timestamp: string;
  };
};

export async function printReceipt(
  bookingId: string,
  vehicleNumber: string,
): Promise<PrintReceiptResponse> {
  return apiPost<PrintReceiptResponse>(
    '/api/v1/receipt/print',
    {
      bookingId,
      vehicleNumber,
      returnBuffer: true,
    },
    true,
  );
}
