<template>
  <!-- TODO: i18n -->
  <HoppSmartModal
    v-if="show"
    dialog
    styles="sm:max-w-md"
    title="Agent Registration"
    @close="hideModal"
  >
    <template #body> This is the body </template>

    <template #footer>
      <div class="flex justify-start flex-1">
        <HoppButtonPrimary
          :label="t('action.create')"
          :loading="loading"
          @click="register"
        />

        <HoppButtonSecondary
          :label="t('action.cancel')"
          class="ml-2"
          filled
          outline
          @click="hideModal"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "~/composables/i18n"
import { ref } from "vue"

const t = useI18n()

const loading = ref(false)

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

function hideModal() {
  emit("hide-modal")
}

function register() {
  throw new Error("TODO: Not Implemented")
}
</script>
