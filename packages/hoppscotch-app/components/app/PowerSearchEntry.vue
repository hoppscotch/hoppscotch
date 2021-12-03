<template>
  <button
    class="cursor-pointer flex flex-1 py-2 px-6 transition items-center search-entry focus:outline-none"
    :class="{ active: active }"
    tabindex="-1"
    @click="$emit('action', shortcut.action)"
    @keydown.enter="$emit('action', shortcut.action)"
  >
    <SmartIcon
      class="mr-4 opacity-50 transition svg-icons"
      :class="{ 'opacity-100 text-secondaryDark': active }"
      :name="shortcut.icon"
    />
    <span
      class="flex font-medium flex-1 mr-4 transition"
      :class="{ 'text-secondaryDark': active }"
    >
      {{ t(shortcut.label) }}
    </span>
    <span
      v-for="(key, keyIndex) in shortcut.keys"
      :key="`key-${String(keyIndex)}`"
      class="shortcut-key"
    >
      {{ key }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()

defineProps<{
  shortcut: Object
  active: Boolean
}>()
</script>

<style lang="scss" scoped>
.search-entry {
  @apply relative;

  &::after {
    @apply absolute;
    @apply top-0;
    @apply left-0;
    @apply bottom-0;
    @apply bg-transparent;
    @apply z-2;
    @apply w-0.5;
    @apply transition;

    content: "";
  }

  &.active {
    @apply outline-none;
    @apply bg-primaryLight;

    &::after {
      @apply bg-accentLight;
    }
  }
}

.shortcut-key {
  @apply bg-dividerLight;
  @apply rounded;
  @apply ml-2;
  @apply py-1;
  @apply px-2;
  @apply inline-flex;
}
</style>
