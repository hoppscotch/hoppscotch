import { onMounted, ref, watch } from 'vue';
import { useI18n } from './i18n';
import { useToast } from './toast';
import { auth } from '~/helpers/auth';
import { InfraConfigEnum } from '~/helpers/backend/graphql';
import { getLocalConfig, setLocalConfig } from '~/helpers/localpersistence';
import { makeReadableKey } from '~/helpers/utils/readableKey';

export type OAuthProvider = 'GOOGLE' | 'GITHUB' | 'MICROSOFT';
export type EnabledConfig = OAuthProvider | 'OAUTH' | 'MAILER' | 'EMAIL';

// common OAuth keys used across providers
type OAuthKeys = 'CLIENT_ID' | 'CLIENT_SECRET' | 'CALLBACK_URL' | 'SCOPE';

// Microsoft specific keys
type MicrosoftKeys = OAuthKeys | 'TENANT';

type OAuthConfig<Keys extends string, Prefix extends string> = {
  [K in Keys as `${Prefix}_${K}`]: string;
};

// Mailer specific keys
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
    MAILER_SMTP_SECURE: configs.MAILER_SMTP_SECURE || 'false',
    MAILER_SMTP_USER: configs.MAILER_SMTP_USER ?? '',
    MAILER_SMTP_PASSWORD: configs.MAILER_SMTP_PASSWORD ?? '',
    MAILER_TLS_REJECT_UNAUTHORIZED:
      configs.MAILER_TLS_REJECT_UNAUTHORIZED || 'false',
  };
}

/**
 * The handler for onboarding configuration.
 * This composable manages the state and logic for onboarding configurations,
 * including enabling/disabling configs, validating inputs,
 * and submitting the onboarding form.
 * @returns Composable for handling onboarding configuration.
 */
