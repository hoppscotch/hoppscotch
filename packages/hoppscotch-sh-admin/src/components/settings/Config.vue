<template>
  <div>
    <SettingsAuthProvider v-model:config="workingInfraConfigs" />
    <SettingsSmtp />
    <SettingsReset />
  </div>
</template>

<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import { Configs } from '~/composables/useAuthProviders';

const props = defineProps<{
  config: Configs;
}>();

const emit = defineEmits<{
  (e: 'update:config', v: Configs): void;
}>();

const workingInfraConfigs = useVModel(props, 'config', emit);
</script>
