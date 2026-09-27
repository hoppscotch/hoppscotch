<template>
  <CollectionsExportFormatList
    :loading="loading"
    @export-hoppscotch="emit('export-hoppscotch')"
    @export-openapi="(f) => emit('export-openapi', f)"
  />
</template>

<script setup lang="ts">
defineProps<{
  loading: boolean
}>()

const emit = defineEmits<{
  (e: "export-hoppscotch"): void
  (e: "export-openapi", format: "json" | "yaml"): void
}>()
</script>
