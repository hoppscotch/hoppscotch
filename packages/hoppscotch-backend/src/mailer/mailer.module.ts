import { Module } from '@nestjs/common';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { MailerService } from './mailer.service';
import { throwErr } from 'src/utils';
import {
  MAILER_FROM_ADDRESS_UNDEFINED,
  MAILER_SMTP_URL_UNDEFINED,
} from 'src/errors';

@Module({
  imports: [
    NestMailerModule.forRoot({
      transport:
        process.env.MAILER_SMTP_URL ?? throwErr(MAILER_SMTP_URL_UNDEFINED),
      defaults: {
        from:
          process.env.MAILER_ADDRESS_FROM ??
          throwErr(MAILER_FROM_ADDRESS_UNDEFINED),
      },
      template: {
        dir: __dirname + '/templates',
        adapter: new HandlebarsAdapter(),
      },
    }),
  ],
  providers: [MailerService],
  exports: [MailerService],
})
export class MailerModule {}
