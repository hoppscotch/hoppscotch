<template>
  <div>
    <SettingsAuthProvider v-model:config="workingConfigs" />
    <SettingsSmtp />
    <SettingsReset />
  </div>
</template>

<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import { Configs } from '~/composables/useConfigHandler';

const props = defineProps<{
  config: Configs;
}>();

const emit = defineEmits<{
  (e: 'update:config', v: Configs): void;
}>();

const workingConfigs = useVModel(props, 'config', emit);
</script>
