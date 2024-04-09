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
import { useToast } from './toast';
import { useClientHandler } from './useClientHandler';

import {
  Config,
  UpdatedConfigs,
  IndividualConfig,
  GOOGLE_CONFIGS,
  MICROSOFT_CONFIGS,
  GITHUB_CONFIGS,
  MAIL_CONFIGS,
  ALL_CONFIGS,
} from '~/helpers/configs';

/** Composable that handles all operations related to server configurations
 * @param updatedConfigs A Config Object contatining the updated configs
 */
export function useConfigHandler(updatedConfigs?: Config) {
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
  const currentConfigs = ref<Config>();
  const workingConfigs = ref<Config>();

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

  let individualConfigs: UpdatedConfigs[] = [
    {
      name: '',
      value: '',
    },
  ];

  const pushOrFilterConfigs = (
    configObject: IndividualConfig[],
    configEnabledCondition: boolean,
    configFields?: Record<string, string>
  ) => {
    if (configEnabledCondition && configFields) {
      configObject.forEach(({ name, key }) => {
        individualConfigs.push({
          name,
          value: configFields[key] ?? '',
        });
      });
    } else {
      configObject.forEach(({ name }) => {
        individualConfigs = individualConfigs.filter((item) => item.name !== name);
      });
    }
  };

  // Transforming the working configs back into the format required by the mutations
  const updatedInfraConfigs = computed(() => {
    pushOrFilterConfigs(
      GOOGLE_CONFIGS,
      !!updatedConfigs?.providers.google.enabled,
      updatedConfigs?.providers.google.fields
    );

    pushOrFilterConfigs(
      MICROSOFT_CONFIGS,
      !!updatedConfigs?.providers.microsoft.enabled,
      updatedConfigs?.providers.microsoft.fields
    );

    pushOrFilterConfigs(
      GITHUB_CONFIGS,
      !!updatedConfigs?.providers.github.enabled,
      updatedConfigs?.providers.github.fields
    );

    pushOrFilterConfigs(
      MAIL_CONFIGS,
      !!updatedConfigs?.mailConfigs.enabled,
      updatedConfigs?.mailConfigs.fields
    );

    return individualConfigs;
  });

  // Checking if any of the config fields are empty
  const isFieldEmpty = (field: string) => field.trim() === '';

  type ConfigSection = {
    enabled: boolean;
    fields: Record<string, string>;
  };

  const AreAnyConfigFieldsEmpty = (config: Config): boolean => {
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
  const updatedAllowedAuthProviders = computed(() => {
    return [
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
  });

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
        providerInfo:
          updatedAllowedAuthProviders.value as EnableAndDisableSsoArgs[],
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
      'configs.mail_configs.update_failure'
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

  // Updating the data sharing configurations
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
