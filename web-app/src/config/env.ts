import { z } from 'zod';

const envSchema = z.object({
    VITE_API_BASE_URL: z.string().url().default('http://localhost:3000'),
    VITE_SENTRY_DSN: z.string().url().optional(),
});

type Env = z.infer<typeof envSchema>;

export const validateEnv = (): Env => {
    const result = envSchema.safeParse(import.meta.env);

    if (!result.success) {
        console.error('❌ Invalid environment variables:', result.error.format());
        if (import.meta.env.DEV) {
            throw new Error('Invalid environment variables');
        }
    }

    // Use the default values from schema if validation partially fails in production
    return result.success ? result.data : envSchema.parse({
        VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
    });
};

export const ENV = validateEnv();
