import { INestApplication, ValidationPipe } from '@nestjs/common';

export function setupE2EApp(app: INestApplication): void {
  // Configure validation pipe with same settings as production
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
}
