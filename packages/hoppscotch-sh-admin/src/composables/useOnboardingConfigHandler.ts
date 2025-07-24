import { onMounted, ref, watch } from 'vue';
import { useI18n } from './i18n';
import { useToast } from './toast';
import { auth } from '~/helpers/auth';
import { InfraConfigEnum } from '~/helpers/backend/graphql';

export type OAuthProvider = 'GOOGLE' | 'GITHUB' | 'MICROSOFT';
export type EnabledConfig = OAuthProvider | 'MAILER' | 'EMAIL';

type OAuthKeys = 'CLIENT_ID' | 'CLIENT_SECRET' | 'CALLBACK_URL' | 'SCOPE';

type MicrosoftKeys = OAuthKeys | 'TENANT';

type OAuthConfig<Keys extends string, Prefix extends string> = {
  [K in Keys as `${Prefix}_${K}`]: string;
};

export type MailerConfigKeys =
  | 'SMTP_ENABLE'
  | 'USE_CUSTOM_CONFIGS'
  | 'SMTP_URL'
  | 'ADDRESS_FROM'
  | 'SMTP_HOST'
  | 'SMTP_PORT'
  | 'SMTP_SECURE'
  | 'SMTP_USER'
  | 'SMTP_PASSWORD'
  | 'TLS_REJECT_UNAUTHORIZED';

export type Configs = {
  oAuthProviders: {
    GOOGLE: OAuthConfig<OAuthKeys, 'GOOGLE'>;
    GITHUB: OAuthConfig<OAuthKeys, 'GITHUB'>;
    MICROSOFT: OAuthConfig<MicrosoftKeys, 'MICROSOFT'>;
  };
  mailerConfigs: {
    [K in `MAILER_${MailerConfigKeys}`]: string;
  };
};

export type OnBoardingSummary = {
  type: 'success' | 'error';
  message: string;
  description: string;
  configsAdded: string[];
};

export const makeReadableKey = (string: string) => {
  if (!string) return '';
  const val = string.replace(/_/g, ' ').toLocaleLowerCase();
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
};

function mapOAuthProviders(
  configs: Partial<Record<InfraConfigEnum, string>>
): Configs['oAuthProviders'] {
  return {
    GOOGLE: {
      GOOGLE_CLIENT_ID: configs.GOOGLE_CLIENT_ID ?? '',
      GOOGLE_CLIENT_SECRET: configs.GOOGLE_CLIENT_SECRET ?? '',
      GOOGLE_CALLBACK_URL: '',
      GOOGLE_SCOPE: configs.GOOGLE_SCOPE ?? '',
    },
    GITHUB: {
      GITHUB_CLIENT_ID: configs.GITHUB_CLIENT_ID ?? '',
      GITHUB_CLIENT_SECRET: configs.GITHUB_CLIENT_SECRET ?? '',
      GITHUB_CALLBACK_URL: '',
      GITHUB_SCOPE: configs.GITHUB_SCOPE ?? '',
    },
    MICROSOFT: {
      MICROSOFT_CLIENT_ID: configs.MICROSOFT_CLIENT_ID ?? '',
      MICROSOFT_CLIENT_SECRET: configs.MICROSOFT_CLIENT_SECRET ?? '',
      MICROSOFT_CALLBACK_URL: '',
      MICROSOFT_SCOPE: configs.MICROSOFT_SCOPE ?? '',
      MICROSOFT_TENANT: configs.MICROSOFT_TENANT ?? '',
    },
  };
}

function mapMailerConfigs(
  configs: Partial<Record<InfraConfigEnum, string>>
): Configs['mailerConfigs'] {
  return {
    MAILER_SMTP_ENABLE: configs.MAILER_SMTP_ENABLE ?? '',
    MAILER_USE_CUSTOM_CONFIGS: configs.MAILER_USE_CUSTOM_CONFIGS || 'false',
    MAILER_SMTP_URL: configs.MAILER_SMTP_URL ?? '',
    MAILER_ADDRESS_FROM: configs.MAILER_ADDRESS_FROM ?? '',
    MAILER_SMTP_HOST: configs.MAILER_SMTP_HOST ?? '',
    MAILER_SMTP_PORT: configs.MAILER_SMTP_PORT ?? '',
    MAILER_SMTP_SECURE: configs.MAILER_SMTP_SECURE || '',
    MAILER_SMTP_USER: configs.MAILER_SMTP_USER ?? '',
    MAILER_SMTP_PASSWORD: configs.MAILER_SMTP_PASSWORD ?? '',
    MAILER_TLS_REJECT_UNAUTHORIZED:
      configs.MAILER_TLS_REJECT_UNAUTHORIZED || '',
  };
}

