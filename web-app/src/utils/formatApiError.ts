import { ApiError } from '@tasks-management/frontend-services';

export function formatApiError(err: unknown, fallback: string): string {
  const error = err as ApiError | undefined;
  const message = error?.message;

  if (Array.isArray(message)) return message.join(', ');
  if (typeof message === 'string' && message.trim().length > 0) return message;

  return fallback;
}