export function useOnboardingConfigHandler() {
  const t = useI18n();
  const toast = useToast();

  const enabledConfigs = ref<EnabledConfig[]>([]);
  const isProvidersLoading = ref(false);
  const submittingConfigs = ref(false);

  const onBoardingSummary = ref<OnBoardingSummary>({
    type: 'success',
    message: t('onboarding.setup_complete.title'),
    description: t('onboarding.setup_complete.description'),
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

  // Set callback URLs for OAuth providers based on the current backend API URL
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

  const makeOnboardingSummary = (error?: Error): OnBoardingSummary => {
    const addedConfigs = enabledConfigs.value;

    if (addedConfigs.length === 0) {
      return {
        type: 'error',
        message: t('onboarding.onboarding_incomplete.title'),
        description: t('onboarding.onboarding_incomplete.description', {
          error:
            error?.message || t('onboarding.onboarding_incomplete.description'),
        }),
        configsAdded: [],
      };
    }

    return {
      type: 'success',
      message: t('onboarding.setup_complete.title'),
      description: t('onboarding.setup_complete.description'),
      configsAdded: addedConfigs.filter((key) => key !== 'MAILER'),
    };
  };

  /**
   * Filters out unnecessary configs based on the current state.
   * For example, if MAILER_USE_CUSTOM_CONFIGS is false,
   * we don't need MAILER_SMTP_URL, MAILER_TLS_REJECT_UNAUTHORIZED, MAILER_SMTP_SECURE.
   * @param keys Array of config keys to filter
   * @returns Filtered array of keys that are needed based on the current state
   */
  const filterNeededConfigs = (keys: string[]) => {
    const mailer = currentConfigs.value.mailerConfigs;
    const usingCustom = mailer.MAILER_USE_CUSTOM_CONFIGS === 'true';

    return keys.filter((key) => {
      if (!key.startsWith('MAILER_')) return true;
      if (!enabledConfigs.value.includes('MAILER')) return false;

      if (!usingCustom) {
        return [
          'MAILER_SMTP_ENABLE',
          'MAILER_SMTP_URL',
          'MAILER_ADDRESS_FROM',
        ].includes(key);
      }

      return [
        'MAILER_SMTP_HOST',
        'MAILER_SMTP_PORT',
        'MAILER_SMTP_USER',
        'MAILER_SMTP_PASSWORD',
        'MAILER_ADDRESS_FROM',
        'MAILER_USE_CUSTOM_CONFIGS',
        'MAILER_SMTP_SECURE',
        'MAILER_TLS_REJECT_UNAUTHORIZED',
        'MAILER_SMTP_ENABLE',
      ].includes(key);
    });
  };

  /**
   * Validates the provided configs.
   * Checks if all required fields are filled and returns a filtered object
   * with only the enabled configs that have values.
   * @param configs Object containing config key-value pairs
   * @returns Filtered object with valid configs or undefined if validation fails
   */
  const validateConfigs = (configs: Partial<Record<string, string>>) => {
    if (!configs || Object.keys(configs).length === 0) {
      toast.error(t('onboarding.configuration_error'));
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
            t('onboarding.please_fill_configurations', {
              fieldName: makeReadableKey(key),
            })
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

  /**
   * Adds the onboarding configs to the backend.
   * It validates the configs, prepares the payload,
   * and sends it to the backend API.
   * We set the token in localStorage for re-fetching configs later.
   * @returns The token for re-fetching configs or undefined if failed
   */
  const addOnBoardingConfigs = async () => {
    submittingConfigs.value = true;
    const payload = {
      ...currentConfigs.value.oAuthProviders.GOOGLE,
      ...currentConfigs.value.oAuthProviders.GITHUB,
      ...currentConfigs.value.oAuthProviders.MICROSOFT,
      ...currentConfigs.value.mailerConfigs,
    };

    const validated = validateConfigs(payload);

    if (!validated || Object.keys(validated).length === 0) {
      toast.error(t('onboarding.add_atleast_one_auth_provider'));
      submittingConfigs.value = false;
      return;
    }

    const filteredEnabledConfigs = enabledConfigs.value.filter(
      (config) => config !== 'OAUTH' && config !== 'MAILER'
    );

    const configWithAuth = {
      ...validated,
      [InfraConfigEnum.ViteAllowedAuthProviders]:
        filteredEnabledConfigs.join(','),
    };

    try {
      const res = await auth.addOnBoardingConfigs(configWithAuth);
      if (res?.token) {
        setLocalConfig('access_token', res.token);
        toast.success(t('onboarding.configurations_added_successfully'));
        onBoardingSummary.value = makeOnboardingSummary();
        return res;
      }
    } catch (err) {
      console.error('Failed to add onboarding configs', err);
      toast.error(t('onboarding.configurations_adding_failed'));
      onBoardingSummary.value = makeOnboardingSummary(err as Error);
    } finally {
      submittingConfigs.value = false;
    }
  };

  // Fetch onboarding configs on mount and populate the currentConfigs
  // and enabledConfigs based on the response.
  // This is used to pre-fill the form with existing configs.
  onMounted(async () => {
    try {
      isProvidersLoading.value = true;
      const token = getLocalConfig('access_token');
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
    } catch (err) {
      console.error('Error fetching onboarding configs', err);
    } finally {
      isProvidersLoading.value = false;
    }
  });

  // Watch for changes in currentConfigs and update the callback URLs
  // and enable/disable configs based on the SMTP settings.
  // This ensures that the form reflects the current state of the configs.
  watch(
    currentConfigs,
    () => {
      setCallbackUrls();

      if (
        currentConfigs.value.mailerConfigs.MAILER_SMTP_ENABLE?.toLowerCase() ===
        'true'
      ) {
        // Enable MAILER and EMAIL configs if SMTP is enabled
        // because we need to add EMAIL in VITE_ALLOWED_AUTH_PROVIDERS
        // and MAILER because the key is used in backend
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
    addOnBoardingConfigs,
  };
}
