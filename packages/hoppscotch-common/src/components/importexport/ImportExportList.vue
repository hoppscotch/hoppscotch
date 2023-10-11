<template>
  <div class="flex flex-col">
    <HoppSmartExpand>
      <template #body>
        <HoppSmartItem
          v-for="importer in importers"
          :key="importer.id"
          :icon="importer.icon"
          :label="t(`${importer.name}`)"
          @click="emit('importer-selected', importer.id)"
        />
      </template>
    </HoppSmartExpand>
    <hr />
    <div class="flex flex-col space-y-2">
      <template v-for="exporter in exporters" :key="exporter.id">
        <!-- adding the title to a span if the item is visible, otherwise the title won't be shown -->
        <template v-if="exporter.disabled && exporter.title">
          <span
            v-tippy="{ theme: 'tooltip' }"
            :title="t(`${exporter.title}`)"
            class="flex"
          >
            <HoppSmartItem
              v-tippy="{ theme: 'tooltip' }"
              :icon="exporter.icon"
              :label="t(`${exporter.name}`)"
              :disabled="exporter.disabled"
              :loading="exporter.loading"
              @click="emit('exporter-selected', exporter.id)"
            ></HoppSmartItem>
          </span>
        </template>

        <template v-else>
          <HoppSmartItem
            v-tippy="{ theme: 'tooltip' }"
            :icon="exporter.icon"
            :title="t(`${exporter.title}`)"
            :label="t(`${exporter.name}`)"
            :loading="exporter.loading"
            :disabled="exporter.disabled"
            @click="emit('exporter-selected', exporter.id)"
          ></HoppSmartItem>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { Component } from "vue"

const t = useI18n()

type ImportExportEntryMeta = {
  id: string
  name: string
  icon: Component
  disabled: boolean
  title?: string
  loading?: boolean
  isVisible?: boolean
}

defineProps<{
  importers: ImportExportEntryMeta[]
  exporters: ImportExportEntryMeta[]
}>()

const emit = defineEmits<{
  (e: "importer-selected", importerID: string): void
  (e: "exporter-selected", exporterID: string): void
}>()
</script>
