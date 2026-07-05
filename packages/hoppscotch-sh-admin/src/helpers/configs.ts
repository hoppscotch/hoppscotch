import { inject, provide, ref, type InjectionKey, type Ref } from 'vue';
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
      email_auth: boolean;
      mailer_smtp_url: string;
      mailer_from_address: string;
      mailer_smtp_host: string;
      mailer_smtp_port: string;
      mailer_smtp_user: string;
      mailer_smtp_password: string;
      mailer_smtp_secure: boolean;
      mailer_smtp_ignore_tls: boolean;
      mailer_tls_reject_unauthorized: boolean;
      mailer_use_custom_configs: boolean;
      mailer_smtp_auth_type: string;
      mailer_smtp_oauth2_user: string;
      mailer_smtp_oauth2_client_id: string;
      mailer_smtp_oauth2_client_secret: string;
      mailer_smtp_oauth2_refresh_token: string;
      mailer_smtp_oauth2_access_url: string;
    };
  };

  tokenConfigs: {
    name: string;
    fields: {
      jwt_secret: string;
      token_salt_complexity: string;
      magic_link_token_validity: string;
      refresh_token_validity: string;
      access_token_validity: string;
      session_secret: string;
      session_cookie_name: string;
    };
  };

  historyConfig: {
    name: string;
    enabled: boolean;
  };

  dataSharingConfigs: {
    name: string;
    enabled: boolean;
  };

  rateLimitConfigs: {
    name: string;
    fields: {
      rate_limit_ttl: string;
      rate_limit_max: string;
    };
  };
  mockServerConfigs?: {
    name: string;
    fields: {
      mock_server_wildcard_domain: string;
    };
  };

  proxyUrlConfigs: {
    name: string;
    fields: {
      proxy_app_url: string;
    };
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
  name: SsoAuthProviders | string;
  enabled?: boolean;
  fields: Record<string, string | boolean>;
};

export type Config = {
  name: InfraConfigEnum;
  key: string;
  // Marks fields that are optional and should be excluded from mandatory validation
  optional?: boolean;
  // Marks free-form secret strings (e.g. JWT/session secrets). Validated as
  // non-empty only — never coerced to a number — so a numeric-looking secret
  // like "0" or "1.5" stays valid (the backend stores these as opaque strings).
  secret?: boolean;
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
  {
    name: InfraConfigEnum.MailerSmtpEnable,
    key: 'mailer_smtp_enabled',
  },
  {
    name: InfraConfigEnum.MailerUseCustomConfigs,
    key: 'mailer_use_custom_configs',
  },
];

export const CUSTOM_MAIL_CONFIGS: Config[] = [
  {
    name: InfraConfigEnum.MailerSmtpHost,
    key: 'mailer_smtp_host',
  },
  {
    name: InfraConfigEnum.MailerSmtpPort,
    key: 'mailer_smtp_port',
  },
  {
    name: InfraConfigEnum.MailerSmtpUser,
    key: 'mailer_smtp_user',
  },
  {
    name: InfraConfigEnum.MailerSmtpPassword,
    key: 'mailer_smtp_password',
  },
  {
    name: InfraConfigEnum.MailerSmtpSecure,
    key: 'mailer_smtp_secure',
  },
  {
    name: InfraConfigEnum.MailerSmtpIgnoreTls,
    key: 'mailer_smtp_ignore_tls',
  },
  {
    name: InfraConfigEnum.MailerTlsRejectUnauthorized,
    key: 'mailer_tls_reject_unauthorized',
  },
  {
    name: InfraConfigEnum.MailerSmtpAuthType,
    key: 'mailer_smtp_auth_type',
  },
  {
    name: InfraConfigEnum.MailerSmtpOauth2User,
    key: 'mailer_smtp_oauth2_user',
  },
  {
    name: InfraConfigEnum.MailerSmtpOauth2ClientId,
    key: 'mailer_smtp_oauth2_client_id',
  },
  {
    name: InfraConfigEnum.MailerSmtpOauth2ClientSecret,
    key: 'mailer_smtp_oauth2_client_secret',
  },
  {
    name: InfraConfigEnum.MailerSmtpOauth2RefreshToken,
    key: 'mailer_smtp_oauth2_refresh_token',
  },
  {
    name: InfraConfigEnum.MailerSmtpOauth2AccessUrl,
    key: 'mailer_smtp_oauth2_access_url',
  },
];

