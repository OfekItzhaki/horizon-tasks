import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });
    
    // Log connection details (without password) for debugging
    if (process.env.DATABASE_URL) {
      try {
        // Parse connection string safely
        const dbUrl = process.env.DATABASE_URL;
        const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
        if (match) {
          const [, , , host, port, database] = match;
          console.log('[Prisma] Connecting to:', `postgresql://${host}:${port}/${database}`);
        } else {
          console.log('[Prisma] DATABASE_URL format detected');
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }

  async onModuleInit() {
    const maxRetries = 5;
    const retryDelay = 2000; // 2 seconds

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        console.log('[Prisma] Successfully connected to database');
        return;
      } catch (err) {
        const isLastAttempt = attempt === maxRetries;
        
        console.error(
          `[Prisma] Connection attempt ${attempt}/${maxRetries} failed:`,
          err instanceof Error ? err.message : err,
        );

        // In dev, allow the server to boot even if DB is misconfigured/unreachable.
        // This prevents "ERR_CONNECTION_REFUSED" for the frontend and makes the
        // underlying DB error visible in logs / responses.
        if (process.env.NODE_ENV !== 'production' && isLastAttempt) {
          console.error('[Prisma] Failed to connect on startup (dev mode):', err);
          return;
        }

        if (isLastAttempt) {
          // In production, fail fast after all retries.
          console.error('[Prisma] Failed to connect to database after all retries:', err);
          throw err;
        }

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
