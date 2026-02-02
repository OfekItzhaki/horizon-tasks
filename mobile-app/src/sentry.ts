/**
 * Sentry is initialized here before the app. Only active when EXPO_PUBLIC_SENTRY_DSN is set.
 * PII is scrubbed in beforeSend (tokens, passwords, email partially masked).
 */
import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
if (dsn) {
  Sentry.init({
    dsn,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    sendDefaultPii: false,
    beforeSend(event, hint) {
      // Scrub request/extra data to avoid sending tokens or PII
      if (event.request?.headers) {
        const headers = { ...event.request.headers };
        if (headers['Authorization']) headers['Authorization'] = '[Redacted]';
        if (headers['authorization']) headers['authorization'] = '[Redacted]';
        event.request = { ...event.request, headers };
      }
      if (event.request?.data && typeof event.request.data === 'object') {
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
      if (event.extra && typeof event.extra === 'object') {
        const extra = event.extra as Record<string, unknown>;
        const scrubbed: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(extra)) {
          if (['password', 'token', 'accessToken', 'refreshToken'].includes(k)) scrubbed[k] = '[Redacted]';
          else scrubbed[k] = v;
        }
        event.extra = scrubbed;
      }
      return event;
    },
  });
}

export default Sentry;
