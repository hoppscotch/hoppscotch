import { TransportType } from '@nestjs-modules/mailer/dist/interfaces/mailer-options.interface';
import { MAILER_SMTP_URL_UNDEFINED } from 'src/errors';
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

    const smtpUser = env.INFRA.MAILER_SMTP_USER?.trim() || undefined;
    const smtpPass = env.INFRA.MAILER_SMTP_PASSWORD?.trim() || undefined;

    // Both credentials must be provided together or both omitted
    const hasUser = !!smtpUser;
    const hasPass = !!smtpPass;
    if (hasUser !== hasPass) {
      throw new Error(
        'SMTP auth requires both MAILER_SMTP_USER and MAILER_SMTP_PASSWORD. Provide both or leave both empty for unauthenticated relay.',
      );
    }

    const auth =
      smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined;

    return {
      host: env.INFRA.MAILER_SMTP_HOST,
      port: +env.INFRA.MAILER_SMTP_PORT,
      secure: env.INFRA.MAILER_SMTP_SECURE === 'true',
      ...(auth && { auth }),
      ignoreTLS: env.INFRA.MAILER_SMTP_IGNORE_TLS === 'true',
      tls: {
        rejectUnauthorized: env.INFRA.MAILER_TLS_REJECT_UNAUTHORIZED === 'true',
      },
    };
  }
}
