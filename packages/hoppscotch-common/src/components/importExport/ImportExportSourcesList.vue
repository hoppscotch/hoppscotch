<template>
  <div class="flex flex-col space-y-2">
    <HoppSmartItem
      v-for="source in sources"
      :key="source.id"
      :icon="source.icon"
      :label="t(`${source.name}`)"
      @click="emit('import-source-selected', source.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { Component } from "vue"

const t = useI18n()

type ListItemMeta = {
  id: string
  name: string
  icon: Component
  title?: string
}

defineProps<{
  sources: ListItemMeta[]
}>()

const emit = defineEmits<{
  (e: "import-source-selected", sourceID: string): void
}>()
</script>
