import { useClientHandler } from './useClientHandler';
import { ref, onMounted, computed } from 'vue';
import {
  InfraConfigEnum,
  InfraConfigsDocument,
  AllowedAuthProvidersDocument,
  EnableAndDisableSsoMutation,
  UpdateInfraConfigsMutation,
  ResetInfraConfigsMutation,
} from '~/helpers/backend/graphql';
import { cloneDeep } from 'lodash-es';
import { useToast } from './toast';
import {
  EnableAndDisableSsoArgs,
  InfraConfigArgs,
} from '~/helpers/backend/graphql';
import { UseMutationResponse } from '@urql/vue';
import { useI18n } from '~/composables/i18n';

const toast = useToast();

export type SsoAuthProviders = 'google' | 'microsoft' | 'github';

export type Configs = {
  providers: {
    google: {
      name: SsoAuthProviders;
      enabled: boolean;
      fields: {
        client_id: string;
        client_secret: string;
      };
    };
    github: {
      name: SsoAuthProviders;
      enabled: boolean;
      fields: {
        client_id: string;
        client_secret: string;
      };
    };
    microsoft: {
      name: SsoAuthProviders;
      enabled: boolean;
      fields: {
        client_id: string;
        client_secret: string;
      };
    };
  };

  mailConfigs: {
    name: string;
    enabled: boolean;
    fields: {
      mailer_smtp_url: string;
      mailer_address_from: string;
    };
  };
};

type UpdatedConfigs = {
  name: string;
  value: string;
};

