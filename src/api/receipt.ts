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

export type PrintWithPaymentRequest = {
  bookingId: string;
  vehicleNumber: string;
  overrideAmount: number;
  paymentMode: 'Cash' | 'Card' | 'UPI';
  returnBuffer: boolean;
};

export type PrintWithPaymentResponse = {
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

export async function printReceiptWithPayment(
  bookingId: string,
  vehicleNumber: string,
  overrideAmount: number,
  paymentMode: 'Cash' | 'Card' | 'UPI',
): Promise<PrintWithPaymentResponse> {
  return apiPost<PrintWithPaymentResponse>(
    '/api/v1/receipt/print-with-payment',
    {
      bookingId,
      vehicleNumber,
      overrideAmount,
      paymentMode,
      returnBuffer: true,
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

export type ShiftSummary = {
  name: string;
  vehicleCount: number;
  totalAmount: number;
  paymentModes: {
    Cash?: number;
    Card?: number;
    UPI?: number;
  };
  isActive: boolean;
};

export type TotalSummaryShiftsResponse = {
  totalVehicles: number;
  totalAmount: number;
  averageAmount: number;
  paymentModeBreakdown: {
    Cash: number;
    Card: number;
    UPI: number;
  };
  shifts: ShiftSummary[];
  dateRange: {
    start?: string;
    end?: string;
  };
};

export async function getTotalSummaryShifts(startDate?: string, endDate?: string): Promise<TotalSummaryShiftsResponse> {
  let path = '/api/v1/receipt/total-summary-shifts';
  const params: string[] = [];
  
  if (startDate) {
    params.push(`startDate=${encodeURIComponent(startDate)}`);
  }
  if (endDate) {
    params.push(`endDate=${encodeURIComponent(endDate)}`);
  }
  
  if (params.length > 0) {
    path += `?${params.join('&')}`;
  }
  
  return apiGet<TotalSummaryShiftsResponse>(path, true);
}

// Keep old type for backward compatibility (deprecated)
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

// Keep old function for backward compatibility (deprecated)
export async function getTodaySummary(): Promise<TodaySummaryResponse> {
  return apiGet<TodaySummaryResponse>(
    '/api/v1/receipt/today-summary',
    true,
  );
}
