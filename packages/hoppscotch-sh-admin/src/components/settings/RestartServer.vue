<template>
  <HoppSmartModal :dimissible="false" title="Server Restart">
    <template #body>
      {{ t('configs.restart.description', { count: count }) }}
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useToast } from '~/composables/toast';
import { useI18n } from '~/composables/i18n';
import { Configs, useConfigHandler } from '~/composables/useConfigHandler';
import {
  EnableAndDisableSsoDocument,
  UpdateInfraConfigsDocument,
  ResetInfraConfigsDocument,
} from '~/helpers/backend/graphql';
import { useMutation } from '@urql/vue';

const t = useI18n();
const toast = useToast();

const count = ref(8);

const props = withDefaults(
  defineProps<{
    loadingState: boolean;
    workingConfigs?: Configs;
    reset?: boolean;
  }>(),
  {
    loadingState: false,
    reset: false,
  }
);

const updateInfraConfigsMutation = useMutation(UpdateInfraConfigsDocument);
const updateAllowedAuthProviderMutation = useMutation(
  EnableAndDisableSsoDocument
);
const resetInfraConfigsMutation = useMutation(ResetInfraConfigsDocument);

const { updateInfraConfigs, updateAuthProvider, resetInfraConfigs } =
  useConfigHandler(props.workingConfigs);

onMounted(async () => {
  if (props.reset) {
    await resetInfraConfigs(resetInfraConfigsMutation);
  } else {
    await updateAuthProvider(updateAllowedAuthProviderMutation);
    await updateInfraConfigs(updateInfraConfigsMutation);
  }
  const timer = setInterval(() => {
    count.value--;
    if (count.value === 0) {
      clearInterval(timer);
      toast.success(t('configs.restart.initiate'));
      window.location.reload();
    }
  }, 1000);
});
</script>
