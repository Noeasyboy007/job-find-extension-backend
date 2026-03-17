import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const globalPrefix = 'api/v1';
  const port = process.env.APP_PORT || 5050;

  app.setGlobalPrefix(globalPrefix); // Set the global prefix for API routes

  app.enableCors(); // Enable CORS

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true, // Enables automatic type conversion
      whitelist: true, // Removes unknown properties
      forbidNonWhitelisted: true, // Throws an error when an unknown property is received
    }),
  );

  await app.listen(port);
  Logger.log(`\x1b[1m\x1b[36mServer running on http://localhost:${port}/${globalPrefix}\x1b[0m`,);
}

bootstrap();