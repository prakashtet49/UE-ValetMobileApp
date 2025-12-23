/**
 * Global error handler utility for consistent error handling across the app
 */

export type ErrorType = 
  | 'NETWORK_ERROR'
  | 'API_ERROR'
  | 'VALIDATION_ERROR'
  | 'PERMISSION_ERROR'
  | 'CAMERA_ERROR'
  | 'UNKNOWN_ERROR';

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: any;
  code?: string;
}

/**
 * Parse and categorize errors
 */
export function parseError(error: any): AppError {
  // Network errors
  if (error?.message?.includes('Network request failed') || 
      error?.message?.includes('timeout') ||
      error?.name === 'AbortError') {
    return {
      type: 'NETWORK_ERROR',
      message: 'Cannot connect to server. Please check your internet connection.',
      originalError: error,
    };
  }

  // API errors
  if (error?.status || error?.body) {
    return {
      type: 'API_ERROR',
      message: error?.body?.message || error?.message || 'An error occurred. Please try again.',
      originalError: error,
      code: error?.status?.toString(),
    };
  }

  // Permission errors
  if (error?.message?.includes('permission') || 
      error?.message?.includes('denied')) {
    return {
      type: 'PERMISSION_ERROR',
      message: 'Permission denied. Please grant the required permissions.',
      originalError: error,
    };
  }

  // Camera errors
  if (error?.message?.includes('camera') || 
      error?.code?.includes('camera')) {
    return {
      type: 'CAMERA_ERROR',
      message: 'Camera error. Please try again.',
      originalError: error,
    };
  }

  // Default unknown error
  return {
    type: 'UNKNOWN_ERROR',
    message: error?.message || 'An unexpected error occurred. Please try again.',
    originalError: error,
  };
}

/**
 * Log error with context
 */
export function logError(context: string, error: any, additionalInfo?: any) {
  const parsedError = parseError(error);
  console.error(`[${context}] Error:`, {
    type: parsedError.type,
    message: parsedError.message,
    code: parsedError.code,
    additionalInfo,
    originalError: parsedError.originalError,
  });
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: any): string {
  const parsedError = parseError(error);
  return parsedError.message;
}

/**
 * Safe async wrapper that catches and logs errors
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context: string,
  fallbackValue?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    logError(context, error);
    return fallbackValue;
  }
}

/**
 * Safe sync wrapper that catches and logs errors
 */
export function safeSync<T>(
  fn: () => T,
  context: string,
  fallbackValue?: T
): T | undefined {
  try {
    return fn();
  } catch (error) {
    logError(context, error);
    return fallbackValue;
  }
}
