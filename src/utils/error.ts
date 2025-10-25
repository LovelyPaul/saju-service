/**
 * API Error type
 */
export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

/**
 * Check if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    'message' in error &&
    typeof (error as ApiError).code === 'string' &&
    typeof (error as ApiError).message === 'string'
  );
}

/**
 * Convert unknown error to user-friendly message
 */
export function getErrorMessage(error: unknown): string {
  // ApiError
  if (isApiError(error)) {
    return error.message;
  }

  // Standard Error
  if (error instanceof Error) {
    return error.message;
  }

  // String error
  if (typeof error === 'string') {
    return error;
  }

  // Object with message
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    if (typeof msg === 'string') {
      return msg;
    }
  }

  // Unknown error
  return '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.';
}
