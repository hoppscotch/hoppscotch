import { ref, watch, onMounted, Ref, toRef } from 'vue';
import {
  InfraConfigsQuery,
  AllowedAuthProvidersQuery,
} from '~/helpers/backend/graphql';

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

export function useAuthProviders(
  workingInfraConfigs: Ref<InfraConfigsQuery['infraConfigs']>,
  workingAllowedAuthProviders: Ref<
    AllowedAuthProvidersQuery['allowedAuthProviders']
  >
) {
  const google = ref({
    name: 'Google',
    enabled: false,
    client_id: '',
    secret_id: '',
    mask_client_id: true,
    mask_secret_id: true,
  });

  const github = ref({
    name: 'Github',
    enabled: false,
    client_id: '',
    secret_id: '',
    mask_client_id: true,
    mask_secret_id: true,
  });

  const microsoft = ref({
    name: 'Microsoft',
    enabled: false,
    client_id: '',
    secret_id: '',
    mask_client_id: true,
    mask_secret_id: true,
  });

  const authProviders = ref({
    google,
    microsoft,
    github,
  });

  onMounted(() => {
    google.value.enabled = workingAllowedAuthProviders.value.includes('GOOGLE');
    google.value.client_id =
      workingInfraConfigs.value.find(
        (config) => config.name === 'GOOGLE_CLIENT_ID'
      )?.value ?? '';
    google.value.secret_id =
      workingInfraConfigs.value.find(
        (config) => config.name === 'GOOGLE_CLIENT_SECRET'
      )?.value ?? '';

    microsoft.value.enabled =
      workingAllowedAuthProviders.value.includes('MICROSOFT');
    microsoft.value.client_id =
      workingInfraConfigs.value.find(
        (config) => config.name === 'MICROSOFT_CLIENT_ID'
      )?.value ?? '';
    microsoft.value.secret_id =
      workingInfraConfigs.value.find(
        (config) => config.name === 'MICROSOFT_CLIENT_SECRET'
      )?.value ?? '';

    github.value.enabled = workingAllowedAuthProviders.value.includes('GITHUB');
    github.value.client_id =
      workingInfraConfigs.value.find(
        (config) => config.name === 'GITHUB_CLIENT_ID'
      )?.value ?? '';
    github.value.secret_id =
      workingInfraConfigs.value.find(
        (config) => config.name === 'GITHUB_CLIENT_SECRET'
      )?.value ?? '';
  });

  watch(google.value, (google) => {
    console.log('Before watch operation', workingAllowedAuthProviders.value);
    if (google.enabled) {
      if (!workingAllowedAuthProviders.value.includes('GOOGLE')) {
        workingAllowedAuthProviders.value.push('GOOGLE');
      }
      workingInfraConfigs.value.find(
        (config) => config.name === 'GOOGLE_CLIENT_ID'
      )!.value = google.client_id;
      workingInfraConfigs.value.find(
        (config) => config.name === 'GOOGLE_CLIENT_SECRET'
      )!.value = google.secret_id;
    } else {
      console.log('Removing google from allowed auth providers');
      workingAllowedAuthProviders.value =
        workingAllowedAuthProviders.value.filter(
          (provider) => provider !== 'GOOGLE'
        );

      // workingAllowedAuthProviders.value = ['GITHUB', 'EMAIL'];
      console.log('Removed', workingAllowedAuthProviders.value);
    }
    console.log('After watch operation', workingAllowedAuthProviders.value);
  });

  watch(microsoft.value, (microsoft) => {
    if (microsoft.enabled) {
      if (!workingAllowedAuthProviders.value.includes('MICROSOFT')) {
        workingAllowedAuthProviders.value.push('MICROSOFT');
      }
      workingInfraConfigs.value.find(
        (config) => config.name === 'MICROSOFT_CLIENT_ID'
      )!.value = microsoft.client_id;
      workingInfraConfigs.value.find(
        (config) => config.name === 'MICROSOFT_CLIENT_SECRET'
      )!.value = microsoft.secret_id;
    } else {
      workingAllowedAuthProviders = toRef(
        workingAllowedAuthProviders.value.filter(
          (provider) => provider !== 'MICROSOFT'
        )
      );
    }
  });

  watch(github.value, (github) => {
    if (github.enabled) {
      if (!workingAllowedAuthProviders.value.includes('GITHUB')) {
        workingAllowedAuthProviders.value.push('GITHUB');
      }
      workingInfraConfigs.value.find(
        (config) => config.name === 'GITHUB_CLIENT_ID'
      )!.value = github.client_id;
      workingInfraConfigs.value.find(
        (config) => config.name === 'GITHUB_CLIENT_SECRET'
      )!.value = github.secret_id;
    } else {
      workingAllowedAuthProviders.value =
        workingAllowedAuthProviders.value.filter(
          (provider) => provider !== 'GITHUB'
        );
    }
  });

  return {
    google,
    github,
    microsoft,
    authProviders,
  };
}
