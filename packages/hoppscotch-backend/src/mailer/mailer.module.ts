import { Module } from '@nestjs/common';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { MailerService } from './mailer.service';
import { throwErr } from 'src/utils';
import {
  MAILER_FROM_ADDRESS_UNDEFINED,
  MAILER_SMTP_URL_UNDEFINED,
} from 'src/errors';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    NestMailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        transport:
          configService.get('MAILER_SMTP_URL') ??
          throwErr(MAILER_SMTP_URL_UNDEFINED),
        defaults: {
          from:
            configService.get('MAILER_ADDRESS_FROM') ??
            throwErr(MAILER_FROM_ADDRESS_UNDEFINED),
        },
        template: {
          dir: __dirname + '/templates',
          adapter: new HandlebarsAdapter(),
        },
      }),
    }),
  ],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
