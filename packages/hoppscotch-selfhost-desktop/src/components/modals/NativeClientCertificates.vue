<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="'Client Certificates'"
    @close="emit('hide-modal')"
  >
    <template #body>
      Hello Client Certificates!
    </template>
  </HoppSmartModal>
</template>

<!-- TODO: i18n -->
<script setup lang="ts">
defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()
</script>