const DATA_SHARING_CONFIGS: Omit<Config, 'key'>[] = [
  {
    name: InfraConfigEnum.AllowAnalyticsCollection,
  },
];

export const HISTORY_STORE_CONFIG: Config[] = [
  {
    name: InfraConfigEnum.UserHistoryStoreEnabled,
    key: 'history_store_enabled',
  },
];

export const RATE_LIMIT_CONFIGS: Config[] = [
  {
    name: InfraConfigEnum.RateLimitTtl,
    key: 'rate_limit_ttl',
  },
  {
    name: InfraConfigEnum.RateLimitMax,
    key: 'rate_limit_max',
  },
];

export const TOKEN_VALIDATION_CONFIGS: Config[] = [
  {
    name: InfraConfigEnum.JwtSecret,
    key: 'jwt_secret',
    secret: true,
  },
  {
    name: InfraConfigEnum.SessionSecret,
    key: 'session_secret',
    secret: true,
  },
  {
    name: InfraConfigEnum.SessionCookieName,
    key: 'session_cookie_name',
    optional: true,
  },
  {
    name: InfraConfigEnum.TokenSaltComplexity,
    key: 'token_salt_complexity',
  },
  {
    name: InfraConfigEnum.MagicLinkTokenValidity,
    key: 'magic_link_token_validity',
  },
  {
    name: InfraConfigEnum.RefreshTokenValidity,
    key: 'refresh_token_validity',
  },
  {
    name: InfraConfigEnum.AccessTokenValidity,
    key: 'access_token_validity',
  },
];

export const MOCK_SERVER_CONFIGS: Config[] = [
  {
    name: InfraConfigEnum.MockServerWildcardDomain,
    key: 'mock_server_wildcard_domain',
  },
];

export const PROXY_URL_CONFIGS: Config[] = [
  {
    name: InfraConfigEnum.ProxyAppUrl,
    key: 'proxy_app_url',
  },
];

