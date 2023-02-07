<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('modal.confirm')"
    aria-modal="true"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col items-center justify-center">
        {{ t("confirm.request_change") }}
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <ButtonPrimary
          v-focus
          :label="t('action.save')"
          :loading="loading"
          outline
          @click="saveChange"
        />
        <ButtonSecondary
          :label="t('action.dont_save')"
          outline
          filled
          @click="discardChange"
        />
      </span>
      <ButtonSecondary
        :label="t('action.cancel')"
        outline
        filled
        @click="hideModal"
      />
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"

const t = useI18n()

defineProps<{
  show: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  (e: "save-change"): void
  (e: "discard-change"): void
  (e: "hide-modal"): void
}>()

const saveChange = () => {
  emit("save-change")
}

const discardChange = () => {
  emit("discard-change")
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
