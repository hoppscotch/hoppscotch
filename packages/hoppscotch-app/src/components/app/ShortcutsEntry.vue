<template>
  <div class="flex items-center py-1">
    <span class="flex flex-1 mr-4">
      {{ t(shortcut.label) }}
    </span>
    <kbd
      v-for="(key, index) in shortcut.keys"
      :key="`key-${String(index)}`"
      class="shortcut-key"
    >
      {{ key }}
    </kbd>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"

const t = useI18n()

defineProps<{
  shortcut: {
    label: string
    keys: string[]
  }
}>()
</script>
