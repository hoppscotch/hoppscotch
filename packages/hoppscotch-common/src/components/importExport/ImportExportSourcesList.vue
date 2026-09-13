<template>
  <div class="flex flex-col space-y-2">
    <div
      v-for="source in sources"
      :key="source.id"
      class="relative flex items-center"
    >
      <HoppSmartItem
        class="flex-1"
        :icon="source.icon"
        :label="t(`${source.name}`)"
        @click="emit('import-source-selected', source.id)"
      />
      <span
        v-if="lastUsedSourceId && source.id === lastUsedSourceId"
        class="absolute right-3 px-1.5 py-0.5 text-tiny font-medium rounded bg-accentDark/10 text-accent pointer-events-none"
      >
        {{ t("collection.last_used") }}
      </span>
    </div>
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
  lastUsedSourceId?: string
}>()

const emit = defineEmits<{
  (e: "import-source-selected", sourceID: string): void
}>()
</script>
