<template>
  <div>
    <SettingsAuthProvider v-model:config="workingConfigs" />
    <SettingsSmtpConfiguration v-model:config="workingConfigs" />
    <SettingsDataSharing v-model:config="workingConfigs" />
    <SettingsReset />
  </div>
</template>

<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import { Config } from '~/composables/useConfigHandler';

const props = defineProps<{
  config: Config;
}>();

const emit = defineEmits<{
  (e: 'update:config', v: Config): void;
}>();

const workingConfigs = useVModel(props, 'config', emit);
</script>