// Mirrors the backend validateUrl regex (packages/hoppscotch-backend/src/utils.ts).
// Keep these in sync — the backend rejects PROXY_APP_URL values that don't match.
export const PROXY_URL_REGEX = /^(http|https):\/\/[^ "]+$/;

export const isValidProxyUrl = (value: string): boolean =>
  PROXY_URL_REGEX.test(value);

// Mirrors the backend cookie-name validation.
export const SESSION_COOKIE_NAME_REGEX = /^[A-Za-z0-9_-]+$/;

export const isValidSessionCookieName = (value: string): boolean =>
  SESSION_COOKIE_NAME_REGEX.test(value);

export const ALL_CONFIGS = [
  GOOGLE_CONFIGS,
  MICROSOFT_CONFIGS,
  GITHUB_CONFIGS,
  MAIL_CONFIGS,
  CUSTOM_MAIL_CONFIGS,
  DATA_SHARING_CONFIGS,
  HISTORY_STORE_CONFIG,
  RATE_LIMIT_CONFIGS,
  TOKEN_VALIDATION_CONFIGS,
  MOCK_SERVER_CONFIGS,
  PROXY_URL_CONFIGS,
];

// Token fields that are optional and excluded from mandatory validation.
export const OPTIONAL_TOKEN_FIELD_KEYS = new Set(
  TOKEN_VALIDATION_CONFIGS.filter((cfg) => cfg.optional).map((cfg) => cfg.key)
);

// Token fields that are free-form secrets — validated as non-empty only, never
// numerically (see Config.secret). Everything else in the section is numeric.
export const TOKEN_SECRET_FIELD_KEYS = new Set(
  TOKEN_VALIDATION_CONFIGS.filter((cfg) => cfg.secret).map((cfg) => cfg.key)
);

export const isFieldEmpty = (field: string | boolean | number): boolean => {
  if (typeof field === 'boolean' || typeof field === 'number') return false;
  return field.trim() === '';
};

// Rate-limit rule: the backend requires positive integers (>= 1) for both
// RATE_LIMIT_TTL and RATE_LIMIT_MAX, so blanks, non-numerics, decimals, zero,
// and negatives are all invalid. Boolean short-circuits to valid to keep the
// shared field-union signature (these fields are always numeric in practice).
export const isNotValidNumber = (field: string | boolean | number): boolean => {
  if (typeof field === 'boolean') return false;
  const num = typeof field === 'number' ? field : Number(field.trim());
  if (!Number.isFinite(num)) return true;
  return !Number.isInteger(num) || num < 1;
};

// Single source of truth for config validation. `getConfigValidationIssues` drives
// the save guard, tab dots, field borders, and blocked-save console.
// Add a field: render it and wire `isConfigFieldErrored` from `useConfigValidation()` — no edits here, the section loops are generic.
// Add a section/tab: push from a new block below, extend `ConfigSectionId`/`ConfigTab`, and add `:indicator` in `settings.vue`.

export type ConfigTab = 'auth' | 'smtp' | 'proxy' | 'rate-limit';
export type ConfigSubTab = 'auth-providers' | 'token';
export type ConfigSectionId =
  | SsoAuthProviders
  | 'email'
  | 'token'
  | 'rate_limit'
  | 'proxy';

// What's wrong with a value; maps via GUARD_BY_KIND to its save guard / toast.
export type ConfigIssueKind =
  | 'empty' // required field left blank
  | 'invalid-number' // numeric field present but not a positive integer (>= 1)
  | 'invalid-format' // value present but malformed (e.g. proxy / SMTP URL)
  | 'incomplete'; // interdependent pair only half-filled (SMTP user/pass)

export type ConfigGuard = 'required' | 'format' | 'smtp-pair';

// `invalid-number` sits with `invalid-format` under the `format` guard, not
// `required`: the field isn't empty, it holds a bad value, so it should tip the
// "invalid values" toast rather than "fill all the fields". Only truly blank
// fields (`empty`) map to `required`.
const GUARD_BY_KIND: Record<ConfigIssueKind, ConfigGuard> = {
  empty: 'required',
  'invalid-number': 'format',
  'invalid-format': 'format',
  incomplete: 'smtp-pair',
};

export type ConfigValidationIssue = {
  tab: ConfigTab;
  subTab?: ConfigSubTab;
  section: ConfigSectionId;
  fieldKey: string;
  envVar: string; // matching InfraConfig env var, e.g. PROXY_APP_URL
  kind: ConfigIssueKind;
};

const lookupEnvVar = (configs: Config[], key: string): string =>
  configs.find((cfg) => cfg.key === key)?.name ?? '';

const emptyOrInvalidNumber = (
  value: string | boolean | number
): ConfigIssueKind =>
  typeof value === 'string' && value.trim() === ''
    ? 'empty'
    : 'invalid-number';

const PROVIDER_CONFIGS: Record<SsoAuthProviders, Config[]> = {
  google: GOOGLE_CONFIGS,
  github: GITHUB_CONFIGS,
  microsoft: MICROSOFT_CONFIGS,
};

export const getConfigValidationIssues = (
  config: ServerConfigs
): ConfigValidationIssue[] => {
  const issues: ConfigValidationIssue[] = [];

  // SSO providers → auth › auth-providers
  // Only validate enabled providers — a disabled provider with blank fields
  // is intentional config and must not block saves elsewhere.
  (Object.keys(PROVIDER_CONFIGS) as SsoAuthProviders[]).forEach((name) => {
    const provider = config.providers[name];
    if (!provider.enabled) return;

    Object.entries(provider.fields).forEach(([fieldKey, value]) => {
      if (isFieldEmpty(value)) {
        issues.push({
          tab: 'auth',
          subTab: 'auth-providers',
          section: name,
          fieldKey,
          envVar: lookupEnvVar(PROVIDER_CONFIGS[name], fieldKey),
          kind: 'empty',
        });
      }
    });
  });

  // Mail / SMTP → smtp
  // Only runs when SMTP is enabled. Three concerns are checked separately:
  //   1. required-empty (generic loop, mode-aware exclude list)
  //   2. URL format (basic mode only — smtp:// or smtps://)
  //   3. SMTP user/password pair completeness (custom mode)
  const mail = config.mailConfigs;
  if (mail.enabled) {
    const useCustom = mail.fields.mailer_use_custom_configs;
    // user/password are optional but only as a pair — see (3) below.
    const optionalMailerKeys = ['mailer_smtp_user', 'mailer_smtp_password'];
    // OAuth2 is opt-in; these never block a save on their own.
    const oauth2Keys = [
      'mailer_smtp_auth_type',
      'mailer_smtp_oauth2_user',
      'mailer_smtp_oauth2_client_id',
      'mailer_smtp_oauth2_client_secret',
      'mailer_smtp_oauth2_refresh_token',
      'mailer_smtp_oauth2_access_url',
    ];
    // Required-field set depends on mode:
    //   custom-ON  → host + port + from_address (URL excluded; not used)
    //   custom-OFF → URL + from_address (host/port/user/password excluded)
    // OAuth2 fields are excluded in both modes (always optional).
    const excludeKeys = useCustom
      ? ['mailer_smtp_url', ...optionalMailerKeys, ...oauth2Keys]
      : [
          'mailer_smtp_host',
          'mailer_smtp_port',
          'mailer_smtp_user',
          'mailer_smtp_password',
          ...oauth2Keys,
        ];

    // (1) Required-empty: iterate every mail field and flag the non-excluded
    // ones that are blank. `mailer_use_custom_configs` is a toggle (not a
    // validatable field); `isFieldEmpty` is a no-op for booleans so TLS/secure
    // flags pass through without comment.
    Object.entries(mail.fields).forEach(([fieldKey, value]) => {
      if (fieldKey === 'mailer_use_custom_configs') return;
      if (excludeKeys.includes(fieldKey)) return;
      if (isFieldEmpty(value)) {
        issues.push({
          tab: 'smtp',
          section: 'email',
          fieldKey,
          envVar: lookupEnvVar(
            [...MAIL_CONFIGS, ...CUSTOM_MAIL_CONFIGS],
            fieldKey
          ),
          kind: 'empty',
        });
      }
    });

    // (2) URL format — basic mode only. nodemailer's `createTransport` accepts
    // smtp:// or smtps:// only. In custom mode the URL is hidden and never sent
    // (see the transform in useConfigHandler), so a stale/malformed value must
    // not block the save. Emptiness is owned by the required-empty loop above;
    // flagging empty here too would double-classify and tip the wrong toast.
    const smtpUrl = mail.fields.mailer_smtp_url;
    if (
      !useCustom &&
      !isFieldEmpty(smtpUrl) &&
      !smtpUrl.startsWith('smtp://') &&
      !smtpUrl.startsWith('smtps://')
    ) {
      issues.push({
        tab: 'smtp',
        section: 'email',
        fieldKey: 'mailer_smtp_url',
        envVar: lookupEnvVar(MAIL_CONFIGS, 'mailer_smtp_url'),
        kind: 'invalid-format',
      });
    }

    // (3) SMTP user/password must be provided together or not at all — the
    // backend (validateSmtpCredentialPair) rejects a half-filled pair with
    // INFRA_CONFIG_INVALID_INPUT, so mirror it here to surface the precise
    // toast instead of a generic backend error. Only relevant in custom mode
    // (basic mode embeds credentials in the URL).
    if (useCustom) {
      const hasUser = mail.fields.mailer_smtp_user.trim() !== '';
      const hasPass = mail.fields.mailer_smtp_password.trim() !== '';
      if (hasUser !== hasPass) {
        const missingKey = hasUser
          ? 'mailer_smtp_password'
          : 'mailer_smtp_user';
        issues.push({
          tab: 'smtp',
          section: 'email',
          fieldKey: missingKey,
          envVar: lookupEnvVar(CUSTOM_MAIL_CONFIGS, missingKey),
          kind: 'incomplete',
        });
      }
    }
  }

  // Token validity → auth › token
  // Mixed-shape section validated per field identity (not value shape):
  //   - secret strings (jwt_secret, session_secret) only need to be non-empty,
  //     so a numeric-looking secret like "0" or "1.5" stays valid;
  //   - the numeric fields (salt complexity, token validities) must be positive
  //     integers (>= 1) to match the backend.
  // `session_cookie_name` is format-validated separately below.
  Object.entries(config.tokenConfigs.fields).forEach(([fieldKey, value]) => {
    if (OPTIONAL_TOKEN_FIELD_KEYS.has(fieldKey)) return;
    const invalid = TOKEN_SECRET_FIELD_KEYS.has(fieldKey)
      ? isFieldEmpty(value)
      : isNotValidNumber(value);
    if (invalid) {
      issues.push({
        tab: 'auth',
        subTab: 'token',
        section: 'token',
        fieldKey,
        envVar: lookupEnvVar(TOKEN_VALIDATION_CONFIGS, fieldKey),
        kind: emptyOrInvalidNumber(value),
      });
    }
  });

  // Empty falls back to the backend default; only flag malformed non-empty.
  const sessionCookieName =
    config.tokenConfigs.fields.session_cookie_name ?? '';
  if (
    !isFieldEmpty(sessionCookieName) &&
    !isValidSessionCookieName(sessionCookieName)
  ) {
    issues.push({
      tab: 'auth',
      subTab: 'token',
      section: 'token',
      fieldKey: 'session_cookie_name',
      envVar: lookupEnvVar(TOKEN_VALIDATION_CONFIGS, 'session_cookie_name'),
      kind: 'invalid-format',
    });
  }

  // Rate limit → rate-limit
  // Both fields are unconditionally required numerics — no enable toggle.
  Object.entries(config.rateLimitConfigs.fields).forEach(([fieldKey, value]) => {
    if (isNotValidNumber(value)) {
      issues.push({
        tab: 'rate-limit',
        section: 'rate_limit',
        fieldKey,
        envVar: lookupEnvVar(RATE_LIMIT_CONFIGS, fieldKey),
        kind: emptyOrInvalidNumber(value),
      });
    }
  });

  // Proxy URL → proxy
  // Required unconditionally (no enable toggle). The if/else ordering matters:
  // an empty value also fails `isValidProxyUrl`, so we classify it as 'empty'
  // first so it tips the input_empty toast (same priority as pre-refactor),
  // not the input_validation_error toast.
  const proxyUrl = config.proxyUrlConfigs.fields.proxy_app_url ?? '';
  if (isFieldEmpty(proxyUrl)) {
    issues.push({
      tab: 'proxy',
      section: 'proxy',
      fieldKey: 'proxy_app_url',
      envVar: lookupEnvVar(PROXY_URL_CONFIGS, 'proxy_app_url'),
      kind: 'empty',
    });
  } else if (!isValidProxyUrl(proxyUrl)) {
    issues.push({
      tab: 'proxy',
      section: 'proxy',
      fieldKey: 'proxy_app_url',
      envVar: lookupEnvVar(PROXY_URL_CONFIGS, 'proxy_app_url'),
      kind: 'invalid-format',
    });
  }

  return issues;
};

// True when any issue maps to the given save guard.
export const hasGuardIssue = (
  issues: ConfigValidationIssue[],
  guard: ConfigGuard
): boolean => issues.some((issue) => GUARD_BY_KIND[issue.kind] === guard);

// Proactive — drives indicator dots without waiting for a save attempt.
export const tabHasConfigIssue = (
  issues: ConfigValidationIssue[],
  tab: ConfigTab,
  subTab?: ConfigSubTab
): boolean =>
  issues.some(
    (issue) => issue.tab === tab && (!subTab || issue.subTab === subTab)
  );

/* Provide/inject (not module singleton) so an unscoped consumer throws loudly instead of
   reading empty state. `configEdited` mirrors `settings.vue`'s `isConfigUpdated` (gates borders
   to typing-time); `configValidationIssues` is rebuilt by its deep watch on `workingConfigs`. */
export type ConfigValidationContext = {
  configEdited: Ref<boolean>;
  configValidationIssues: Ref<ConfigValidationIssue[]>;
};

const CONFIG_VALIDATION_KEY: InjectionKey<ConfigValidationContext> =
  Symbol('config-validation');

// Called once by the owner (settings.vue); returns the refs so it can drive
// its watchers.
export const provideConfigValidation = (): ConfigValidationContext => {
  const context: ConfigValidationContext = {
    configEdited: ref(false),
    configValidationIssues: ref<ConfigValidationIssue[]>([]),
  };
  provide(CONFIG_VALIDATION_KEY, context);
  return context;
};

// Called by any descendant; throws when no provider is above it, so a consumer
// outside settings.vue fails loudly instead of silently reading empty state.
export const useConfigValidation = () => {
  const context = inject(CONFIG_VALIDATION_KEY);
  if (!context) {
    throw new Error(
      'useConfigValidation() must be used under a component that called ' +
        'provideConfigValidation() (settings.vue). These config components read ' +
        'validation state from that provider and cannot be mounted standalone.'
    );
  }

  // Border lights up once the form is edited and the field has a live issue.
  const isConfigFieldErrored = (section: ConfigSectionId, fieldKey: string) =>
    context.configEdited.value &&
    context.configValidationIssues.value.some(
      (issue) => issue.section === section && issue.fieldKey === fieldKey
    );

  return { ...context, isConfigFieldErrored };
};
