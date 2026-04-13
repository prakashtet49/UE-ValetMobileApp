/**
 * Global error handler utility for consistent error handling across the app
 */

/** Safe string for logging or UI from any thrown value (including non-Error). */
export function toErrorMessage(error: unknown): string {
  if (typeof error === 'string') {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as {message?: unknown}).message;
    if (typeof m === 'string') {
      return m;
    }
  }
  return 'An unexpected error occurred. Please try again.';
}

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
  originalError?: unknown;
  code?: string;
}

/**
 * Parse and categorize errors
 */
type LooseError = {
  message?: string;
  name?: string;
  status?: number;
  body?: {message?: string};
  code?: string;
};

export function parseError(error: unknown): AppError {
  const e = error as LooseError;
  // Network errors
  if (
    e?.message?.includes('Network request failed') ||
    e?.message?.includes('timeout') ||
    e?.name === 'AbortError'
  ) {
    return {
      type: 'NETWORK_ERROR',
      message: 'Cannot connect to server. Please check your internet connection.',
      originalError: error,
    };
  }

  // API errors
  if (e?.status || e?.body) {
    return {
      type: 'API_ERROR',
      message: e?.body?.message || e?.message || 'An error occurred. Please try again.',
      originalError: error,
      code: e?.status?.toString(),
    };
  }

  // Permission errors
  if (e?.message?.includes('permission') || e?.message?.includes('denied')) {
    return {
      type: 'PERMISSION_ERROR',
      message: 'Permission denied. Please grant the required permissions.',
      originalError: error,
    };
  }

  // Camera errors
  if (
    e?.message?.includes('camera') ||
    (typeof e?.code === 'string' && e.code.includes('camera'))
  ) {
    return {
      type: 'CAMERA_ERROR',
      message: 'Camera error. Please try again.',
      originalError: error,
    };
  }

  // Default unknown error
  return {
    type: 'UNKNOWN_ERROR',
    message: toErrorMessage(error),
    originalError: error,
  };
}

/**
 * Log error with context
 */
export function logError(context: string, error: unknown, additionalInfo?: unknown) {
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
export function getUserFriendlyMessage(error: unknown): string {
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
