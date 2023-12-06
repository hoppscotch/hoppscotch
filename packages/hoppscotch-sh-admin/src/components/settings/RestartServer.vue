<template>
  <HoppSmartModal :dimissible="false" title="Server Restart">
    <template #body>
      Server is restarting in {{ count }} seconds. Please wait...
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useToast } from '~/composables/toast';
import { useI18n } from '~/composables/i18n';
import { Configs, getConfig } from '~/composables/getConfig';
import {
  EnableAndDisableSsoDocument,
  EnableAndDisableSsoArgs,
  UpdateInfraConfigsDocument,
  InfraConfigArgs,
} from '~/helpers/backend/graphql';
import { useMutation } from '@urql/vue';

const t = useI18n();
const toast = useToast();

const count = ref(8);

const props = withDefaults(
  defineProps<{
    loadingState: boolean;
    config: Configs;
  }>(),
  {
    show: false,
    loadingState: false,
  }
);

const {
  transformedInfraConfigs: infraConfigs,
  transformedAuthProviders: authProviders,
} = getConfig(props.config);

const updateProviderStatus = useMutation(EnableAndDisableSsoDocument);

const updateAuthProvider = async () => {
  const variables = {
    data: authProviders.value as EnableAndDisableSsoArgs[],
  };
  await updateProviderStatus.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error('Unable to update provider status');
    } else {
      toast.success('Provider status updated successfully');
    }
  });
};

const updateInfraConfigsMutation = useMutation(UpdateInfraConfigsDocument);

const updateInfraConfigs = async () => {
  const variables = {
    infraConfigs: infraConfigs.value as InfraConfigArgs[],
  };
  await updateInfraConfigsMutation.executeMutation(variables).then((result) => {
    if (result.error) {
      toast.error('Unable to update provider status');
    } else {
      toast.success('Provider status updated successfully');
    }
  });
};

onMounted(async () => {
  if (authProviders.value) {
    await updateAuthProvider();
  }
  if (infraConfigs.value) {
    await updateInfraConfigs();
  }
  const timer = setInterval(() => {
    count.value--;
    if (count.value === 0) {
      clearInterval(timer);
      toast.success(`${t('settings.server_restarted')}`);
      window.location.reload();
    }
  }, 1000);
});
</script>
