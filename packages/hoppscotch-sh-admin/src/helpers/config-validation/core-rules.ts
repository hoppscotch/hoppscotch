import {
  CUSTOM_MAIL_CONFIGS,
  Config,
  GITHUB_CONFIGS,
  GOOGLE_CONFIGS,
  MAIL_CONFIGS,
  MICROSOFT_CONFIGS,
  OPTIONAL_TOKEN_FIELD_KEYS,
  PROXY_URL_CONFIGS,
  RATE_LIMIT_CONFIGS,
  ServerConfigs,
  SsoAuthProviders,
  TOKEN_SECRET_FIELD_KEYS,
  TOKEN_VALIDATION_CONFIGS,
} from '../configs';
import {
  ConfigValidationIssue,
  SectionValidator,
  emptyOrInvalidNumber,
  isFieldEmpty,
  isNotValidNumber,
  isValidProxyUrl,
  lookupEnvVar,
} from './engine';

/* ------------------------------------------------------------------ *
 * Core validation rules — SHARED VERBATIM between SHC and SHE.
 *
 * One validator per config SECTION; each returns the issues it owns.
 * These cover sections that exist in BOTH editions. Enterprise-only
 * sections (SAML, OIDC, audit logs, …) and enterprise-only fields on
 * shared sections (GitHub Enterprise URLs) live in `enterprise-rules.ts`
 * so this file never needs an edition-specific branch — keeping it
 * byte-identical across repos and conflict-free on merge.
 *
 * SECTION-CLOSED BY DESIGN: the SSO loop only validates keys present in
 * the base `*_CONFIGS` lists, so enterprise's extra fields on a shared
 * section are invisible here and are owned by the enterprise validator.
 * ------------------------------------------------------------------ */

export type CoreConfigTab = 'auth' | 'smtp' | 'proxy' | 'rate-limit';
export type CoreConfigSubTab = 'auth-providers' | 'token';
export type CoreConfigSectionId =
  | SsoAuthProviders
  | 'email'
  | 'token'
  | 'rate_limit'
  | 'proxy';

export type CoreIssue = ConfigValidationIssue<
  CoreConfigTab,
  CoreConfigSubTab,
  CoreConfigSectionId
>;

type CoreValidator = SectionValidator<ServerConfigs, CoreIssue>;

const PROVIDER_CONFIGS: Record<SsoAuthProviders, Config[]> = {
  google: GOOGLE_CONFIGS,
  github: GITHUB_CONFIGS,
  microsoft: MICROSOFT_CONFIGS,
};

// SSO providers → auth › auth-providers
// Only validate enabled providers — a disabled provider with blank fields is
// intentional config and must not block saves elsewhere. We validate only the
// keys in each provider's base `*_CONFIGS` list, so enterprise's extra GitHub
// fields are skipped here (the enterprise validator owns them). In community
// the base list equals `provider.fields`, so behavior is unchanged.
export const validateSsoProviders: CoreValidator = (config) => {
  const issues: CoreIssue[] = [];

  (Object.keys(PROVIDER_CONFIGS) as SsoAuthProviders[]).forEach((name) => {
    const provider = config.providers[name];
    if (!provider.enabled) return;

    const baseKeys = new Set(PROVIDER_CONFIGS[name].map((cfg) => cfg.key));
    Object.entries(provider.fields).forEach(([fieldKey, value]) => {
      if (!baseKeys.has(fieldKey)) return;
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

  return issues;
};

// Mail / SMTP → smtp
// Only runs when SMTP is enabled. Three concerns are checked separately:
//   1. required-empty (generic loop, mode-aware exclude list)
//   2. URL format (basic mode only — smtp:// or smtps://)
//   3. SMTP user/password pair completeness (custom mode)
export const validateMail: CoreValidator = (config) => {
  const issues: CoreIssue[] = [];
  const mail = config.mailConfigs;
  if (!mail.enabled) return issues;

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

  // (1) Required-empty: flag every non-excluded mail field that is blank.
  // `mailer_use_custom_configs` is a toggle (not a validatable field);
  // `isFieldEmpty` is a no-op for booleans so TLS/secure flags pass through.
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
  // smtp:// or smtps:// only. In custom mode the URL is hidden and never sent,
  // so a stale/malformed value must not block the save. Emptiness is owned by
  // the required-empty loop above; flagging it here too would double-classify.
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
  // backend (validateSmtpCredentialPair) rejects a half-filled pair, so mirror
  // it here to surface the precise toast. Only relevant in custom mode (basic
  // mode embeds credentials in the URL).
  if (useCustom) {
    const hasUser = mail.fields.mailer_smtp_user.trim() !== '';
    const hasPass = mail.fields.mailer_smtp_password.trim() !== '';
    if (hasUser !== hasPass) {
      const missingKey = hasUser ? 'mailer_smtp_password' : 'mailer_smtp_user';
      issues.push({
        tab: 'smtp',
        section: 'email',
        fieldKey: missingKey,
        envVar: lookupEnvVar(CUSTOM_MAIL_CONFIGS, missingKey),
        kind: 'incomplete',
      });
    }
  }

  return issues;
};

// Token validity → auth › token
// Mixed-shape section validated per field identity (not value shape):
//   - secret strings (jwt_secret, session_secret) only need to be non-empty,
//     so a numeric-looking secret like "0" or "1.5" stays valid;
//   - the numeric fields (salt complexity, token validities) must be positive
//     integers (>= 1) to match the backend.
// `session_cookie_name` is opt-in (OPTIONAL_TOKEN_FIELD_KEYS) and skipped.
export const validateToken: CoreValidator = (config) => {
  const issues: CoreIssue[] = [];

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

  return issues;
};

// Rate limit → rate-limit
// Both fields are unconditionally required numerics — no enable toggle.
export const validateRateLimit: CoreValidator = (config) => {
  const issues: CoreIssue[] = [];

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

  return issues;
};

// Proxy URL → proxy
// Required unconditionally (no enable toggle). The if/else ordering matters: an
// empty value also fails `isValidProxyUrl`, so we classify it as 'empty' first
// (tips the input_empty toast) before the 'invalid-format' branch.
export const validateProxy: CoreValidator = (config) => {
  const issues: CoreIssue[] = [];
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

// Validators for the sections shared by both editions. Enterprise appends its
// own list to this in its `index.ts`; community uses it as-is.
export const CORE_RULES: CoreValidator[] = [
  validateSsoProviders,
  validateMail,
  validateToken,
  validateRateLimit,
  validateProxy,
];
