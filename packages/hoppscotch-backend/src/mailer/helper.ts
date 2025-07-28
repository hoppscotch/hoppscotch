import { TransportType } from '@nestjs-modules/mailer/dist/interfaces/mailer-options.interface';
import {
  MAILER_SMTP_PASSWORD_UNDEFINED,
  MAILER_SMTP_URL_UNDEFINED,
  MAILER_SMTP_USER_UNDEFINED,
} from 'src/errors';
import { throwErr } from 'src/utils';

function isSMTPCustomConfigsEnabled(value) {
  return value === 'true';
}

export function getMailerAddressFrom(env): string {
  return env.INFRA.MAILER_ADDRESS_FROM ?? throwErr(MAILER_SMTP_URL_UNDEFINED);
}

export function getTransportOption(env): TransportType {
  const useCustomConfigs = isSMTPCustomConfigsEnabled(
    env.INFRA.MAILER_USE_CUSTOM_CONFIGS,
  );

  if (!useCustomConfigs) {
    console.log('Using simple mailer configuration');
    return env.INFRA.MAILER_SMTP_URL ?? throwErr(MAILER_SMTP_URL_UNDEFINED);
  } else {
    console.log('Using advanced mailer configuration');
    return {
      host: env.INFRA.MAILER_SMTP_HOST,
      port: +env.INFRA.MAILER_SMTP_PORT,
      secure: env.INFRA.MAILER_SMTP_SECURE === 'true',
      auth: {
        user:
          env.INFRA.MAILER_SMTP_USER ?? throwErr(MAILER_SMTP_USER_UNDEFINED),
        pass:
          env.INFRA.MAILER_SMTP_PASSWORD ??
          throwErr(MAILER_SMTP_PASSWORD_UNDEFINED),
      },
      tls: {
        rejectUnauthorized: env.INFRA.MAILER_TLS_REJECT_UNAUTHORIZED === 'true',
      },
    };
  }
}
