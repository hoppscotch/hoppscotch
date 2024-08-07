<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('modal.edit_request')"
    @close="hideModal"
  >
    <template #body>
      <div class="flex gap-1">
        <HoppSmartInput
          v-model="editingName"
          class="flex-grow"
          placeholder=" "
          :label="t('action.label')"
          input-styles="floating-input"
          @submit="editRequest"
        />
        <HoppButtonSecondary
          v-if="canDoRequestNameGeneration"
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconSparkle"
          :disabled="isGenerateRequestNamePending"
          class="rounded-md"
          :class="{
            'animate-pulse': isGenerateRequestNamePending,
          }"
          :title="t('ai_experiments.generate_request_name')"
          @click="generateRequestName(props.requestContext)"
        />
      </div>
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
import { HoppRESTRequest } from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import { useRequestNameGeneration } from "~/composables/ai-experiments"
import IconSparkle from "~icons/lucide/sparkles"

const toast = useToast()
const t = useI18n()

const props = withDefaults(
  defineProps<{
    show: boolean
    loadingState: boolean
    modelValue?: string
    requestContext: HoppRESTRequest | null
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

const editingName = useVModel(props, "modelValue")

const {
  generateRequestName,
  canDoRequestNameGeneration,
  isGenerateRequestNamePending,
} = useRequestNameGeneration(editingName)

const editRequest = () => {
  if (editingName.value.trim() === "") {
    toast.error(t("request.invalid_name"))
    return
  }

  emit("submit", editingName.value)
}

const hideModal = () => {
  editingName.value = ""
  emit("hide-modal")
}
</script>
