import {apiPost, apiGet} from './client';

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

export type CalculateReceiptRequest = {
  bookingId: string;
};

export type CalculateReceiptResponse = {
  bookingId: string;
  reference: string;
  vehicleNumber: string;
  customerName: string;
  customerPhone: string;
  entryTime: string;
  exitTime: string;
  durationHours: number;
  durationFormatted: string;
  charges: number;
};

export type PrintWithOverrideRequest = {
  bookingId: string;
  vehicleNumber: string;
  overrideAmount: number;
  returnBuffer: boolean;
};

export type PrintWithOverrideResponse = {
  success: boolean;
  printBuffer: string;
  receiptData: {
    charges: number;
    overrideAmount: number;
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

export async function calculateReceipt(
  bookingId: string,
): Promise<CalculateReceiptResponse> {
  return apiPost<CalculateReceiptResponse>(
    '/api/v1/receipt/calculate',
    {
      bookingId,
    },
    true,
  );
}

export async function printReceiptWithOverride(
  bookingId: string,
  vehicleNumber: string,
  overrideAmount: number,
): Promise<PrintWithOverrideResponse> {
  return apiPost<PrintWithOverrideResponse>(
    '/api/v1/receipt/print-with-override',
    {
      bookingId,
      vehicleNumber,
      overrideAmount,
      returnBuffer: true,
    },
    true,
  );
}

export type TodaySummaryResponse = {
  date: string;
  driverName: string;
  locationId: string;
  locationName: string;
  summary: {
    totalVehicles: number;
    totalAmount: number;
    totalOriginalAmount: number;
    overriddenTransactions: number;
    averageAmount: number;
  };
  transactions: Array<{
    bookingId: string;
    vehicleNumber: string;
    originalAmount: number;
    amount: number;
    overrideAmount: number;
    printedAt: string;
    wasOverridden: boolean;
  }>;
};

export async function getTodaySummary(): Promise<TodaySummaryResponse> {
  return apiGet<TodaySummaryResponse>(
    '/api/v1/receipt/today-summary',
    true,
  );
}
