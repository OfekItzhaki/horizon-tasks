import toast from 'react-hot-toast';
import {
  extractErrorMessage as sharedExtractErrorMessage,
  isAuthError as sharedIsAuthError,
  isTimeoutError as sharedIsTimeoutError
} from '@tasks-management/frontend-services';

/**
 * Extract error message from various error formats
 * Always returns user-friendly messages, never technical errors
 */
export function extractErrorMessage(error: unknown, defaultMessage: string): string {
  return sharedExtractErrorMessage(error, defaultMessage);
}

/**
 * Check if error is an authentication error (401)
 */
export function isAuthError(error: unknown): boolean {
  return sharedIsAuthError(error);
}

/**
 * Check if error is a timeout error
 */
export function isTimeoutError(error: unknown): boolean {
  return sharedIsTimeoutError(error);
}

/**
 * Show error toast with consistent formatting
 */
export function showErrorToast(
  error: unknown,
  defaultMessage: string,
): void {
  const message = extractErrorMessage(error, defaultMessage);
  toast.error(message);
}

/**
 * Handle API errors with automatic auth error detection
 */
export function handleApiError(
  error: unknown,
  defaultMessage: string,
  onAuthError?: () => void,
): void {
  if (isAuthError(error)) {
    // Auth errors are handled by api-client interceptor
    // But we can call a callback if needed
    if (onAuthError) {
      onAuthError();
    }
    return;
  }

  // For timeout errors, show user-friendly message
  if (isTimeoutError(error)) {
    const timeoutMessage = defaultMessage.includes('timeout')
      ? defaultMessage
      : 'The request is taking too long. Please try again later.';
    toast.error(timeoutMessage);
    return;
  }

  // For other errors, show the error message
  showErrorToast(error, defaultMessage);
}

/**
 * Get user-friendly error message for common scenarios
 */
export function getFriendlyErrorMessage(error: unknown, operation: string): string {
  if (isTimeoutError(error)) {
    return `${operation} is taking too long. Please try again later.`;
  }

  if (isAuthError(error)) {
    return 'Your session has expired. Please log in again.';
  }

  return extractErrorMessage(error, `Unable to ${operation.toLowerCase()}. Please try again.`);
}
