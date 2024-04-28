import { AnyVariables, UseMutationResponse } from '@urql/vue';
import { cloneDeep } from 'lodash-es';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from '~/composables/i18n';
import {
  AllowedAuthProvidersDocument,
  EnableAndDisableSsoArgs,
  EnableAndDisableSsoMutation,
  InfraConfigArgs,
  InfraConfigEnum,
  InfraConfigsDocument,
  ResetInfraConfigsMutation,
  ToggleAnalyticsCollectionMutation,
  UpdateInfraConfigsMutation,
} from '~/helpers/backend/graphql';
import {
  ALL_CONFIGS,
  ConfigObject,
  ConfigSection,
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

    const getFieldValue = (name: string) =>
      infraConfigs.value.find((x) => x.name === name)?.value ?? '';

    // Transforming the fetched data into a Configs object
    currentConfigs.value = {
      providers: {
        google: {
          name: 'google',
          enabled: allowedAuthProviders.value.includes('GOOGLE'),
          fields: {
            client_id: getFieldValue('GOOGLE_CLIENT_ID'),
            client_secret: getFieldValue('GOOGLE_CLIENT_SECRET'),
            callback_url: getFieldValue('GOOGLE_CALLBACK_URL'),
            scope: getFieldValue('GOOGLE_SCOPE'),
          },
        },
        github: {
          name: 'github',
          enabled: allowedAuthProviders.value.includes('GITHUB'),
          fields: {
            client_id: getFieldValue('GITHUB_CLIENT_ID'),
            client_secret: getFieldValue('GITHUB_CLIENT_SECRET'),
            callback_url: getFieldValue('GITHUB_CALLBACK_URL'),
            scope: getFieldValue('GITHUB_SCOPE'),
          },
        },
        microsoft: {
          name: 'microsoft',
          enabled: allowedAuthProviders.value.includes('MICROSOFT'),
          fields: {
            client_id: getFieldValue('MICROSOFT_CLIENT_ID'),
            client_secret: getFieldValue('MICROSOFT_CLIENT_SECRET'),
            callback_url: getFieldValue('MICROSOFT_CALLBACK_URL'),
            scope: getFieldValue('MICROSOFT_SCOPE'),
            tenant: getFieldValue('MICROSOFT_TENANT'),
          },
        },
      },
      mailConfigs: {
        name: 'email',
        enabled: allowedAuthProviders.value.includes('EMAIL'),
        fields: {
          mailer_smtp_url: getFieldValue('MAILER_SMTP_URL'),
          mailer_from_address: getFieldValue('MAILER_ADDRESS_FROM'),
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
    Checking if any of the config fields are empty
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

  /**
   * The updated configs are transformed into a format that can be used by the mutations
   */

  const toBeTransformedConfigs: ConfigObject[] = [
    {
      config: GOOGLE_CONFIGS,
      enabled: updatedConfigs?.providers.google.enabled,
      field: updatedConfigs?.providers.google.fields,
    },
    {
      config: GITHUB_CONFIGS,
      enabled: updatedConfigs?.providers.github.enabled,
      field: updatedConfigs?.providers.github.fields,
    },
    {
      config: MICROSOFT_CONFIGS,
      enabled: updatedConfigs?.providers.microsoft.enabled,
      field: updatedConfigs?.providers.microsoft.fields,
    },
    {
      config: MAIL_CONFIGS,
      enabled: updatedConfigs?.mailConfigs.enabled,
      field: updatedConfigs?.mailConfigs.fields,
    },
  ];

  // Push or filter the configs based on the enabled condition
  const transformInfraConfigs = (workingConfigs: ConfigObject[]) => {
    let newConfigs: UpdatedConfigs[] = [];

    workingConfigs.forEach(({ config, enabled, field }) => {
      config.forEach(({ name, key }) => {
        if (enabled && field) {
          const value = typeof field === 'string' ? field : String(field[key]);
          newConfigs.push({ name, value });
        } else {
          newConfigs = newConfigs.filter((item) => item.name !== name);
        }
      });
    });
    newConfigs = newConfigs.filter((item) => item.name !== '');
    return newConfigs;
  };

  // Transforming the working configs back into the format required by the mutations
  const updatedInfraConfigs = computed(() =>
    updatedConfigs ? transformInfraConfigs(toBeTransformedConfigs) : []
  );

  // Updated allowed auth providers
  const updatedAllowedAuthProviders = [
    {
      provider: 'GOOGLE',
      status: updatedConfigs?.providers.google.enabled ? 'ENABLE' : 'DISABLE',
    },
    {
      provider: 'MICROSOFT',
      status: updatedConfigs?.providers.microsoft.enabled
        ? 'ENABLE'
        : 'DISABLE',
    },
    {
      provider: 'GITHUB',
      status: updatedConfigs?.providers.github.enabled ? 'ENABLE' : 'DISABLE',
    },
    {
      provider: 'EMAIL',
      status: updatedConfigs?.mailConfigs.enabled ? 'ENABLE' : 'DISABLE',
    },
  ];

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
  ) =>
    executeMutation(
      updateProviderStatus,
      {
        providerInfo: updatedAllowedAuthProviders as EnableAndDisableSsoArgs[],
      },
      'configs.auth_providers.update_failure'
    );

  // Updating the infra configurations
  const updateInfraConfigs = (
    updateInfraConfigsMutation: UseMutationResponse<UpdateInfraConfigsMutation>
  ) =>
    executeMutation(
      updateInfraConfigsMutation,
      {
        infraConfigs: updatedInfraConfigs.value as InfraConfigArgs[],
      },
      'configs.update_failure'
    );

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
          ? 'ENABLE'
          : 'DISABLE',
      },
      'configs.data_sharing.update_failure'
    );

  return {
    currentConfigs,
    workingConfigs,
    updatedInfraConfigs,
    updatedAllowedAuthProviders,
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
