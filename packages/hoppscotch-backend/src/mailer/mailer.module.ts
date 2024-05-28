import { Global, Module } from '@nestjs/common';
import { MailerModule as NestMailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { MailerService } from './mailer.service';
import { throwErr } from 'src/utils';
import {
  MAILER_SMTP_PASSWORD_UNDEFINED,
  MAILER_SMTP_URL_UNDEFINED,
  MAILER_SMTP_USER_UNDEFINED,
} from 'src/errors';
import { ConfigService } from '@nestjs/config';
import { loadInfraConfiguration } from 'src/infra-config/helper';
import { MailerEventListener } from './mailer.listener';
import { TransportType } from '@nestjs-modules/mailer/dist/interfaces/mailer-options.interface';

@Global()
@Module({})
export class MailerModule {
  static async register() {
    const config = new ConfigService();
    const env = await loadInfraConfiguration();

    // If mailer SMTP is DISABLED, return the module without any configuration (service, listener, etc.)
    if (env.INFRA.MAILER_SMTP_ENABLE !== 'true') {
      console.log('Mailer SMTP is disabled');
      return { module: MailerModule };
    }

    // If mailer is ENABLED, return the module with configuration (service, listener, etc.)

    // Determine transport configuration based on custom config flag
    let transportOption = getTransportOption(env, config);
    // Get mailer address from environment or config
    const mailerAddressFrom = getMailerAddressFrom(env, config);

    return {
      module: MailerModule,
      providers: [MailerService, MailerEventListener],
      imports: [
        NestMailerModule.forRoot({
          transport: transportOption,
          defaults: {
            from: mailerAddressFrom,
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

function isEnabled(value) {
  return value === 'true';
}
function getMailerAddressFrom(env, config): string {
  return (
    env.INFRA.MAILER_ADDRESS_FROM ??
    config.get('MAILER_ADDRESS_FROM') ??
    throwErr(MAILER_SMTP_URL_UNDEFINED)
  );
}
function getTransportOption(env, config): TransportType {
  const useCustomConfigs = isEnabled(
    env.INFRA.MAILER_USE_CUSTOM_CONFIGS ??
      config.get('MAILER_USE_CUSTOM_CONFIGS'),
  );

  if (!useCustomConfigs) {
    console.log('Using simple mailer configuration');
    return (
      env.INFRA.MAILER_SMTP_URL ??
      config.get('MAILER_SMTP_URL') ??
      throwErr(MAILER_SMTP_URL_UNDEFINED)
    );
  } else {
    console.log('Using advanced mailer configuration');
    return {
      host: env.INFRA.MAILER_SMTP_HOST ?? config.get('MAILER_SMTP_HOST'),
      port: +env.INFRA.MAILER_SMTP_PORT ?? +config.get('MAILER_SMTP_PORT'),
      secure:
        !!env.INFRA.MAILER_SMTP_SECURE ?? !!config.get('MAILER_SMTP_SECURE'),
      auth: {
        user:
          env.INFRA.MAILER_SMTP_USER ??
          config.get('MAILER_SMTP_USER') ??
          throwErr(MAILER_SMTP_USER_UNDEFINED),
        pass:
          env.INFRA.MAILER_SMTP_PASSWORD ??
          config.get('MAILER_SMTP_PASSWORD') ??
          throwErr(MAILER_SMTP_PASSWORD_UNDEFINED),
      },
      tls: {
        rejectUnauthorized:
          !!env.INFRA.MAILER_TLS_REJECT_UNAUTHORIZED ??
          !!config.get('MAILER_TLS_REJECT_UNAUTHORIZED'),
      },
    };
  }
}
