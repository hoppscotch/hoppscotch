<template>
  <button
    class="flex items-center flex-1 px-6 py-3 font-medium transition cursor-pointer search-entry focus:outline-none"
    :class="{ active: active }"
    tabindex="-1"
    @click="emit('action', shortcut.action)"
    @keydown.enter="emit('action', shortcut.action)"
  >
    <component
      :is="shortcut.icon"
      class="mr-4 transition opacity-50 svg-icons"
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
  @apply after:absolute;
  @apply after:top-0;
  @apply after:left-0;
  @apply after:bottom-0;
  @apply after:bg-transparent;
  @apply after:z-2;
  @apply after:w-0.5;
  @apply after:content-DEFAULT;

  &.active {
    @apply bg-primaryLight;
    @apply after:bg-accentLight;
  }
}
</style>
