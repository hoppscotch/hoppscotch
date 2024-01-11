import { AuthProvider } from 'src/auth/helper';
import { AUTH_PROVIDER_NOT_CONFIGURED } from 'src/errors';
import { PrismaService } from 'src/prisma/prisma.service';
import { InfraConfigEnum } from 'src/types/InfraConfig';
import { throwErr } from 'src/utils';

export enum ServiceStatus {
  ENABLE = 'ENABLE',
  DISABLE = 'DISABLE',
}

const AuthProviderConfigurations = {
  [AuthProvider.GOOGLE]: [
    InfraConfigEnum.GOOGLE_CLIENT_ID,
    InfraConfigEnum.GOOGLE_CLIENT_SECRET,
  ],
  [AuthProvider.GITHUB]: [
    InfraConfigEnum.GITHUB_CLIENT_ID,
    InfraConfigEnum.GITHUB_CLIENT_SECRET,
  ],
  [AuthProvider.MICROSOFT]: [
    InfraConfigEnum.MICROSOFT_CLIENT_ID,
    InfraConfigEnum.MICROSOFT_CLIENT_SECRET,
  ],
  [AuthProvider.EMAIL]: [
    InfraConfigEnum.MAILER_SMTP_URL,
    InfraConfigEnum.MAILER_ADDRESS_FROM,
  ],
};

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

    let environmentObject: Record<string, any> = {};
    infraConfigs.forEach((infraConfig) => {
      environmentObject[infraConfig.name] = infraConfig.value;
    });

    return { INFRA: environmentObject };
  } catch (error) {
    // Prisma throw error if 'Can't reach at database server' OR 'Table does not exist'
    // Reason for not throwing error is, we want successful build during 'postinstall' and generate dist files
    return { INFRA: {} };
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
 * Get the configured SSO providers
 * @returns Array of configured SSO providers
 */
export function getConfiguredSSOProviders() {
  const allowedAuthProviders: string[] =
    process.env.VITE_ALLOWED_AUTH_PROVIDERS.split(',');
  let configuredAuthProviders: string[] = [];

  const addProviderIfConfigured = (provider) => {
    const configParameters: string[] = AuthProviderConfigurations[provider];

    const isConfigured = configParameters.every((configParameter) => {
      return process.env[configParameter];
    });

    if (isConfigured) configuredAuthProviders.push(provider);
  };

  allowedAuthProviders.forEach((provider) => addProviderIfConfigured(provider));

  if (configuredAuthProviders.length === 0) {
    throwErr(AUTH_PROVIDER_NOT_CONFIGURED);
  } else if (allowedAuthProviders.length !== configuredAuthProviders.length) {
    const unConfiguredAuthProviders = allowedAuthProviders.filter(
      (provider) => {
        return !configuredAuthProviders.includes(provider);
      },
    );
    console.log(
      `${unConfiguredAuthProviders.join(
        ',',
      )} SSO auth provider(s) are not configured properly. Do configure them from Admin Dashboard.`,
    );
  }

  return configuredAuthProviders.join(',');
}
