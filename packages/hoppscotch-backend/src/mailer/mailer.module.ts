import { Global, Module } from '@nestjs/common';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { MailerService } from './mailer.service';
import { throwErr } from 'src/utils';
import {
  MAILER_FROM_ADDRESS_UNDEFINED,
  MAILER_SMTP_URL_UNDEFINED,
} from 'src/errors';
import { ConfigService } from '@nestjs/config';
import { loadInfraConfiguration } from 'src/infra-config/helper';
import { MailerEventListener } from './mailer.listener';

@Global()
@Module({})
export class MailerModule {
  static async register() {
    const env = await loadInfraConfiguration();

    // If mailer SMTP is DISABLED, return the module without any configuration
    if (env.INFRA.MAILER_SMTP_ENABLE !== 'true') {
      console.log('Mailer SMTP is disabled');
      return { module: MailerModule };
    }

    // If mailer is ENABLED, return the module with configuration
    let mailerSmtpUrl = env.INFRA.MAILER_SMTP_URL;
    let mailerAddressFrom = env.INFRA.MAILER_ADDRESS_FROM;

    if (!env.INFRA.MAILER_SMTP_URL || !env.INFRA.MAILER_ADDRESS_FROM) {
      const config = new ConfigService();
      mailerSmtpUrl = config.get('MAILER_SMTP_URL');
      mailerAddressFrom = config.get('MAILER_ADDRESS_FROM');
    }

    return {
      module: MailerModule,
      providers: [MailerService, MailerEventListener],
      imports: [
        NestMailerModule.forRoot({
          transport: mailerSmtpUrl ?? throwErr(MAILER_SMTP_URL_UNDEFINED),
          defaults: {
            from: mailerAddressFrom ?? throwErr(MAILER_FROM_ADDRESS_UNDEFINED),
          },
          template: {
            dir: __dirname + '/templates',
            adapter: new HandlebarsAdapter(),
          },
        }),
      ],
    };
  }
}
