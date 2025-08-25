import { NestFactory } from '@nestjs/core';
import { json } from 'express';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import * as session from 'express-session';
import { emitGQLSchemaFile } from './gql-schema';
import * as crypto from 'crypto';
import * as morgan from 'morgan';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { InfraTokenModule } from './infra-token/infra-token.module';
import { NestExpressApplication } from '@nestjs/platform-express';

function setupSwagger(app, isProduction: boolean) {
  const swaggerDocPath = '/api-docs';

  const config = new DocumentBuilder()
    .setTitle('Hoppscotch API Documentation')
    .setDescription('APIs for external integration')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'Authorization',
        in: 'header',
        scheme: 'bearer',
        bearerFormat: 'Bearer',
      },
      'infra-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: isProduction ? [InfraTokenModule] : [],
  });
  SwaggerModule.setup(swaggerDocPath, app, document, {
    swaggerOptions: { persistAuthorization: true, ignoreGlobalPrefix: true },
  });
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  const configService = app.get(ConfigService);
  const isProduction = configService.get('PRODUCTION') === 'true';

  console.log(`Running in production: ${isProduction}`);
  console.log(`Port: ${configService.get('PORT')}`);

  app.use(
    session({
      secret:
        configService.get('INFRA.SESSION_SECRET') ||
        crypto.randomBytes(16).toString('hex'),
    }),
  );

  // Increase file upload limit to 100MB
  app.use(
    json({
      limit: '100mb',
    }),
  );

  if (isProduction) {
    console.log('Enabling CORS with production settings');
    app.enableCors({
      origin: configService.get('WHITELISTED_ORIGINS').split(','),
      credentials: true,
    });
  } else {
    console.log('Enabling CORS with development settings');
    app.enableCors({
      origin: true,
      credentials: true,
    });
  }

  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
    }),
  );

  if (configService.get('TRUST_PROXY') === 'true') {
    console.log('Enabling trust proxy');
    app.set('trust proxy', true);
  }

  app.use(morgan(':remote-addr :method :url :status - :response-time ms'));

  await setupSwagger(app, isProduction);

  await app.listen(configService.get('PORT') || 3170);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.info('SIGTERM signal received');
    await app.close();
  });
}

if (!process.env.GENERATE_GQL_SCHEMA) {
  bootstrap();
} else {
  emitGQLSchemaFile();
}
