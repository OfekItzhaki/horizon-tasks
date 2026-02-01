/**
 * Sentry is initialized here before any other imports (see main.ts).
 * Only active when SENTRY_DSN is set. PII is scrubbed in beforeSend.
 */
import * as Sentry from '@sentry/nestjs';

const dsn = process.env.SENTRY_DSN?.trim();
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    beforeSend(event, hint) {
      // Scrub request headers and body to avoid sending tokens or PII
      if (event.request) {
        if (event.request.headers) {
          const headers = { ...event.request.headers };
          if (headers['Authorization']) headers['Authorization'] = '[Redacted]';
          if (headers['authorization']) headers['authorization'] = '[Redacted]';
          if (headers['Cookie']) headers['Cookie'] = '[Redacted]';
          if (headers['cookie']) headers['cookie'] = '[Redacted]';
          event.request = { ...event.request, headers };
        }
        if (event.request.data && typeof event.request.data === 'object') {
          const data = event.request.data as Record<string, unknown>;
          const scrubbed: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(data)) {
            if (['password', 'passwordHash', 'token', 'accessToken', 'refreshToken'].includes(k)) {
              scrubbed[k] = '[Redacted]';
            } else if (k === 'email' && typeof v === 'string') {
              scrubbed[k] = v.replace(/(.{2}).*@(.*)/, '$1***@$2');
            } else {
              scrubbed[k] = v;
            }
          }
          event.request = { ...event.request, data: scrubbed };
        }
      }
      return event;
    },
  });
}
