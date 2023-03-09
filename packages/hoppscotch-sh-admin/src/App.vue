<template>
  <component :is="layout">
    <router-view />
  </component>
</template>

<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { HOPP_MODULES } from './modules';

const defaultLayout = 'default';

const { currentRoute } = useRouter();

const layout = computed(
  () => `${currentRoute.value.meta.layout || defaultLayout}-layout`
);

const isDark = useDark();
useToggle(isDark);

// Run module root component setup code
HOPP_MODULES.forEach((mod) => mod.onRootSetup?.());
</script>

<style lang="scss">
html.dark {
  color-scheme: dark;
}
</style>
