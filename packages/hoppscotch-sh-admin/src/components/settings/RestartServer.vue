<template>
  <HoppSmartModal v-if="show" :dimissible="false" title="Server Restart">
    <template #body>
      Server is restarting in {{ count }} seconds. Please wait...
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useToast } from '~/composables/toast';
import { useI18n } from '~/composables/i18n';
import { Configs } from '~/composables/getConfig';

const t = useI18n();

const toast = useToast();

const props = withDefaults(
  defineProps<{
    show: boolean;
    loadingState: boolean;
    config: Configs;
  }>(),
  {
    show: false,
    loadingState: false,
  }
);

const count = ref(8);

watch(
  () => props.show,
  (val) => {
    // create a timer of 8 seconds as soon as this modal is opened
    if (props.show) {
      const timer = setInterval(() => {
        count.value--;
        if (count.value === 0) {
          clearInterval(timer);
          toast.success(`${t('settings.server_restarted')}`);
          props.show = false;
          window.location.reload();
        }
      }, 1000);
    }
  }
);

const infraConfigs = computed(() => {
  return [
    {
      name: 'GOOGLE_CLIENT_ID',
      value: props.config.google.client_id,
    },
    {
      name: 'GOOGLE_CLIENT_SECRET',
      value: props.config.google.client_secret,
    },
    {
      name: 'MICROSOFT_CLIENT_ID',
      value: props.config.microsoft.client_id,
    },
    {
      name: 'MICROSOFT_CLIENT_SECRET',
      value: props.config.microsoft.client_secret,
    },
    {
      name: 'GITHUB_CLIENT_ID',
      value: props.config.github.client_id,
    },
    {
      name: 'GITHUB_CLIENT_SECRET',
      value: props.config.github.client_secret,
    },
  ];
});

const authProviders = computed(() => {
  const providers = [];
  if (props.config.google.enabled) {
    providers.push('GOOGLE');
  }
  if (props.config.microsoft.enabled) {
    providers.push('MICROSOFT');
  }
  if (props.config.github.enabled) {
    providers.push('GITHUB');
  }
  return providers;
});

const emit = defineEmits<{
  (event: 'hide-modal'): void;
  (event: 'send-invite', email: string): void;
}>();

const hideModal = () => {
  emit('hide-modal');
};
</script>
