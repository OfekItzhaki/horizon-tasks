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
  }

  async onModuleInit() {
    try {
      await this.$connect();
      console.log('[Prisma] Successfully connected to database');
    } catch (err) {
      // In dev, allow the server to boot even if DB is misconfigured/unreachable.
      // This prevents "ERR_CONNECTION_REFUSED" for the frontend and makes the
      // underlying DB error visible in logs / responses.
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Prisma] Failed to connect on startup (dev mode):', err);
        return;
      }

      // In production, fail fast.
      console.error('[Prisma] Failed to connect to database:', err);
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
