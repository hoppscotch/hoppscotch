import { InfraConfigEnum } from './backend/graphql';

export type SsoAuthProviders = 'google' | 'microsoft' | 'github';

export type ServerConfigs = {
  providers: {
    google: {
      name: SsoAuthProviders;
      enabled: boolean;
      fields: {
        client_id: string;
        client_secret: string;
        callback_url: string;
        scope: string;
      };
    };
    github: {
      name: SsoAuthProviders;
      enabled: boolean;
      fields: {
        client_id: string;
        client_secret: string;
        callback_url: string;
        scope: string;
      };
    };
    microsoft: {
      name: SsoAuthProviders;
      enabled: boolean;
      fields: {
        client_id: string;
        client_secret: string;
        callback_url: string;
        scope: string;
        tenant: string;
      };
    };
  };

  mailConfigs: {
    name: string;
    enabled: boolean;
    fields: {
      mailer_smtp_url: string;
      mailer_from_address: string;
    };
  };

  dataSharingConfigs: {
    name: string;
    enabled: boolean;
  };
};

export type UpdatedConfigs = {
  name: InfraConfigEnum;
  value: string;
};

export type ConfigTransform = {
  config: Config[];
  enabled?: boolean;
  fields?: Record<string, string | boolean> | string;
};

export type ConfigSection = {
  enabled: boolean;
  fields: Record<string, string>;
};

export type Config = {
  name: InfraConfigEnum;
  key: string;
};

export const GOOGLE_CONFIGS: Config[] = [
  {
    name: InfraConfigEnum.GoogleClientId,
    key: 'client_id',
  },
  {
    name: InfraConfigEnum.GoogleClientSecret,
    key: 'client_secret',
  },
  {
    name: InfraConfigEnum.GoogleCallbackUrl,
    key: 'callback_url',
  },
  {
    name: InfraConfigEnum.GoogleScope,
    key: 'scope',
  },
];

export const MICROSOFT_CONFIGS: Config[] = [
  {
    name: InfraConfigEnum.MicrosoftClientId,
    key: 'client_id',
  },
  {
    name: InfraConfigEnum.MicrosoftClientSecret,
    key: 'client_secret',
  },
  {
    name: InfraConfigEnum.MicrosoftCallbackUrl,
    key: 'callback_url',
  },
  {
    name: InfraConfigEnum.MicrosoftScope,
    key: 'scope',
  },
  {
    name: InfraConfigEnum.MicrosoftTenant,
    key: 'tenant',
  },
];

export const GITHUB_CONFIGS: Config[] = [
  {
    name: InfraConfigEnum.GithubClientId,
    key: 'client_id',
  },
  {
    name: InfraConfigEnum.GithubClientSecret,
    key: 'client_secret',
  },
  {
    name: InfraConfigEnum.GithubCallbackUrl,
    key: 'callback_url',
  },
  {
    name: InfraConfigEnum.GithubScope,
    key: 'scope',
  },
];

export const MAIL_CONFIGS: Config[] = [
  {
    name: InfraConfigEnum.MailerSmtpUrl,
    key: 'mailer_smtp_url',
  },
  {
    name: InfraConfigEnum.MailerAddressFrom,
    key: 'mailer_from_address',
  },
];

const DATA_SHARING_CONFIGS: Omit<Config, 'key'>[] = [
  {
    name: InfraConfigEnum.AllowAnalyticsCollection,
  },
];

export const ALL_CONFIGS = [
  GOOGLE_CONFIGS,
  MICROSOFT_CONFIGS,
  GITHUB_CONFIGS,
  MAIL_CONFIGS,
  DATA_SHARING_CONFIGS,
];
