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
  name: string;
  value: string;
};

export type Config = {
  name: string;
  key: string;
};

const GOOGLE_CONFIGS: Config[] = [
  {
    name: 'GOOGLE_CLIENT_ID',
    key: 'client_id',
  },
  {
    name: 'GOOGLE_CLIENT_SECRET',
    key: 'client_secret',
  },
  {
    name: 'GOOGLE_CALLBACK_URL',
    key: 'callback_url',
  },
  {
    name: 'GOOGLE_SCOPE',
    key: 'scope',
  },
];

const MICROSOFT_CONFIGS: Config[] = [
  {
    name: 'MICROSOFT_CLIENT_ID',
    key: 'client_id',
  },
  {
    name: 'MICROSOFT_CLIENT_SECRET',
    key: 'client_secret',
  },
  {
    name: 'MICROSOFT_CALLBACK_URL',
    key: 'callback_url',
  },
  {
    name: 'MICROSOFT_SCOPE',
    key: 'scope',
  },
  {
    name: 'MICROSOFT_TENANT',
    key: 'tenant',
  },
];

const GITHUB_CONFIGS: Config[] = [
  {
    name: 'GITHUB_CLIENT_ID',
    key: 'client_id',
  },
  {
    name: 'GITHUB_CLIENT_SECRET',
    key: 'client_secret',
  },
  {
    name: 'GITHUB_CALLBACK_URL',
    key: 'callback_url',
  },
  {
    name: 'GITHUB_SCOPE',
    key: 'scope',
  },
];

const MAIL_CONFIGS: Config[] = [
  {
    name: 'MAILER_SMTP_URL',
    key: 'mailer_smtp_url',
  },
  {
    name: 'MAILER_ADDRESS_FROM',
    key: 'mailer_from_address',
  },
];

const DATA_SHARING_CONFIGS: Config[] = [
  {
    name: 'ALLOW_ANALYTICS_COLLECTION',
    key: 'allow_analytics_collection',
  },
];

const ALL_CONFIGS = [
  GOOGLE_CONFIGS,
  MICROSOFT_CONFIGS,
  GITHUB_CONFIGS,
  MAIL_CONFIGS,
  DATA_SHARING_CONFIGS,
];

export {
  GOOGLE_CONFIGS,
  MICROSOFT_CONFIGS,
  GITHUB_CONFIGS,
  MAIL_CONFIGS,
  DATA_SHARING_CONFIGS,
  ALL_CONFIGS,
};
