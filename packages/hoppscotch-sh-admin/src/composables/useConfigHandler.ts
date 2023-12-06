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

const toast = useToast();

export type AuthProviders = 'google' | 'microsoft' | 'github';

export type Configs = {
  google: {
    name: AuthProviders;
    enabled: boolean;
    client_id: string;
    client_secret: string;
  };
  github: {
    name: AuthProviders;
    enabled: boolean;
    client_id: string;
    client_secret: string;
  };
  microsoft: {
    name: AuthProviders;
    enabled: boolean;
    client_id: string;
    client_secret: string;
  };
};

type UpdatedConfigs = {
  name: string;
  value: string;
};

export function useConfigHandler(updatedConfigs?: Configs) {
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
      google: {
        name: 'google',
        enabled: allowedAuthProviders.value.includes('GOOGLE'),
        client_id:
          infraConfigs.value.find((x) => x.name === 'GOOGLE_CLIENT_ID')
            ?.value ?? '',
        client_secret:
          infraConfigs.value.find((x) => x.name === 'GOOGLE_CLIENT_SECRET')
            ?.value ?? '',
      },
      github: {
        name: 'github',
        enabled: allowedAuthProviders.value.includes('GITHUB'),
        client_id:
          infraConfigs.value.find((x) => x.name === 'GITHUB_CLIENT_ID')
            ?.value ?? '',
        client_secret:
          infraConfigs.value.find((x) => x.name === 'GITHUB_CLIENT_SECRET')
            ?.value ?? '',
      },
      microsoft: {
        name: 'microsoft',
        enabled: allowedAuthProviders.value.includes('MICROSOFT'),
        client_id:
          infraConfigs.value.find((x) => x.name === 'MICROSOFT_CLIENT_ID')
            ?.value ?? '',
        client_secret:
          infraConfigs.value.find((x) => x.name === 'MICROSOFT_CLIENT_SECRET')
            ?.value ?? '',
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

    if (updatedConfigs?.google.enabled) {
      config.push(
        {
          name: 'GOOGLE_CLIENT_ID',
          value: updatedConfigs?.google.client_id ?? '',
        },
        {
          name: 'GOOGLE_CLIENT_SECRET',
          value: updatedConfigs?.google.client_secret ?? '',
        }
      );
    } else {
      config = config.filter((item) => {
        return (
          item.name !== 'GOOGLE_CLIENT_ID' &&
          item.name !== 'GOOGLE_CLIENT_SECRET'
        );
      });
    }
    if (updatedConfigs?.microsoft.enabled) {
      config.push(
        {
          name: 'MICROSOFT_CLIENT_ID',
          value: updatedConfigs?.microsoft.client_id ?? '',
        },
        {
          name: 'MICROSOFT_CLIENT_SECRET',
          value: updatedConfigs?.microsoft.client_secret ?? '',
        }
      );
    } else {
      config = config.filter((item) => {
        return (
          item.name !== 'MICROSOFT_CLIENT_ID' &&
          item.name !== 'MICROSOFT_CLIENT_SECRET'
        );
      });
    }

    if (updatedConfigs?.github.enabled) {
      config.push(
        {
          name: 'GITHUB_CLIENT_ID',
          value: updatedConfigs?.github.client_id ?? '',
        },
        {
          name: 'GITHUB_CLIENT_SECRET',
          value: updatedConfigs?.github.client_secret ?? '',
        }
      );
    } else {
      config = config.filter((item) => {
        return (
          item.name !== 'GITHUB_CLIENT_ID' &&
          item.name !== 'GITHUB_CLIENT_SECRET'
        );
      });
    }

    config = config.filter((item) => {
      return item.name !== '';
    });

    return config;
  });

  const updatedAllowedAuthProviders = computed(() => {
    return [
      {
        provider: 'GOOGLE',
        status: updatedConfigs?.google.enabled ? 'ENABLE' : 'DISABLE',
      },
      {
        provider: 'MICROSOFT',
        status: updatedConfigs?.microsoft.enabled ? 'ENABLE' : 'DISABLE',
      },
      {
        provider: 'GITHUB',
        status: updatedConfigs?.github.enabled ? 'ENABLE' : 'DISABLE',
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
      toast.error('Unable to update provider status');
    } else {
      toast.success('Provider status updated successfully');
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
      toast.error('Unable to update provider status');
    } else {
      toast.success('Provider status updated successfully');
    }
  };

  const resetInfraConfigs = async (
    resetInfraConfigsMutation: UseMutationResponse<ResetInfraConfigsMutation>
  ) => {
    const result = await resetInfraConfigsMutation.executeMutation();

    if (result.error) {
      toast.error('Unable to update provider status');
    } else {
      toast.success('Provider status updated successfully');
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
