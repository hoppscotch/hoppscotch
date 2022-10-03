<template>
  <button
    class="flex items-center flex-1 px-6 py-3 font-medium cursor-pointer transition search-entry focus:outline-none"
    :class="{ active: active }"
    tabindex="-1"
    @click="emit('action', shortcut.action)"
    @keydown.enter="emit('action', shortcut.action)"
  >
    <component
      :is="shortcut.icon"
      class="mr-4 opacity-50 transition svg-icons"
      :class="{ 'opacity-100 text-secondaryDark': active }"
    />
    <span
      class="flex flex-1 mr-4 transition"
      :class="{ 'text-secondaryDark': active }"
    >
      {{ t(shortcut.label) }}
    </span>
    <kbd
      v-for="(key, keyIndex) in shortcut.keys"
      :key="`key-${String(keyIndex)}`"
      class="shortcut-key"
    >
      {{ key }}
    </kbd>
  </button>
</template>

<script setup lang="ts">
import type { Component } from "vue"
import { useI18n } from "@composables/i18n"

const t = useI18n()

defineProps<{
  shortcut: {
    label: string
    keys: string[]
    action: string
    icon: object | Component
  }
  active: boolean
}>()

const emit = defineEmits<{
  (e: "action", action: string): void
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
    content: "";
  }

  &.active {
    @apply bg-primaryLight;

    &::after {
      @apply bg-accentLight;
    }
  }
}
</style>
