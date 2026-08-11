<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('export.choose_format')"
    styles="sm:max-w-md"
    @close="emit('close')"
  >
    <template #body>
      <CollectionsExportFormatList
        :loading="loading"
        @export-hoppscotch="emit('export-hoppscotch')"
        @export-openapi="(f) => emit('export-openapi', f)"
      />
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"

const t = useI18n()

defineProps<{
  show: boolean
  loading: boolean
}>()

const emit = defineEmits<{
  (e: "close"): void
  (e: "export-hoppscotch"): void
  (e: "export-openapi", format: "json" | "yaml"): void
}>()
</script>
