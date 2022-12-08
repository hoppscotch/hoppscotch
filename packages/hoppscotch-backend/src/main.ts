import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log(`Running in production: ${process.env.PRODUCTION}`);
  console.log(`Port: ${process.env.PORT}`);
  console.log(`Database: ${process.env.DATABASE_URL}`);

  const app = await NestFactory.create(AppModule);

  // Increase fil upload limit to 50MB
  app.use(
    json({
      limit: '100mb',
    }),
  );

  if (process.env.PRODUCTION === 'false') {
    console.log('Enabling CORS with development settings');
    app.enableCors({
      origin: true,
    });
  } else {
    console.log('Enabling CORS with production settings');

    app.enableCors({
      origin: true,
    });
  }
  await app.listen(process.env.PORT || 3170);
}
bootstrap();
