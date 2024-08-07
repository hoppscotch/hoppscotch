<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="`${t('modal.edit_request')}`"
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
          @submit="saveRequest"
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
          @click="generateRequestName"
        />
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="`${t('action.save')}`"
          outline
          @click="saveRequest"
        />
        <HoppButtonSecondary
          :label="`${t('action.cancel')}`"
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
import { HoppGQLRequest } from "@hoppscotch/data"
import { ref, watch } from "vue"
import { useRequestNameGeneration } from "~/composables/ai-experiments"
import { editGraphqlRequest } from "~/newstore/collections"
import IconSparkle from "~icons/lucide/sparkles"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  show: boolean
  folderPath?: string
  requestIndex: number | null
  request: HoppGQLRequest | null
  editingRequestName: string
  requestContext: HoppGQLRequest | null
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const editingName = ref("")

watch(
  () => props.editingRequestName,
  (val) => {
    editingName.value = val
  }
)

const {
  canDoRequestNameGeneration,
  generateRequestName,
  isGenerateRequestNamePending,
} = useRequestNameGeneration(editingName)

const saveRequest = () => {
  if (!editingName.value) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }

  const requestUpdated = {
    ...(props.request as any),
    name: editingName.value || (props.request as any).name,
  }

  editGraphqlRequest(props.folderPath, props.requestIndex, requestUpdated)

  hideModal()
}

const hideModal = () => {
  editingName.value = ""
  emit("hide-modal")
}
</script>
