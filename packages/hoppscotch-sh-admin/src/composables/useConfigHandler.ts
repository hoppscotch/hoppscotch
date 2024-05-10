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
  UpdateInfraConfigsMutation,
} from '~/helpers/backend/graphql';
import {
  ALL_CONFIGS,
  ConfigSection,
  ConfigTransform,
  GITHUB_CONFIGS,
  GOOGLE_CONFIGS,
  MAIL_CONFIGS,
  MICROSOFT_CONFIGS,
  ServerConfigs,
  UpdatedConfigs,
} from '~/helpers/configs';
import { useToast } from './toast';
import { useClientHandler } from './useClientHandler';

/** Composable that handles all operations related to server configurations
 * @param updatedConfigs A Config Object contatining the updated configs
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
            callback_url: getFieldValue(InfraConfigEnum.GoogleCallbackUrl),
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
        enabled: allowedAuthProviders.value.includes(AuthProvider.Email),
        fields: {
          mailer_smtp_url: getFieldValue(InfraConfigEnum.MailerSmtpUrl),
          mailer_from_address: getFieldValue(InfraConfigEnum.MailerAddressFrom),
        },
      },
      dataSharingConfigs: {
        name: 'data_sharing',
        enabled: !!infraConfigs.value.find(
          (x) => x.name === 'ALLOW_ANALYTICS_COLLECTION' && x.value === 'true'
        ),
      },
    };

    // Cloning the current configs to working configs
    // Changes are made only to working configs
    workingConfigs.value = cloneDeep(currentConfigs.value);
  });

  /*
    Check if any of the config fields are empty
  */

  const isFieldEmpty = (field: string) => field.trim() === '';

  const AreAnyConfigFieldsEmpty = (config: ServerConfigs): boolean => {
    const sections: Array<ConfigSection> = [
      config.providers.github,
      config.providers.google,
      config.providers.microsoft,
      config.mailConfigs,
    ];

    return sections.some(
      (section) =>
        section.enabled && Object.values(section.fields).some(isFieldEmpty)
    );
  };

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
        fields: updatedConfigs?.mailConfigs.fields,
      },
    ];

    const transformedConfigs: UpdatedConfigs[] = [];

    updatedWorkingConfigs.forEach(({ config, enabled, fields }) => {
      config.forEach(({ name, key }) => {
        if (enabled && fields) {
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
      toast.error(t(errorMessage));
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
        status: updatedConfigs?.mailConfigs.enabled
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

  return {
    currentConfigs,
    workingConfigs,
    updateAuthProvider,
    updateDataSharingConfigs,
    updateInfraConfigs,
    resetInfraConfigs,
    fetchingInfraConfigs,
    fetchingAllowedAuthProviders,
    infraConfigsError,
    allowedAuthProvidersError,
    AreAnyConfigFieldsEmpty,
  };
}
