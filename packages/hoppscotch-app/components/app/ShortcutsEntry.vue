<template>
  <div class="flex items-center">
    <span class="flex flex-1 mr-4">
      {{ $t(shortcut.label) }}
    </span>
    <span
      v-for="(key, index) in shortcut.keys"
      :key="`key-${String(index)}`"
      class="shortcut-key"
    >
      {{ key }}
    </span>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  shortcut: Object
}>()
</script>

<style lang="scss" scoped>
.shortcut-key {
  @apply bg-dividerLight;
  @apply rounded;
  @apply ml-2;
  @apply py-1;
  @apply px-2;
  @apply inline-flex;
}
</style>
