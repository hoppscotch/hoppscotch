import { useClientHandler } from './useClientHandler';
import { ref, onMounted, computed } from 'vue';
import {
  InfraConfigEnum,
  InfraConfigsDocument,
  AllowedAuthProvidersDocument,
} from '~/helpers/backend/graphql';
import { cloneDeep } from 'lodash-es';

export type Configs = {
  google: {
    name: string;
    enabled: boolean;
    client_id: string;
    client_secret: string;
    mask_client_id: boolean;
    mask_client_secret: boolean;
  };
  github: {
    name: string;
    enabled: boolean;
    client_id: string;
    client_secret: string;
    mask_client_id: boolean;
    mask_client_secret: boolean;
  };
  microsoft: {
    name: string;
    enabled: boolean;
    client_id: string;
    client_secret: string;
    mask_client_id: boolean;
    mask_client_secret: boolean;
  };
};

export function getConfig(usedConfigs?: Configs) {
  const {
    fetching: fetchingInfraConfigs,
    error: errorInfraConfigs,
    list: infraConfigs,
    fetchList: fetchInfraConfig,
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
    error: errorAllowedAuthProviders,
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
    await fetchInfraConfig();
    await fetchAllowedAuthProviders();

    currentConfigs.value = {
      google: {
        name: 'Google',
        enabled: allowedAuthProviders.value.includes('GOOGLE'),
        client_id:
          infraConfigs.value.find((x) => x.name === 'GOOGLE_CLIENT_ID')
            ?.value ?? '',
        client_secret:
          infraConfigs.value.find((x) => x.name === 'GOOGLE_CLIENT_SECRET')
            ?.value ?? '',
        mask_client_id: true,
        mask_client_secret: true,
      },
      github: {
        name: 'Github',
        enabled: allowedAuthProviders.value.includes('GITHUB'),
        client_id:
          infraConfigs.value.find((x) => x.name === 'GITHUB_CLIENT_ID')
            ?.value ?? '',
        client_secret:
          infraConfigs.value.find((x) => x.name === 'GITHUB_CLIENT_SECRET')
            ?.value ?? '',
        mask_client_id: true,
        mask_client_secret: true,
      },
      microsoft: {
        name: 'Microsoft',
        enabled: allowedAuthProviders.value.includes('MICROSOFT'),
        client_id:
          infraConfigs.value.find((x) => x.name === 'MICROSOFT_CLIENT_ID')
            ?.value ?? '',
        client_secret:
          infraConfigs.value.find((x) => x.name === 'MICROSOFT_CLIENT_SECRET')
            ?.value ?? '',
        mask_client_id: true,
        mask_client_secret: true,
      },
    };

    workingConfigs.value = cloneDeep(currentConfigs.value);
  });

  type MutationConfig = {
    name: string;
    value: string;
  };

  const transformedInfraConfigs = computed(() => {
    let config: MutationConfig[] = [
      {
        name: '',
        value: '',
      },
    ];

    if (usedConfigs?.google.enabled) {
      config.push(
        {
          name: 'GOOGLE_CLIENT_ID',
          value: usedConfigs?.google.client_id ?? '',
        },
        {
          name: 'GOOGLE_CLIENT_SECRET',
          value: usedConfigs?.google.client_secret ?? '',
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
    if (usedConfigs?.microsoft.enabled) {
      config.push(
        {
          name: 'MICROSOFT_CLIENT_ID',
          value: usedConfigs?.microsoft.client_id ?? '',
        },
        {
          name: 'MICROSOFT_CLIENT_SECRET',
          value: usedConfigs?.microsoft.client_secret ?? '',
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

    if (usedConfigs?.github.enabled) {
      config.push(
        {
          name: 'GITHUB_CLIENT_ID',
          value: usedConfigs?.github.client_id ?? '',
        },
        {
          name: 'GITHUB_CLIENT_SECRET',
          value: usedConfigs?.github.client_secret ?? '',
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

  const transformedAuthProviders = computed(() => {
    return [
      {
        provider: 'GOOGLE',
        status: usedConfigs?.google.enabled ? 'ENABLE' : 'DISABLE',
      },
      {
        provider: 'MICROSOFT',
        status: usedConfigs?.microsoft.enabled ? 'ENABLE' : 'DISABLE',
      },
      {
        provider: 'GITHUB',
        status: usedConfigs?.github.enabled ? 'ENABLE' : 'DISABLE',
      },
    ];
  });

  return {
    fetchingInfraConfigs,
    errorInfraConfigs,
    fetchingAllowedAuthProviders,
    errorAllowedAuthProviders,
    currentConfigs,
    workingConfigs,
    transformedAuthProviders,
    transformedInfraConfigs,
  };
}
