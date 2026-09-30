<template>
  <div
    class="flex flex-col"
    :class="{
      'space-y-2': !hasTeamWriteAccess,
    }"
  >
    <div class="flex flex-col space-y-2">
      <div
        v-for="importer in importers"
        :key="importer.id"
        class="relative flex items-center"
      >
        <HoppSmartItem
          class="flex-1"
          :icon="importer.icon"
          :label="t(`${importer.name}`)"
          @click="emit('importer-selected', importer.id)"
        />
        <span
          v-if="lastUsedImporterId && importer.id === lastUsedImporterId"
          class="absolute right-3 px-1.5 py-0.5 text-tiny font-medium rounded bg-accentDark/10 text-accent pointer-events-none"
        >
          {{ t("collection.last_used") }}
        </span>
      </div>
    </div>
    <hr v-if="hasTeamWriteAccess" />
    <div class="flex flex-col space-y-2">
      <template v-for="exporter in exporters" :key="exporter.id">
        <!-- adding the title to a span if the item is visible, otherwise the title won't be shown -->

        <span
          v-if="exporter.disabled && exporter.title"
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
          />
        </span>

        <HoppSmartItem
          v-else
          v-tippy="{ theme: 'tooltip' }"
          :icon="exporter.icon"
          :title="t(`${exporter.title}`)"
          :label="t(`${exporter.name}`)"
          :loading="exporter.loading"
          :disabled="exporter.disabled"
          @click="emit('exporter-selected', exporter.id)"
        />
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
  hasTeamWriteAccess: boolean
  lastUsedImporterId?: string
}>()

const emit = defineEmits<{
  (e: "importer-selected", importerID: string): void
  (e: "exporter-selected", exporterID: string): void
}>()
</script>
