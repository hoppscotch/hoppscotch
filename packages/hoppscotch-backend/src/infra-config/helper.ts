import { AuthProvider } from 'src/auth/helper';
import { ENV_INVALID_DATA_ENCRYPTION_KEY } from 'src/errors';
import { PrismaService } from 'src/prisma/prisma.service';
import { InfraConfigEnum } from 'src/types/InfraConfig';
import { decrypt, encrypt } from 'src/utils';
import { randomBytes } from 'crypto';

export enum ServiceStatus {
  ENABLE = 'ENABLE',
  DISABLE = 'DISABLE',
}

type DefaultInfraConfig = {
  name: InfraConfigEnum;
  value: string;
  isEncrypted: boolean;
};

/**
 * Returns a mapping of authentication providers to their required configuration keys based on the current environment configuration.
 */
export function getAuthProviderRequiredKeys(
  env: Record<string, any>,
): Record<AuthProvider, InfraConfigEnum[]> {
  return {
    [AuthProvider.GOOGLE]: [
      InfraConfigEnum.GOOGLE_CLIENT_ID,
      InfraConfigEnum.GOOGLE_CLIENT_SECRET,
      InfraConfigEnum.GOOGLE_CALLBACK_URL,
      InfraConfigEnum.GOOGLE_SCOPE,
    ],
    [AuthProvider.GITHUB]: [
      InfraConfigEnum.GITHUB_CLIENT_ID,
      InfraConfigEnum.GITHUB_CLIENT_SECRET,
      InfraConfigEnum.GITHUB_CALLBACK_URL,
      InfraConfigEnum.GITHUB_SCOPE,
    ],
    [AuthProvider.MICROSOFT]: [
      InfraConfigEnum.MICROSOFT_CLIENT_ID,
      InfraConfigEnum.MICROSOFT_CLIENT_SECRET,
      InfraConfigEnum.MICROSOFT_CALLBACK_URL,
      InfraConfigEnum.MICROSOFT_SCOPE,
      InfraConfigEnum.MICROSOFT_TENANT,
    ],
    [AuthProvider.EMAIL]:
      env['INFRA'].MAILER_USE_CUSTOM_CONFIGS === 'true'
        ? [
            InfraConfigEnum.MAILER_SMTP_HOST,
            InfraConfigEnum.MAILER_SMTP_PORT,
            InfraConfigEnum.MAILER_SMTP_SECURE,
            InfraConfigEnum.MAILER_SMTP_USER,
            InfraConfigEnum.MAILER_SMTP_PASSWORD,
            InfraConfigEnum.MAILER_TLS_REJECT_UNAUTHORIZED,
            InfraConfigEnum.MAILER_ADDRESS_FROM,
          ]
        : [
            InfraConfigEnum.MAILER_SMTP_URL,
            InfraConfigEnum.MAILER_ADDRESS_FROM,
          ],
  };
}

/**
 * Load environment variables from the database and set them in the process
 *
 * @Description Fetch the 'infra_config' table from the database and return it as an object
 * (ConfigModule will set the environment variables in the process)
 */
export async function loadInfraConfiguration() {
  try {
    const prisma = new PrismaService();
    const infraConfigs = await prisma.infraConfig.findMany();

    const environmentObject: Record<string, string> = {};
    infraConfigs.forEach((infraConfig) => {
      if (infraConfig.isEncrypted) {
        environmentObject[infraConfig.name] = decrypt(infraConfig.value);
      } else {
        environmentObject[infraConfig.name] = infraConfig.value;
      }
    });

    return { INFRA: environmentObject };
  } catch (error) {
    if (error.code === 'ERR_OSSL_BAD_DECRYPT')
      throw new Error(ENV_INVALID_DATA_ENCRYPTION_KEY);

    // Prisma throw error if 'Can't reach at database server' OR 'Table does not exist'
    // Reason for not throwing error is, we want successful build during 'postinstall' and generate dist files
    console.error('Error from loadInfraConfiguration', error);
    return { INFRA: {} };
  }
}

/**
 * Read the default values from .env file and return them as an array
 * @returns Array of default infra configs
 */
