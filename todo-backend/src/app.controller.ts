import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import AppService from './app.service';

@Controller()
class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Readiness: app + database. Use for load balancer / readiness probes.
   * Returns 503 if database is unreachable.
   */
  @Get('health')
  async health() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'ok' };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'unreachable',
      });
    }
  }

  /**
   * Liveness: app only. Use for k8s liveness (no DB check).
   */
  @Get('healthz')
  healthz() {
    return { status: 'ok' };
  }
}
export default AppController;
