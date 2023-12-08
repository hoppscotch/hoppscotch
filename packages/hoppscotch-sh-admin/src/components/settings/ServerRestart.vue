<template>
  <HoppSmartModal :dimissible="false" :title="t('configs.restart.title')">
    <template #body>
      <div class="text-center">
        {{ t('configs.restart.description', { duration }) }}
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMutation } from '@urql/vue';
import { useToast } from '~/composables/toast';
import { useI18n } from '~/composables/i18n';
import { useConfigHandler, Config } from '~/composables/useConfigHandler';
import {
  EnableAndDisableSsoDocument,
  UpdateInfraConfigsDocument,
  ResetInfraConfigsDocument,
} from '~/helpers/backend/graphql';

const t = useI18n();
const toast = useToast();

const props = withDefaults(
  defineProps<{
    loadingState: boolean;
    workingConfigs?: Config;
    reset?: boolean;
  }>(),
  {
    loadingState: false,
    reset: false,
  }
);

// Mutations to update or reset server configurations
const resetInfraConfigsMutation = useMutation(ResetInfraConfigsDocument);
const updateInfraConfigsMutation = useMutation(UpdateInfraConfigsDocument);
const updateAllowedAuthProviderMutation = useMutation(
  EnableAndDisableSsoDocument
);

// Mutation handlers`
const { updateInfraConfigs, updateAuthProvider, resetInfraConfigs } =
  useConfigHandler(props.workingConfigs);

// Call relevant mutations on component mount and initiate server restart
const duration = ref(30);

onMounted(async () => {
  if (props.reset) {
    await resetInfraConfigs(resetInfraConfigsMutation);
  } else {
    await updateAuthProvider(updateAllowedAuthProviderMutation);
    await updateInfraConfigs(updateInfraConfigsMutation);
  }
  const timer = setInterval(() => {
    duration.value--;
    if (duration.value === 0) {
      clearInterval(timer);
      toast.success(t('configs.restart.initiate'));
      window.location.reload();
    }
  }, 1000);
});
</script>