export async function getDefaultInfraConfigs(): Promise<DefaultInfraConfig[]> {
  const prisma = new PrismaService();

  // Prepare rows for 'infra_config' table with default values (from .env) for each 'name'
  const onboardingCompleteStatus = await isOnboardingCompleted();
  const generatedAnalyticsUserId = generateAnalyticsUserId();
  const isSecureCookies = determineAllowSecureCookies(
    process.env.VITE_BASE_URL,
  );

  const infraConfigDefaultObjs: DefaultInfraConfig[] = [
    {
      name: InfraConfigEnum.ONBOARDING_COMPLETED,
      value: onboardingCompleteStatus.toString(),
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.ONBOARDING_RECOVERY_TOKEN,
      value: null,
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.JWT_SECRET,
      value: encrypt(randomBytes(32).toString('hex')),
      isEncrypted: true,
    },
    {
      name: InfraConfigEnum.SESSION_SECRET,
      value: encrypt(randomBytes(32).toString('hex')),
      isEncrypted: true,
    },
    {
      name: InfraConfigEnum.TOKEN_SALT_COMPLEXITY,
      value: '10',
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.MAGIC_LINK_TOKEN_VALIDITY,
      value: '24', // 24 hours
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.REFRESH_TOKEN_VALIDITY,
      value: '604800000', // 7 days in milliseconds
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.ACCESS_TOKEN_VALIDITY,
      value: '86400000', // 1 day in milliseconds
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.ALLOW_SECURE_COOKIES,
      value: isSecureCookies.toString(),
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.RATE_LIMIT_TTL,
      value: '10000', // in milliseconds (10 seconds)
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.RATE_LIMIT_MAX,
      value: '100', // 100 requests per IP per RATE_LIMIT_TTL
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.MAILER_SMTP_ENABLE,
      value: 'false',
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.MAILER_USE_CUSTOM_CONFIGS,
      value: null,
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.MAILER_SMTP_URL,
      value: null,
      isEncrypted: true,
    },
    {
      name: InfraConfigEnum.MAILER_ADDRESS_FROM,
      value: null,
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.MAILER_SMTP_HOST,
      value: null,
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.MAILER_SMTP_PORT,
      value: null,
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.MAILER_SMTP_SECURE,
      value: null,
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.MAILER_SMTP_USER,
      value: null,
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.MAILER_SMTP_PASSWORD,
      value: null,
      isEncrypted: true,
    },
    {
      name: InfraConfigEnum.MAILER_TLS_REJECT_UNAUTHORIZED,
      value: null,
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.GOOGLE_CLIENT_ID,
      value: null,
      isEncrypted: true,
    },
    {
      name: InfraConfigEnum.GOOGLE_CLIENT_SECRET,
      value: null,
      isEncrypted: true,
    },
    {
      name: InfraConfigEnum.GOOGLE_CALLBACK_URL,
      value: null,
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.GOOGLE_SCOPE,
      value: null,
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.GITHUB_CLIENT_ID,
      value: null,
      isEncrypted: true,
    },
    {
      name: InfraConfigEnum.GITHUB_CLIENT_SECRET,
      value: null,
      isEncrypted: true,
    },
    {
      name: InfraConfigEnum.GITHUB_CALLBACK_URL,
      value: null,
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.GITHUB_SCOPE,
      value: null,
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.MICROSOFT_CLIENT_ID,
      value: null,
      isEncrypted: true,
    },
    {
      name: InfraConfigEnum.MICROSOFT_CLIENT_SECRET,
      value: null,
      isEncrypted: true,
    },
    {
      name: InfraConfigEnum.MICROSOFT_CALLBACK_URL,
      value: null,
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.MICROSOFT_SCOPE,
      value: null,
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.MICROSOFT_TENANT,
      value: null,
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.VITE_ALLOWED_AUTH_PROVIDERS,
      value: null,
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.ALLOW_ANALYTICS_COLLECTION,
      value: false.toString(),
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.ANALYTICS_USER_ID,
      value: generatedAnalyticsUserId,
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.IS_FIRST_TIME_INFRA_SETUP,
      value: (await prisma.infraConfig.count()) === 0 ? 'true' : 'false',
      isEncrypted: false,
    },
    {
      name: InfraConfigEnum.USER_HISTORY_STORE_ENABLED,
      value: 'true',
      isEncrypted: false,
    },
  ];

  return infraConfigDefaultObjs;
}

/**
 * Get the missing entries in the 'infra_config' table
 * @returns Array of InfraConfig
 */
export async function getMissingInfraConfigEntries(
  infraConfigDefaultObjs: DefaultInfraConfig[],
) {
  const prisma = new PrismaService();
  const dbInfraConfigs = await prisma.infraConfig.findMany();

  const missingEntries = infraConfigDefaultObjs.filter(
    (config) =>
      !dbInfraConfigs.some((dbConfig) => dbConfig.name === config.name),
  );

  return missingEntries;
}

/**
 * Get the encryption required entries in the 'infra_config' table
 * @returns Array of InfraConfig
 */
export async function getEncryptionRequiredInfraConfigEntries(
  infraConfigDefaultObjs: DefaultInfraConfig[],
) {
  const prisma = new PrismaService();
  const dbInfraConfigs = await prisma.infraConfig.findMany();

  const requiredEncryption = dbInfraConfigs.filter((dbConfig) => {
    const defaultConfig = infraConfigDefaultObjs.find(
      (config) => config.name === dbConfig.name,
    );
    if (!defaultConfig) return false;
    return defaultConfig.isEncrypted !== dbConfig.isEncrypted;
  });

  return requiredEncryption;
}

/**
 * Verify if 'infra_config' table is loaded with all entries
 * @returns boolean
 */
