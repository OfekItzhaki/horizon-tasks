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
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Horizon Tasks API | OfekLabs</title>
          <style>
              body {
                  margin: 0;
                  padding: 0;
                  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  background: #0f172a;
                  color: #f8fafc;
                  display: flex;
                  flex-direction: column;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  text-align: center;
              }
              .container {
                  max-width: 600px;
                  padding: 2rem;
                  background: rgba(30, 41, 59, 0.5);
                  backdrop-filter: blur(10px);
                  border-radius: 1.5rem;
                  border: 1px solid rgba(255, 255, 255, 0.1);
                  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
              }
              h1 {
                  font-size: 2.5rem;
                  font-weight: 800;
                  margin-bottom: 1rem;
                  background: linear-gradient(to right, #818cf8, #c084fc);
                  -webkit-background-clip: text;
                  -webkit-text-fill-color: transparent;
              }
              p {
                  font-size: 1.125rem;
                  color: #94a3b8;
                  line-height: 1.6;
              }
              .status {
                  display: inline-flex;
                  align-items: center;
                  gap: 0.5rem;
                  padding: 0.5rem 1rem;
                  background: rgba(34, 197, 94, 0.1);
                  color: #4ade80;
                  border-radius: 9999px;
                  font-size: 0.875rem;
                  font-weight: 600;
                  margin-top: 2rem;
              }
              .pulse {
                  width: 8px;
                  height: 8px;
                  background: #4ade80;
                  border-radius: 50%;
                  box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7);
                  animation: pulse 2s infinite;
              }
              @keyframes pulse {
                  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0.7); }
                  70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(74, 222, 128, 0); }
                  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(74, 222, 128, 0); }
              }
              .links {
                  margin-top: 2rem;
                  display: flex;
                  gap: 1.5rem;
                  justify-content: center;
              }
              a {
                  color: #818cf8;
                  text-decoration: none;
                  font-weight: 500;
                  transition: color 0.2s;
              }
              a:hover {
                  color: #c084fc;
              }
              .footer {
                  margin-top: 3rem;
                  font-size: 0.875rem;
                  color: #475569;
              }
          </style>
      </head>
      <body>
          <div class="container">
              <h1>Horizon Tasks API</h1>
              <p>The core engine powering your productivity. Premium task management services by OfekLabs.</p>
              
              <div class="status">
                  <div class="pulse"></div>
                  Systems Operational
              </div>
 
              <div class="links">
                  <a href="https://tasks.ofeklabs.dev">Go to Web App</a>
                  ${process.env.NODE_ENV !== 'production' ? '<a href="/api">Documentation</a>' : ''}
              </div>
          </div>
          <div class="footer">
              &copy; 2026 OfekLabs. All rights reserved.
          </div>
      </body>
      </html>
    `;
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
