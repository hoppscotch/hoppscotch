import { AnyVariables, UseMutationResponse } from '@urql/vue';
import { cloneDeep } from 'lodash-es';
import { onMounted, ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import {
  AllowedAuthProvidersDocument,
  AuthProvider,
  EnableAndDisableSsoArgs,
  EnableAndDisableSsoMutation,
  InfraConfigArgs,
  InfraConfigEnum,
  InfraConfigsDocument,
  ResetInfraConfigsMutation,
  ServiceStatus,
  ToggleAnalyticsCollectionMutation,
  ToggleSmtpMutation,
  ToggleUserHistoryStoreMutation,
  UpdateInfraConfigsMutation,
} from '~/helpers/backend/graphql';
import {
  ALL_CONFIGS,
  CUSTOM_MAIL_CONFIGS,
  ConfigSection,
  ConfigTransform,
  GITHUB_CONFIGS,
  GOOGLE_CONFIGS,
  MAIL_CONFIGS,
  MICROSOFT_CONFIGS,
  ServerConfigs,
  UpdatedConfigs,
} from '~/helpers/configs';
import { getCompiledErrorMessage } from '~/helpers/errors';
import { useToast } from './toast';
import { useClientHandler } from './useClientHandler';

/** Composable that handles all operations related to server configurations
 * @param updatedConfigs A Config Object containing the updated configs
 */
export function useConfigHandler(updatedConfigs?: ServerConfigs) {
  const t = useI18n();
  const toast = useToast();

  // Fetching infra configurations
  const {
    fetching: fetchingInfraConfigs,
    error: infraConfigsError,
    dataAsList: infraConfigs,
    fetchData: fetchInfraConfigs,
  } = useClientHandler(
    InfraConfigsDocument,
    {
      configNames: ALL_CONFIGS.flat().map(
        ({ name }) => name
      ) as InfraConfigEnum[],
    },
    (x) => x.infraConfigs
  );

  // Fetching allowed auth providers
  const {
    fetching: fetchingAllowedAuthProviders,
    error: allowedAuthProvidersError,
    dataAsList: allowedAuthProviders,
    fetchData: fetchAllowedAuthProviders,
  } = useClientHandler(
    AllowedAuthProvidersDocument,
    {},
    (x) => x.allowedAuthProviders
  );

  // Current and working configs
  const currentConfigs = ref<ServerConfigs>();
  const workingConfigs = ref<ServerConfigs>();

  onMounted(async () => {
    await fetchInfraConfigs();
    await fetchAllowedAuthProviders();

    const getFieldValue = (name: InfraConfigEnum) =>
      infraConfigs.value.find((x) => x.name === name)?.value ?? '';

    // Transforming the fetched data into a Configs object
    currentConfigs.value = {
      providers: {
        google: {
          name: 'google',
          enabled: allowedAuthProviders.value.includes(AuthProvider.Google),
          fields: {
            client_id: getFieldValue(InfraConfigEnum.GoogleClientId),
            client_secret: getFieldValue(InfraConfigEnum.GoogleClientSecret),
            callback_url: getFieldValue(InfraConfigEnum.GoogleCallbackUrl),
            scope: getFieldValue(InfraConfigEnum.GoogleScope),
          },
        },
        github: {
          name: 'github',
          enabled: allowedAuthProviders.value.includes(AuthProvider.Github),
          fields: {
            client_id: getFieldValue(InfraConfigEnum.GithubClientId),
            client_secret: getFieldValue(InfraConfigEnum.GithubClientSecret),
            callback_url: getFieldValue(InfraConfigEnum.GithubCallbackUrl),
            scope: getFieldValue(InfraConfigEnum.GithubScope),
          },
        },
        microsoft: {
          name: 'microsoft',
          enabled: allowedAuthProviders.value.includes(AuthProvider.Microsoft),
          fields: {
            client_id: getFieldValue(InfraConfigEnum.MicrosoftClientId),
            client_secret: getFieldValue(InfraConfigEnum.MicrosoftClientSecret),
            callback_url: getFieldValue(InfraConfigEnum.MicrosoftCallbackUrl),
            scope: getFieldValue(InfraConfigEnum.MicrosoftScope),
            tenant: getFieldValue(InfraConfigEnum.MicrosoftTenant),
          },
        },
      },
      mailConfigs: {
        name: 'email',
        enabled: getFieldValue(InfraConfigEnum.MailerSmtpEnable) === 'true',
        fields: {
          email_auth: allowedAuthProviders.value.includes(AuthProvider.Email),
          mailer_smtp_url: getFieldValue(InfraConfigEnum.MailerSmtpUrl),
          mailer_from_address: getFieldValue(InfraConfigEnum.MailerAddressFrom),
          mailer_smtp_host: getFieldValue(InfraConfigEnum.MailerSmtpHost),
          mailer_smtp_port: getFieldValue(InfraConfigEnum.MailerSmtpPort),
          mailer_smtp_user: getFieldValue(InfraConfigEnum.MailerSmtpUser),
          mailer_smtp_password: getFieldValue(
            InfraConfigEnum.MailerSmtpPassword
          ),
          mailer_smtp_secure:
            getFieldValue(InfraConfigEnum.MailerSmtpSecure) === 'true',
          mailer_tls_reject_unauthorized:
            getFieldValue(InfraConfigEnum.MailerTlsRejectUnauthorized) ===
            'true',
          mailer_use_custom_configs:
            getFieldValue(InfraConfigEnum.MailerUseCustomConfigs) === 'true',
        },
      },
      tokenConfigs: {
        name: 'token',
        fields: {
          jwt_secret: getFieldValue(InfraConfigEnum.JwtSecret),
          token_salt_complexity: getFieldValue(
            InfraConfigEnum.TokenSaltComplexity
          ),
          magic_link_token_validity: getFieldValue(
            InfraConfigEnum.MagicLinkTokenValidity
          ),
          refresh_token_validity: getFieldValue(
            InfraConfigEnum.RefreshTokenValidity
          ),
          access_token_validity: getFieldValue(
            InfraConfigEnum.AccessTokenValidity
          ),
          session_secret: getFieldValue(InfraConfigEnum.SessionSecret),
        },
      },
      dataSharingConfigs: {
        name: 'data_sharing',
        enabled: !!infraConfigs.value.find(
          (x) => x.name === 'ALLOW_ANALYTICS_COLLECTION' && x.value === 'true'
        ),
      },
      historyConfig: {
        name: 'history_settings',
        enabled: !!infraConfigs.value.find(
          (config) =>
            config.name === 'USER_HISTORY_STORE_ENABLED' &&
            config.value === 'ENABLE'
        ),
      },
      rateLimitConfigs: {
        name: 'rate_limit',
        fields: {
          rate_limit_ttl: getFieldValue(InfraConfigEnum.RateLimitTtl),
          rate_limit_max: getFieldValue(InfraConfigEnum.RateLimitMax),
        },
      },
    };

    // Cloning the current configs to working configs
    // Changes are made only to working configs
    workingConfigs.value = cloneDeep(currentConfigs.value);
  });

  // Check if custom mail config is enabled
  const isCustomMailConfigEnabled =
    updatedConfigs?.mailConfigs.fields.mailer_use_custom_configs;

  /*
    Check if any of the config fields are empty
  */
  const isFieldEmpty = (field: string | boolean) => {
    if (typeof field === 'boolean' || typeof field === 'number') {
      return false;
    }
    return field.trim() === '';
  };

  /**
   * This is used to validate number fields, ensuring they are not NaN or less than or equal to zero.
   * It checks if the field is a number or a numeric string, and returns true if it is not valid.
   * @param field Field value to validate
   * @returns Boolean indicating if the field is not valid
   */
  const isNotValidNumber = (field: string | boolean | number) => {
    if (typeof field === 'boolean') {
      return false;
    }

    // Accept numbers or numeric strings (e.g., "1000"), but not non-numeric strings (e.g., "abc")
    if (typeof field === 'number') {
      return isNaN(field);
    }

    if (typeof field === 'string') {
      // Trim and check if the string is a valid number
      const trimmed = field.trim();
      if (trimmed === '') return true;
      return isNaN(Number(trimmed));
    }

    return true;
  };

  /**
   * Check if the field is not valid
   * This is used to validate number fields, ensuring they are not NaN or less than or equal to zero.
   * @param field Field value to validate
   * @returns Boolean indicating if the field is valid
   */
  const isFieldNotValid = (field: string | boolean) => {
    if (typeof field === 'boolean') {
      return false;
    }

    const num = Number(field);
    if (isNaN(num) && typeof field === 'string') {
      return field.trim() === '';
    }

    return num <= 0;
  };

  const AreAnyConfigFieldsEmpty = (config: ServerConfigs): boolean => {
    const sections: Array<ConfigSection> = [
      config.providers.github,
      config.providers.google,
      config.providers.microsoft,
      config.mailConfigs,
      config.rateLimitConfigs,
      config.tokenConfigs,
    ];

    const hasSectionWithEmptyFields = sections.some((section) => {
      if (section.name === 'email') {
        const { mailer_use_custom_configs, ...otherFields } = section.fields;

        const excludeKeys = mailer_use_custom_configs
          ? ['mailer_smtp_url']
          : [
              'mailer_smtp_host',
              'mailer_smtp_port',
              'mailer_smtp_user',
              'mailer_smtp_password',
            ];

        return (
          section.enabled &&
          Object.entries(otherFields).some(
            ([key, value]) => isFieldEmpty(value) && !excludeKeys.includes(key)
          )
        );
      }

      // This section has no enabled property, so we check fields directly
      // for a valid number (>0) or non-empty string
      if (section.name === 'token')
        return Object.values(section.fields).some(isFieldNotValid);

      // For rate limit section, we want to check if the values are not valid numbers
      // and not empty strings
      if (section.name === 'rate_limit')
        return Object.values(section.fields).some(isNotValidNumber);

      return (
        section.enabled && Object.values(section.fields).some(isFieldEmpty)
      );
    });

    return hasSectionWithEmptyFields;
  };

  // Extract the mail config fields (excluding the custom mail config fields)
  const mailConfigFields = Object.fromEntries(
    Object.entries(updatedConfigs?.mailConfigs.fields ?? {}).filter(([key]) => {
      if (isCustomMailConfigEnabled) {
        return MAIL_CONFIGS.some(
          (x) =>
            x.key === key &&
            key !== 'mailer_smtp_url' &&
            key !== 'mailer_smtp_enabled'
        );
      } else
        return MAIL_CONFIGS.some(
          (x) => x.key === key && key !== 'mailer_smtp_enabled'
        );
    })
  );

  // Extract the custom mail config fields
  const customMailConfigFields = Object.fromEntries(
    Object.entries(updatedConfigs?.mailConfigs.fields ?? {}).filter(([key]) =>
      CUSTOM_MAIL_CONFIGS.some((x) => x.key === key)
    )
  );

  // Transforming the working configs back into the format required by the mutations
  const transformInfraConfigs = () => {
    const updatedWorkingConfigs: ConfigTransform[] = [
      {
        config: GOOGLE_CONFIGS,
        enabled: updatedConfigs?.providers.google.enabled,
        fields: updatedConfigs?.providers.google.fields,
      },
      {
        config: GITHUB_CONFIGS,
        enabled: updatedConfigs?.providers.github.enabled,
        fields: updatedConfigs?.providers.github.fields,
      },
      {
        config: MICROSOFT_CONFIGS,
        enabled: updatedConfigs?.providers.microsoft.enabled,
        fields: updatedConfigs?.providers.microsoft.fields,
      },
      {
        config: MAIL_CONFIGS,
        enabled: updatedConfigs?.mailConfigs.enabled,
        fields: mailConfigFields,
      },
      {
        config: CUSTOM_MAIL_CONFIGS,
        enabled: isCustomMailConfigEnabled,
        fields: customMailConfigFields,
      },
    ];

    const transformedConfigs: UpdatedConfigs[] = [];

    updatedWorkingConfigs.forEach(({ config, enabled, fields }) => {
      config.forEach(({ name, key }) => {
        if (name === 'MAILER_SMTP_ENABLE') return;
        else if (isCustomMailConfigEnabled && name === 'MAILER_SMTP_URL')
          return;
        else if (enabled && fields) {
          const value =
            typeof fields === 'string' ? fields : String(fields[key]);
          transformedConfigs.push({ name, value });
        }
      });
    });

    return transformedConfigs;
  };

  // Generic function to handle mutation execution and error handling
  const executeMutation = async <T, V>(
    mutation: UseMutationResponse<T>,
    variables: AnyVariables = undefined,
    errorMessage: string
  ): Promise<boolean> => {
    const result = await mutation.executeMutation(variables);

    if (result.error) {
      const { message } = result.error;
      const compiledErrorMessage = getCompiledErrorMessage(message);

      compiledErrorMessage
        ? toast.error(t(compiledErrorMessage))
        : toast.error(t(errorMessage));
      return false;
    }

    return true;
  };

  // Updating the auth provider configurations
  const updateAuthProvider = (
    updateProviderStatus: UseMutationResponse<EnableAndDisableSsoMutation>
  ) => {
    const updatedAllowedAuthProviders: EnableAndDisableSsoArgs[] = [
      {
        provider: AuthProvider.Google,
        status: updatedConfigs?.providers.google.enabled
          ? ServiceStatus.Enable
          : ServiceStatus.Disable,
      },
      {
        provider: AuthProvider.Microsoft,
        status: updatedConfigs?.providers.microsoft.enabled
          ? ServiceStatus.Enable
          : ServiceStatus.Disable,
      },
      {
        provider: AuthProvider.Github,
        status: updatedConfigs?.providers.github.enabled
          ? ServiceStatus.Enable
          : ServiceStatus.Disable,
      },
      {
        provider: AuthProvider.Email,
        status: updatedConfigs?.mailConfigs.fields.email_auth
          ? ServiceStatus.Enable
          : ServiceStatus.Disable,
      },
    ];

    return executeMutation(
      updateProviderStatus,
      {
        providerInfo: updatedAllowedAuthProviders,
      },
      'configs.auth_providers.update_failure'
    );
  };

  // Updating the infra configurations
  const updateInfraConfigs = (
    updateInfraConfigsMutation: UseMutationResponse<UpdateInfraConfigsMutation>
  ) => {
    const infraConfigs: InfraConfigArgs[] = updatedConfigs
      ? transformInfraConfigs()
      : [];

    return executeMutation(
      updateInfraConfigsMutation,
      {
        infraConfigs,
      },
      'configs.update_failure'
    );
  };

  // Resetting the infra configurations
  const resetInfraConfigs = (
    resetInfraConfigsMutation: UseMutationResponse<ResetInfraConfigsMutation>
  ) =>
    executeMutation(
      resetInfraConfigsMutation,
      undefined,
      'configs.reset.failure'
    );

  // Toggle Data Sharing
  const updateDataSharingConfigs = (
    toggleDataSharingMutation: UseMutationResponse<ToggleAnalyticsCollectionMutation>
  ) =>
    executeMutation(
      toggleDataSharingMutation,
      {
        status: updatedConfigs?.dataSharingConfigs.enabled
          ? ServiceStatus.Enable
          : ServiceStatus.Disable,
      },
      'configs.data_sharing.update_failure'
    );

  // Toggle SMTP
  const toggleSMTPConfigs = (
    toggleSMTP: UseMutationResponse<ToggleSmtpMutation>
  ) =>
    executeMutation(
      toggleSMTP,
      {
        status: updatedConfigs?.mailConfigs.enabled
          ? ServiceStatus.Enable
          : ServiceStatus.Disable,
      },
      'configs.mail_configs.toggle_failure'
    );

  // Toggle User History Store
  const toggleUserHistoryStore = (
    toggleUserHistoryStore: UseMutationResponse<ToggleUserHistoryStoreMutation>
  ) =>
    executeMutation(
      toggleUserHistoryStore,
      {
        status: updatedConfigs?.historyConfig.enabled
          ? ServiceStatus.Enable
          : ServiceStatus.Disable,
      },
      'configs.user_history_store.toggle_failure'
    );

  const updateRateLimitConfigs = (
    updateRateLimitMutation: UseMutationResponse<UpdateInfraConfigsMutation>
  ) => {
    if (!updatedConfigs?.rateLimitConfigs) {
      toast.error(t('configs.rate_limit.input_validation_error'));
      return false;
    }

    const rateLimitTtl = String(
      updatedConfigs?.rateLimitConfigs.fields.rate_limit_ttl
    );
    const rateLimitMax = String(
      updatedConfigs?.rateLimitConfigs.fields.rate_limit_max
    );

    if (isFieldEmpty(rateLimitTtl) || isFieldEmpty(rateLimitMax)) {
      toast.error(t('configs.rate_limit.input_validation_error'));
      return false;
    }

    const rateLimitConfigs: InfraConfigArgs[] = [
      {
        name: InfraConfigEnum.RateLimitTtl,
        value: String(rateLimitTtl),
      },
      {
        name: InfraConfigEnum.RateLimitMax,
        value: String(rateLimitMax),
      },
    ];

    return executeMutation(
      updateRateLimitMutation,
      {
        infraConfigs: rateLimitConfigs,
      },
      'configs.rate_limit.update_failure'
    );
  };

  const updateAuthTokenConfigs = (
    updateAuthTokenMutation: UseMutationResponse<UpdateInfraConfigsMutation>
  ) => {
    if (!updatedConfigs?.tokenConfigs) {
      toast.error(t('configs.auth_providers.token.update_failure'));
      return false;
    }

    const jwtSecret = String(updatedConfigs?.tokenConfigs.fields.jwt_secret);
    const tokenSaltComplexity = String(
      updatedConfigs?.tokenConfigs.fields.token_salt_complexity
    );
    const magicLinkTokenValidity = String(
      updatedConfigs?.tokenConfigs.fields.magic_link_token_validity
    );
    const refreshTokenValidity = String(
      updatedConfigs?.tokenConfigs.fields.refresh_token_validity
    );
    const accessTokenValidity = String(
      updatedConfigs?.tokenConfigs.fields.access_token_validity
    );
    const sessionSecret = String(
      updatedConfigs?.tokenConfigs.fields.session_secret
    );
    if (
      isFieldEmpty(jwtSecret) ||
      isFieldEmpty(tokenSaltComplexity) ||
      isFieldEmpty(magicLinkTokenValidity) ||
      isFieldEmpty(refreshTokenValidity) ||
      isFieldEmpty(accessTokenValidity) ||
      isFieldEmpty(sessionSecret)
    ) {
      toast.error(t('configs.auth_providers.token.update_failure'));
      return false;
    }

    const authTokenConfigs: InfraConfigArgs[] = [
      {
        name: InfraConfigEnum.JwtSecret,
        value: jwtSecret,
      },
      {
        name: InfraConfigEnum.TokenSaltComplexity,
        value: tokenSaltComplexity,
      },
      {
        name: InfraConfigEnum.MagicLinkTokenValidity,
        value: magicLinkTokenValidity,
      },
      {
        name: InfraConfigEnum.RefreshTokenValidity,
        value: refreshTokenValidity,
      },
      {
        name: InfraConfigEnum.AccessTokenValidity,
        value: accessTokenValidity,
      },
      {
        name: InfraConfigEnum.SessionSecret,
        value: sessionSecret,
      },
    ];

    return executeMutation(
      updateAuthTokenMutation,
      {
        infraConfigs: authTokenConfigs,
      },
      'configs.auth_providers.token.update_failure'
    );
  };

  return {
    currentConfigs,
    workingConfigs,
    updateAuthProvider,
    updateDataSharingConfigs,
    toggleSMTPConfigs,
    toggleUserHistoryStore,
    updateRateLimitConfigs,
    updateAuthTokenConfigs,
    updateInfraConfigs,
    resetInfraConfigs,
    fetchingInfraConfigs,
    fetchingAllowedAuthProviders,
    infraConfigsError,
    allowedAuthProvidersError,
    AreAnyConfigFieldsEmpty,
  };
}