export function useConfigHandler(updatedConfigs?: Configs) {
  const t = useI18n();

  const {
    fetching: fetchingInfraConfigs,
    error: infraConfigsError,
    list: infraConfigs,
    fetchList: fetchInfraConfigs,
  } = useClientHandler(InfraConfigsDocument, (x) => x.infraConfigs, {
    names: [
      'GOOGLE_CLIENT_ID',
      'GOOGLE_CLIENT_SECRET',
      'MICROSOFT_CLIENT_ID',
      'MICROSOFT_CLIENT_SECRET',
      'GITHUB_CLIENT_ID',
      'GITHUB_CLIENT_SECRET',
      'MAILER_SMTP_URL',
      'MAILER_ADDRESS_FROM',
    ] as InfraConfigEnum[],
  });

  const {
    fetching: fetchingAllowedAuthProviders,
    error: allowedAuthProvidersError,
    list: allowedAuthProviders,
    fetchList: fetchAllowedAuthProviders,
  } = useClientHandler(
    AllowedAuthProvidersDocument,
    (x) => x.allowedAuthProviders,
    {}
  );

  const currentConfigs = ref<Configs>();
  const workingConfigs = ref<Configs>();

  onMounted(async () => {
    await fetchInfraConfigs();
    await fetchAllowedAuthProviders();

    currentConfigs.value = {
      providers: {
        google: {
          name: 'google',
          enabled: allowedAuthProviders.value.includes('GOOGLE'),
          fields: {
            client_id:
              infraConfigs.value.find((x) => x.name === 'GOOGLE_CLIENT_ID')
                ?.value ?? '',
            client_secret:
              infraConfigs.value.find((x) => x.name === 'GOOGLE_CLIENT_SECRET')
                ?.value ?? '',
          },
        },
        github: {
          name: 'github',
          enabled: allowedAuthProviders.value.includes('GITHUB'),
          fields: {
            client_id:
              infraConfigs.value.find((x) => x.name === 'GITHUB_CLIENT_ID')
                ?.value ?? '',
            client_secret:
              infraConfigs.value.find((x) => x.name === 'GITHUB_CLIENT_SECRET')
                ?.value ?? '',
          },
        },
        microsoft: {
          name: 'microsoft',
          enabled: allowedAuthProviders.value.includes('MICROSOFT'),
          fields: {
            client_id:
              infraConfigs.value.find((x) => x.name === 'MICROSOFT_CLIENT_ID')
                ?.value ?? '',
            client_secret:
              infraConfigs.value.find(
                (x) => x.name === 'MICROSOFT_CLIENT_SECRET'
              )?.value ?? '',
          },
        },
      },
      mailConfigs: {
        name: 'email',
        enabled: allowedAuthProviders.value.includes('EMAIL'),
        fields: {
          mailer_smtp_url:
            infraConfigs.value.find((x) => x.name === 'MAILER_SMTP_URL')
              ?.value ?? '',
          mailer_address_from:
            infraConfigs.value.find((x) => x.name === 'MAILER_ADDRESS_FROM')
              ?.value ?? '',
        },
      },
    };

    workingConfigs.value = cloneDeep(currentConfigs.value);
  });

  const updatedInfraConfigs = computed(() => {
    let config: UpdatedConfigs[] = [
      {
        name: '',
        value: '',
      },
    ];

    if (updatedConfigs?.providers.google.enabled) {
      config.push(
        {
          name: 'GOOGLE_CLIENT_ID',
          value: updatedConfigs?.providers.google.fields.client_id ?? '',
        },
        {
          name: 'GOOGLE_CLIENT_SECRET',
          value: updatedConfigs?.providers.google.fields.client_secret ?? '',
        }
      );
    } else {
      config = config.filter(
        (item) =>
          item.name !== 'GOOGLE_CLIENT_ID' &&
          item.name !== 'GOOGLE_CLIENT_SECRET'
      );
    }
    if (updatedConfigs?.providers.microsoft.enabled) {
      config.push(
        {
          name: 'MICROSOFT_CLIENT_ID',
          value: updatedConfigs?.providers.microsoft.fields.client_id ?? '',
        },
        {
          name: 'MICROSOFT_CLIENT_SECRET',
          value: updatedConfigs?.providers.microsoft.fields.client_secret ?? '',
        }
      );
    } else {
      config = config.filter(
        (item) =>
          item.name !== 'MICROSOFT_CLIENT_ID' &&
          item.name !== 'MICROSOFT_CLIENT_SECRET'
      );
    }

    if (updatedConfigs?.providers.github.enabled) {
      config.push(
        {
          name: 'GITHUB_CLIENT_ID',
          value: updatedConfigs?.providers.github.fields.client_id ?? '',
        },
        {
          name: 'GITHUB_CLIENT_SECRET',
          value: updatedConfigs?.providers.github.fields.client_secret ?? '',
        }
      );
    } else {
      config = config.filter(
        (item) =>
          item.name !== 'GITHUB_CLIENT_ID' &&
          item.name !== 'GITHUB_CLIENT_SECRET'
      );
    }

    if (updatedConfigs?.mailConfigs.enabled) {
      config.push(
        {
          name: 'MAILER_SMTP_URL',
          value: updatedConfigs?.mailConfigs.fields.mailer_smtp_url ?? '',
        },
        {
          name: 'MAILER_ADDRESS_FROM',
          value: updatedConfigs?.mailConfigs.fields.mailer_address_from ?? '',
        }
      );
    } else {
      config = config.filter(
        (item) =>
          item.name !== 'MAILER_SMTP_URL' && item.name !== 'MAILER_ADDRESS_FROM'
      );
    }

    config = config.filter((item) => item.name !== '');

    return config;
  });

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

  const updateAuthProvider = async (
    updateProviderStatus: UseMutationResponse<EnableAndDisableSsoMutation>
  ) => {
    const variables = {
      data: updatedAllowedAuthProviders.value as EnableAndDisableSsoArgs[],
    };

    const result = await updateProviderStatus.executeMutation(variables);

    if (result.error) {
      toast.error(t('configs.auth_providers.update_failure'));
    }
  };

  const updateInfraConfigs = async (
    updateInfraConfigsMutation: UseMutationResponse<UpdateInfraConfigsMutation>
  ) => {
    const variables = {
      infraConfigs: updatedInfraConfigs.value as InfraConfigArgs[],
    };

    const result = await updateInfraConfigsMutation.executeMutation(variables);

    if (result.error) {
      toast.error(t('configs.mail_configs.update_failure'));
    }
  };

  const resetInfraConfigs = async (
    resetInfraConfigsMutation: UseMutationResponse<ResetInfraConfigsMutation>
  ) => {
    const result = await resetInfraConfigsMutation.executeMutation();

    if (result.error) {
      toast.error(t('configs.reset.failure'));
    }
  };

  return {
    currentConfigs,
    workingConfigs,
    updatedInfraConfigs,
    updatedAllowedAuthProviders,
    updateAuthProvider,
    updateInfraConfigs,
    resetInfraConfigs,
    fetchingInfraConfigs,
    fetchingAllowedAuthProviders,
    infraConfigsError,
    allowedAuthProvidersError,
  };
}