export async function isInfraConfigTablePopulated(): Promise<boolean> {
  try {
    const defaultInfraConfigs = await getDefaultInfraConfigs();
    const propsRemainingToInsert =
      await getMissingInfraConfigEntries(defaultInfraConfigs);

    if (propsRemainingToInsert.length > 0) {
      console.log(
        'Infra Config table is not populated with all entries. Populating now...',
      );
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Stop the app after 5 seconds
 * (Docker will re-start the app)
 */
export function stopApp() {
  console.log('Stopping app in 5 seconds...');

  setTimeout(() => {
    console.log('Stopping app now...');
    process.kill(process.pid, 'SIGTERM');
  }, 5000);
}

/**
 * Get the configured SSO providers from 'infra_config' table.
 * @description Usage every time the app starts by AuthModule to initiate Strategies.
 * @returns Array of configured SSO providers
 */
export async function getConfiguredSSOProvidersFromInfraConfig() {
  const prisma = new PrismaService();
  const env = await loadInfraConfiguration();
  const providerConfigKeys = getAuthProviderRequiredKeys(env);

  const allowedAuthProviders: string[] =
    env['INFRA'].VITE_ALLOWED_AUTH_PROVIDERS?.split(',') ?? [];

  const configuredAuthProviders = allowedAuthProviders.filter((provider) => {
    const requiredKeys = providerConfigKeys[provider];
    return requiredKeys?.every((key) => env['INFRA'][key]);
  });

  if (configuredAuthProviders.length === 0) {
    await prisma.infraConfig.update({
      where: { name: InfraConfigEnum.VITE_ALLOWED_AUTH_PROVIDERS },
      data: { value: null },
    });
    return '';
  } else if (allowedAuthProviders.length !== configuredAuthProviders.length) {
    await prisma.infraConfig.update({
      where: { name: InfraConfigEnum.VITE_ALLOWED_AUTH_PROVIDERS },
      data: { value: configuredAuthProviders.join(',') },
    });
    stopApp();
    console.log(
      `${configuredAuthProviders.join(',')} SSO auth provider(s) are configured properly. To enable other SSO providers, configure them from Admin Dashboard.`,
    );
  }

  return configuredAuthProviders.join(',');
}

/**
 * Check if the onboarding is completed by verifying if the allowed auth providers are configured
 * @returns boolean
 */
export async function isOnboardingCompleted(): Promise<boolean> {
  const prisma = new PrismaService();
  const allowedProviders = await prisma.infraConfig.findUnique({
    where: { name: InfraConfigEnum.VITE_ALLOWED_AUTH_PROVIDERS },
    select: { value: true },
  });

  if (!allowedProviders?.value || allowedProviders.value === '') {
    return false;
  }

  return true;
}

/**
 * Generate a hashed valued for analytics
 * @returns Generated hashed value
 */
export function generateAnalyticsUserId() {
  const hashedUserID = randomBytes(20).toString('hex');
  return hashedUserID;
}

/**
 * Determine if ALLOW_SECURE_COOKIES should be true or false
 * @returns boolean
 */
export function determineAllowSecureCookies(appBaseUrl: string) {
  return appBaseUrl.startsWith('https');
}

/**
 * Builds a map of environment variables that are derived from other configuration values
 * @returns Record<string, string>
 */
export async function buildDerivedEnv() {
  const envConfigMap = await loadInfraConfiguration();
  const derivedEnv: Record<string, string> = {};

  // Normalize URLs
  const baseUrl = process.env.VITE_BASE_URL || '';
  const backendUrl = process.env.VITE_BACKEND_API_URL || '';
  const normalizedBackendUrl = backendUrl?.replace(/\/+$/, ''); // remove trailing slash

  // Set ALLOW_SECURE_COOKIES based on base URL protocol
  const expectedSecure = determineAllowSecureCookies(baseUrl).toString();
  const currentSecure = envConfigMap.INFRA.ALLOW_SECURE_COOKIES;
  if (currentSecure !== expectedSecure) {
    derivedEnv.ALLOW_SECURE_COOKIES = expectedSecure;
  }

  // Set GOOGLE_CALLBACK_URL, MICROSOFT_CALLBACK_URL, and GITHUB_CALLBACK_URL based on backend URL (self healing) if user changed the backend URL
  // Callback URL definitions
  const callbackConfigs = [
    { key: InfraConfigEnum.GOOGLE_CALLBACK_URL, path: '/auth/google/callback' },
    {
      key: InfraConfigEnum.MICROSOFT_CALLBACK_URL,
      path: '/auth/microsoft/callback',
    },
    { key: InfraConfigEnum.GITHUB_CALLBACK_URL, path: '/auth/github/callback' },
  ];
  // Update callback URLs if they don't match the backend
  for (const { key, path } of callbackConfigs) {
    const currentCallback = envConfigMap.INFRA[key];
    const expectedCallback = `${normalizedBackendUrl}${path}`;

    if (
      backendUrl.length > 0 &&
      currentCallback &&
      currentCallback !== expectedCallback
    ) {
      derivedEnv[key] = expectedCallback;
    }
  }

  return derivedEnv;
}
