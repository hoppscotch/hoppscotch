import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { VersioningType } from '@nestjs/common';
import * as session from 'express-session';
import { emitGQLSchemaFile } from './gql-schema';
import { checkEnvironmentAuthProvider } from './utils';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  console.log(`Running in production:  ${configService.get('PRODUCTION')}`);
  console.log(`Port: ${configService.get('PORT')}`);

  checkEnvironmentAuthProvider();

  app.use(
    session({
      secret: configService.get('SESSION_SECRET'),
    }),
  );

  // Increase fil upload limit to 50MB
  app.use(
    json({
      limit: '100mb',
    }),
  );

  if (configService.get('PRODUCTION') === 'false') {
    console.log('Enabling CORS with development settings');

    app.enableCors({
      origin: configService.get('WHITELISTED_ORIGINS').split(','),
      credentials: true,
    });
  } else {
    console.log('Enabling CORS with production settings');

    app.enableCors({
      origin: configService.get('WHITELISTED_ORIGINS').split(','),
      credentials: true,
    });
  }
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.use(cookieParser());
  await app.listen(configService.get('PORT') || 3170);
}

if (!process.env.GENERATE_GQL_SCHEMA) {
  bootstrap();
} else {
  emitGQLSchemaFile();
}
