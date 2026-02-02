import { z } from 'zod';

export const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default(3000),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(8),
    ALLOWED_ORIGINS: z.string().optional(),
    SENTRY_DSN: z.string().url().optional(),

    // Email config
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().transform(Number).optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_FROM: z.string().email().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validate(config: Record<string, unknown>) {
    const result = envSchema.safeParse(config);

    if (!result.success) {
        console.error('❌ Invalid environment variables:');
        console.error(JSON.stringify(result.error.format(), null, 2));
        throw new Error('Invalid environment configuration');
    }

    return result.data;
}
