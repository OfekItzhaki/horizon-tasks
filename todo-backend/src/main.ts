import { config } from 'dotenv';
config(); // Load .env file before anything else

import './instrument'; // Sentry (optional when SENTRY_DSN is set)

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(logger);

  // Security Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: false, // Allow cross-origin images (avatars)
    }),
  );

  // API Versioning
  app.setGlobalPrefix('api/v1', {
    exclude: ['/'],
  });

  // Standardized Error Responses
  app.useGlobalFilters(new AllExceptionsFilter());

  // CORS: in production use ALLOWED_ORIGINS (comma-separated); in dev allow all
  const isProduction = process.env.NODE_ENV === 'production';
  const allowedOriginsEnv = process.env.ALLOWED_ORIGINS?.trim();
  const origin =
    isProduction && allowedOriginsEnv
      ? allowedOriginsEnv
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean)
      : true;

  app.enableCors({
    origin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Serve static files from public/uploads
  app.useStaticAssets(join(process.cwd(), 'public', 'uploads'), {
    prefix: '/uploads/',
  });

  // Serve privacy policy from public root
  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/',
  });

  app.useGlobalPipes(new ValidationPipe());

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Horizon Tasks API')
    .setDescription(
      'API for managing to-do lists, tasks, and steps with user authentication',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  if (!isProduction) {
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger: http://localhost:${port}/api`);
}
bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Error starting application', error);
  process.exit(1);
});
