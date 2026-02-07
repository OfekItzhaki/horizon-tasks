import { Alert } from 'react-native';
import * as Sentry from '@sentry/react-native';
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
 * Show error alert with consistent formatting
 */
export function showErrorAlert(
  title: string,
  error: unknown,
  defaultMessage?: string,
): void {
  const message = extractErrorMessage(error, defaultMessage || 'An error occurred. Please try again.');
  Alert.alert(title, message);
}

/**
 * Handle API errors with automatic auth error detection
 */
export function handleApiError(
  error: unknown,
  defaultMessage: string,
  onAuthError?: () => void,
): void {
  const isAuth = isAuthError(error);
  const isTimeout = isTimeoutError(error);

  // Capture unexpected errors in Sentry (except auth/timeout)
  if (!isAuth && !isTimeout && process.env.EXPO_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error);
  }

  if (isAuth) {
    // Auth errors are handled by api-client interceptor
    // But we can call a callback if needed
    if (onAuthError) {
      onAuthError();
    }
    return;
  }

  // For timeout errors, show user-friendly message
  if (isTimeout) {
    const timeoutMessage = defaultMessage.includes('timeout')
      ? defaultMessage
      : 'The request is taking too long. Please try again later.';
    showErrorAlert('Request Timeout', timeoutMessage);
    return;
  }

  // For other errors, show the error message
  showErrorAlert('Error', error, defaultMessage);
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
