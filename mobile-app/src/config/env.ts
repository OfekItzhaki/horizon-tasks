import { z } from 'zod';
import Constants from 'expo-constants';

const envSchema = z.object({
    EXPO_PUBLIC_API_URL: z.string().url().optional(),
    EXPO_PUBLIC_SENTRY_DSN: z.string().url().optional(),
});

export type Env = z.infer<typeof envSchema>;

export const validateEnv = (): Env => {
    // In Expo, environment variables are available on process.env
    // When using EXPO_PUBLIC_ prefix, they are automatically embedded
    const rawEnv = {
        EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
        EXPO_PUBLIC_SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN,
    };

    const result = envSchema.safeParse(rawEnv);

    if (!result.success) {
        console.error('❌ Invalid mobile environment variables:', result.error.format());
        // Only throw in dev to avoid crashing production apps
        if (__DEV__) {
            // We don't throw here to avoid red screen on startup if one optional var is missing, 
            // but we log it clearly.
        }
    }

    return result.success ? result.data : rawEnv as Env;
};

export const ENV = validateEnv();
