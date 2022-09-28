<template>
  <SmartModal
    v-if="show"
    dialog
    :title="t('modal.confirm')"
    aria-modal="true"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col">
        <label>
          {{ t("confirm.request_change") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span class="flex">
        <ButtonPrimary
          v-focus
          :label="t('action.save')"
          @click="saveApiChange"
        />
        <ButtonSecondary
          :label="t('action.dont_save')"
          @click="discardApiChange"
        />
      </span>
      <ButtonSecondary :label="t('action.cancel')" @click="hideModal" />
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"

const t = useI18n()

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "save-change"): void
  (e: "discard-change"): void
  (e: "hide-modal"): void
}>()

const saveApiChange = () => {
  emit("save-change")
}

const discardApiChange = () => {
  emit("discard-change")
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
