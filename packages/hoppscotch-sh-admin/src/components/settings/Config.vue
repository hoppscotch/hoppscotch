<template>
  <div>
    <SettingsAuthProvider v-model:config="infraConfigs" />
    <SettingsSmtp />
    <SettingsReset />
  </div>
</template>

<script setup lang="ts">
import { useVModel } from '@vueuse/core';
import { Configs } from '~/composables/getConfig';

const props = defineProps<{
  config: Configs;
}>();

const emit = defineEmits<{
  (e: 'update:config', v: Configs): void;
}>();

const infraConfigs = useVModel(props, 'config', emit);
</script>
