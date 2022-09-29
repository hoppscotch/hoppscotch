<template>
  <span class="chip">
    <component :is="IconFile" class="opacity-75 svg-icons" />
    <span class="px-2 truncate max-w-32"><slot></slot></span>
  </span>
</template>

<script setup lang="ts">
import IconFile from "~icons/lucide/file"
</script>

<style lang="scss" scoped>
.chip {
  @apply inline-flex;
  @apply items-center;
  @apply justify-center;
  @apply rounded;
  @apply pl-2;
  @apply pr-0.5;
  @apply bg-primaryDark;
}
</style>
