<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('team.select_a_team')"
    @close="hideModal"
  >
    <template #body>
      <Teams :modal="true" />
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"

const t = useI18n()

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const hideModal = () => {
  emit("hide-modal")
}
</script>
