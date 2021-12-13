<template>
  <div class="flex items-center">
    <span class="flex flex-1 mr-4">
      {{ t(shortcut.label) }}
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
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()

defineProps<{
  shortcut: Object
}>()
</script>
