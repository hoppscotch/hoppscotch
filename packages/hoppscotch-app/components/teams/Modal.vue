<template>
  <SmartModal v-if="show" :title="$t('team.select_a_team')" @close="hideModal">
    <template #body>
      <Teams :modal="true" />
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
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
