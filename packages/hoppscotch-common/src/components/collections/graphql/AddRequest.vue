<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('request.new')"
    @close="emit('hide-modal')"
  >
    <template #body>
      <div class="flex gap-1 items-center">
        <HoppSmartInput
          v-model="editingName"
          class="flex-grow"
          placeholder=" "
          :label="t('action.label')"
          input-styles="floating-input"
          @submit="addRequest"
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
          outline
          @click="addRequest"
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
import { useService } from "dioc/vue"
import { ref, watch } from "vue"

import { useRequestNameGeneration } from "~/composables/ai-experiments"
import { GQLTabService } from "~/services/tab/graphql"
import IconSparkle from "~icons/lucide/sparkles"

const toast = useToast()
const t = useI18n()

const tabs = useService(GQLTabService)

const props = defineProps<{
  show: boolean
  folderPath?: string
  requestContext: HoppRESTRequest | null
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
  (
    e: "add-request",
    v: {
      name: string
      path: string | undefined
    }
  ): void
}>()

const editingName = ref("")

const {
  generateRequestName,
  isGenerateRequestNamePending,
  canDoRequestNameGeneration,
} = useRequestNameGeneration(editingName)

watch(
  () => props.show,
  (show) => {
    if (show) {
      editingName.value = tabs.currentActiveTab.value?.document.request.name
    }
  }
)

const addRequest = () => {
  if (!editingName.value) {
    toast.error(`${t("error.empty_req_name")}`)
    return
  }
  emit("add-request", {
    name: editingName.value,
    path: props.folderPath,
  })
  hideModal()
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
