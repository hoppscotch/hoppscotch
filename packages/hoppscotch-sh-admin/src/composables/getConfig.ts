import { useClientHandler } from './useClientHandler';
import { ref, onMounted } from 'vue';
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

export function getConfig() {
  const {
    fetching: fetchingInfraConfigs,
    error: errorInfraConfigs,
    list: workingInfraConfigs,
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
    list: workingAllowedAuthProviders,
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
        enabled: workingAllowedAuthProviders.value.includes('GOOGLE'),
        client_id:
          workingInfraConfigs.value.find((x) => x.name === 'GOOGLE_CLIENT_ID')
            ?.value ?? '',
        client_secret:
          workingInfraConfigs.value.find(
            (x) => x.name === 'GOOGLE_CLIENT_SECRET'
          )?.value ?? '',
        mask_client_id: true,
        mask_client_secret: true,
      },
      github: {
        name: 'Github',
        enabled: workingAllowedAuthProviders.value.includes('GITHUB'),
        client_id:
          workingInfraConfigs.value.find((x) => x.name === 'GITHUB_CLIENT_ID')
            ?.value ?? '',
        client_secret:
          workingInfraConfigs.value.find(
            (x) => x.name === 'GITHUB_CLIENT_SECRET'
          )?.value ?? '',
        mask_client_id: true,
        mask_client_secret: true,
      },
      microsoft: {
        name: 'Microsoft',
        enabled: workingAllowedAuthProviders.value.includes('MICROSOFT'),
        client_id:
          workingInfraConfigs.value.find(
            (x) => x.name === 'MICROSOFT_CLIENT_ID'
          )?.value ?? '',
        client_secret:
          workingInfraConfigs.value.find(
            (x) => x.name === 'MICROSOFT_CLIENT_SECRET'
          )?.value ?? '',
        mask_client_id: true,
        mask_client_secret: true,
      },
    };

    workingConfigs.value = cloneDeep(currentConfigs.value);
  });

  return {
    fetchingInfraConfigs,
    errorInfraConfigs,
    fetchingAllowedAuthProviders,
    errorAllowedAuthProviders,
    currentConfigs,
    workingConfigs,
  };
}
