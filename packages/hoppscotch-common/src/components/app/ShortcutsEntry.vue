<template>
  <div class="flex items-center py-1">
    <span class="mr-4 flex flex-1">
      {{ shortcut.label }}
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
import { ShortcutDef } from "~/helpers/shortcuts"

defineProps<{
  shortcut: ShortcutDef
}>()
</script>
