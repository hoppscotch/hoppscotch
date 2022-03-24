<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('team.select_a_team')"
    @close="hideModal"
  >
    <template #body>
      <Teams :modal="true" />
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()

defineProps<{
  show: Boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const hideModal = () => {
  emit("hide-modal")
}
</script>
