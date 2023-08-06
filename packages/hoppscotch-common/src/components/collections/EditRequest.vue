<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('modal.edit_request')"
    @close="hideModal"
  >
    <template #body>
      <HoppSmartInput
        v-model="name"
        placeholder=" "
        :label="t('action.label')"
        input-styles="floating-input"
        @submit="editRequest"
      />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('action.save')"
          :loading="loadingState"
          outline
          @click="editRequest"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { useVModel } from "@vueuse/core"

const toast = useToast()
const t = useI18n()

const props = withDefaults(
  defineProps<{
    show: boolean
    loadingState: boolean
    modelValue?: string
  }>(),
  {
    show: false,
    loadingState: false,
    modelValue: "",
  }
)

const emit = defineEmits<{
  (e: "submit", name: string): void
  (e: "hide-modal"): void
  (e: "update:modelValue", value: string): void
}>()

const name = useVModel(props, "modelValue")

const editRequest = () => {
  if (name.value.trim() === "") {
    toast.error(t("request.invalid_name"))
    return
  }

  emit("submit", name.value)
}

const hideModal = () => {
  name.value = ""
  emit("hide-modal")
}
</script>
