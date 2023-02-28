<template>
  <component :is="layout">
    <router-view />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useDark, useToggle } from '@vueuse/core';

const defaultLayout = 'default';

const { currentRoute } = useRouter();

const layout = computed(
  () => `${currentRoute.value.meta.layout || defaultLayout}-layout`
);

const isDark = useDark();
const toggleDark = useToggle(isDark);
</script>

<style lang="scss">
html.dark {
  color-scheme: dark;
}
</style>