export function useOnboardingConfigHandler() {
  const t = useI18n();
  const toast = useToast();

  const enabledConfigs = ref<EnabledConfig[]>([]);
  const isProvidersLoading = ref(false);
  const submittingConfigs = ref(false);

  const onBoardingSummary = ref<OnBoardingSummary>({
    type: 'success',
    message: t('onboarding.addConfigsSuccess'),
    description: t('onboarding.addConfigsDescription'),
    configsAdded: [] as string[],
  });

  const currentConfigs = ref<Configs>({
    oAuthProviders: mapOAuthProviders({}),
    mailerConfigs: mapMailerConfigs({}),
  });

  const enableConfig = (config: EnabledConfig) => {
    if (!enabledConfigs.value.includes(config)) {
      enabledConfigs.value.push(config);
    }
  };

  const toggleConfig = (key: EnabledConfig | 'OAUTH' | 'EMAIL') => {
    if (key === 'OAUTH') {
      enabledConfigs.value = enabledConfigs.value.filter(
        (c) => !['GOOGLE', 'GITHUB', 'MICROSOFT'].includes(c)
      );
      return;
    }

    if (key === 'EMAIL') {
      const hasEmail = enabledConfigs.value.includes('EMAIL');
      const hasMailer = enabledConfigs.value.includes('MAILER');
      enabledConfigs.value = enabledConfigs.value.filter(
        (c) => c !== 'EMAIL' && c !== 'MAILER'
      );
      if (!hasEmail || !hasMailer) {
        enabledConfigs.value.push('EMAIL', 'MAILER');
      }
      return;
    }

    if (enabledConfigs.value.includes(key)) {
      enabledConfigs.value = enabledConfigs.value.filter((c) => c !== key);
    } else {
      enableConfig(key);
    }
  };

  const toggleSmtpConfig = () => {
    const current = currentConfigs.value.mailerConfigs.MAILER_SMTP_ENABLE;
    currentConfigs.value.mailerConfigs.MAILER_SMTP_ENABLE =
      current === 'true' ? 'false' : 'true';
  };

  const setCallbackUrls = () => {
    const base = import.meta.env.VITE_BACKEND_API_URL;
    const oAuth = currentConfigs.value.oAuthProviders;

    if (oAuth.GOOGLE.GOOGLE_CLIENT_ID) {
      oAuth.GOOGLE.GOOGLE_CALLBACK_URL = `${base}/auth/google/callback`;
    }
    if (oAuth.GITHUB.GITHUB_CLIENT_ID) {
      oAuth.GITHUB.GITHUB_CALLBACK_URL = `${base}/auth/github/callback`;
    }
    if (oAuth.MICROSOFT.MICROSOFT_CLIENT_ID) {
      oAuth.MICROSOFT.MICROSOFT_CALLBACK_URL = `${base}/auth/microsoft/callback`;
    }
  };

  const enableInitialConfigs = () => {
    const { GOOGLE, GITHUB, MICROSOFT } = currentConfigs.value.oAuthProviders;
    const { MAILER_SMTP_ENABLE } = currentConfigs.value.mailerConfigs;

    if (GOOGLE.GOOGLE_CLIENT_ID && enabledConfigs.value.includes('GOOGLE'))
      enableConfig('GOOGLE');
    if (GITHUB.GITHUB_CLIENT_ID && enabledConfigs.value.includes('GITHUB'))
      enableConfig('GITHUB');
    if (
      MICROSOFT.MICROSOFT_CLIENT_ID &&
      enabledConfigs.value.includes('MICROSOFT')
    )
      enableConfig('MICROSOFT');

    if (
      MAILER_SMTP_ENABLE?.trim().toLowerCase() === 'true' &&
      enabledConfigs.value.includes('EMAIL')
    ) {
      enableConfig('MAILER');
    }
  };

  const makeOnboardingSummary = (error?: Error): OnBoardingSummary => {
    const addedConfigs = enabledConfigs.value;

    if (addedConfigs.length === 0) {
      return {
        type: 'error',
        message: t('onboarding.addConfigsError'),
        description: t('onboarding.addConfigsDescription', {
          error: error?.message || t('onboarding.addConfigsDefaultError'),
        }),
        configsAdded: [],
      };
    }

    return {
      type: 'success',
      message: t('onboarding.addConfigsSuccess'),
      description: t('onboarding.addConfigsDescription'),
      configsAdded: addedConfigs.filter((key) => key !== 'MAILER'),
    };
  };

  const filterNeededConfigs = (keys: string[]) => {
    const mailer = currentConfigs.value.mailerConfigs;
    const usingCustom = mailer.MAILER_USE_CUSTOM_CONFIGS === 'true';

    return keys.filter((key) => {
      if (!key.startsWith('MAILER_')) return true;
      if (!enabledConfigs.value.includes('MAILER')) return false;

      if (!usingCustom) {
        return ['MAILER_SMTP_URL', 'MAILER_ADDRESS_FROM'].includes(key);
      }

      return key !== 'MAILER_SMTP_URL'; // URL not needed in custom config
    });
  };

  const validateConfigs = (configs: Partial<Record<string, string>>) => {
    if (!configs || Object.keys(configs).length === 0) {
      toast.error(t('onboarding.addConfigsError'));
      return;
    }

    const relevantKeys = Object.keys(configs).filter((key) =>
      enabledConfigs.value.includes(key.split('_')[0] as EnabledConfig)
    );

    const neededKeys = filterNeededConfigs(relevantKeys);
    const allFilled = neededKeys.every((key) => configs[key]);

    if (!allFilled) {
      neededKeys.forEach((key) => {
        if (!configs[key])
          toast.error(
            `Please fill the required field: ${makeReadableKey(
              key.replace(/_/g, ' ')
            )}`
          );
      });
      return;
    }

    return Object.fromEntries(
      Object.entries(configs).filter(
        ([key, val]) =>
          enabledConfigs.value.includes(key.split('_')[0] as EnabledConfig) &&
          val
      )
    );
  };

  const addOnBoardingCongigs = async () => {
    submittingConfigs.value = true;
    const payload = {
      ...currentConfigs.value.oAuthProviders.GOOGLE,
      ...currentConfigs.value.oAuthProviders.GITHUB,
      ...currentConfigs.value.oAuthProviders.MICROSOFT,
      ...currentConfigs.value.mailerConfigs,
    };

    const validated = validateConfigs(payload);
    if (!validated || Object.keys(validated).length === 0) {
      toast.error('Please add at least one config');
      return;
    }

    const configWithAuth = {
      ...validated,
      [InfraConfigEnum.ViteAllowedAuthProviders]: enabledConfigs.value
        .filter((x) => x !== 'MAILER')
        .join(','),
    };

    try {
      const res = await auth.addOnBoardingCongigs(configWithAuth);
      if (res?.token) {
        localStorage.setItem('access_token', res.token);
        toast.success('Onboarding configs added successfully');
        onBoardingSummary.value = makeOnboardingSummary();
        return res;
      }
    } catch (err) {
      console.error('Failed to add onboarding configs', err);
      toast.error('Failed to add onboarding configs');
      onBoardingSummary.value = makeOnboardingSummary(err as Error);
    } finally {
      submittingConfigs.value = false;
    }
  };

  onMounted(async () => {
    try {
      isProvidersLoading.value = true;
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const configs = await auth.getOnboardingConfigs(token);
      if (!configs) return;

      const allowed = configs[InfraConfigEnum.ViteAllowedAuthProviders];
      if (allowed) {
        enabledConfigs.value = allowed.split(',') as EnabledConfig[];
      }

      currentConfigs.value = {
        oAuthProviders: mapOAuthProviders(configs),
        mailerConfigs: mapMailerConfigs(configs),
      };

      enableInitialConfigs();
    } catch (err) {
      console.error('Error fetching onboarding configs', err);
    } finally {
      isProvidersLoading.value = false;
    }
  });

  watch(
    currentConfigs,
    () => {
      setCallbackUrls();

      if (
        currentConfigs.value.mailerConfigs.MAILER_SMTP_ENABLE?.toLowerCase() ===
        'true'
      ) {
        enableConfig('MAILER');
        enableConfig('EMAIL');
      }
    },
    { deep: true, immediate: true }
  );

  return {
    currentConfigs,
    enabledConfigs,
    isProvidersLoading,
    onBoardingSummary,
    submittingConfigs,
    toggleConfig,
    toggleSmtpConfig,
    enabledConfig: enableConfig,
    addOnBoardingCongigs,
  };
}
