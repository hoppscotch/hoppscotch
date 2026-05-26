import type { MailerOptions } from '@nestjs-modules/mailer';
import type SMTPConnection from 'nodemailer/lib/smtp-connection';
import { MAILER_SMTP_URL_UNDEFINED } from 'src/errors';
import { throwErr } from 'src/utils';

type TransportType = NonNullable<MailerOptions['transport']>;

export enum SMTPAuthType {
  LOGIN = 'login',
  OAUTH2 = 'oauth2',
}

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

    const authType = env.INFRA.MAILER_SMTP_AUTH_TYPE?.trim();

    let auth: SMTPConnection.AuthenticationType | undefined;

    if (authType === SMTPAuthType.OAUTH2) {
      const oauth2User = env.INFRA.MAILER_SMTP_OAUTH2_USER?.trim() || undefined;
      const oauth2ClientId =
        env.INFRA.MAILER_SMTP_OAUTH2_CLIENT_ID?.trim() || undefined;
      const oauth2ClientSecret =
        env.INFRA.MAILER_SMTP_OAUTH2_CLIENT_SECRET?.trim() || undefined;
      const oauth2RefreshToken =
        env.INFRA.MAILER_SMTP_OAUTH2_REFRESH_TOKEN?.trim() || undefined;
      const oauth2AccessUrl =
        env.INFRA.MAILER_SMTP_OAUTH2_ACCESS_URL?.trim() || undefined;

      auth = {
        type: SMTPAuthType.OAUTH2,
        user: oauth2User,
        clientId: oauth2ClientId,
        clientSecret: oauth2ClientSecret,
        refreshToken: oauth2RefreshToken,
        accessUrl: oauth2AccessUrl,
      };
    } else {
      const smtpUser = env.INFRA.MAILER_SMTP_USER?.trim() || undefined;
      const smtpPass = env.INFRA.MAILER_SMTP_PASSWORD?.trim() || undefined;

      const hasUser = !!smtpUser;
      const hasPass = !!smtpPass;
      if (hasUser !== hasPass) {
        throw new Error(
          'SMTP auth requires both MAILER_SMTP_USER and MAILER_SMTP_PASSWORD. Provide both or leave both empty for unauthenticated relay.',
        );
      }

      auth =
        smtpUser && smtpPass
          ? { type: SMTPAuthType.LOGIN, user: smtpUser, pass: smtpPass }
          : undefined;
    }

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
