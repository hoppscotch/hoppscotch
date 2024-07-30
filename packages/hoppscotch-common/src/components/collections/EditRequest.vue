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
          v-if="showGenerateRequestNameButton"
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
import * as E from "fp-ts/Either"
import { computed, ref } from "vue"

import { useSetting } from "~/composables/settings"
import { useReadonlyStream } from "~/composables/stream"
import { platform } from "~/platform"
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

const ENABLE_AI_EXPERIMENTS = useSetting("ENABLE_AI_EXPERIMENTS")

const editingName = useVModel(props, "modelValue")

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

const isGenerateRequestNamePending = ref(false)

const showGenerateRequestNameButton = computed(() => {
  // Request generation applies only to the authenticated state
  if (!currentUser.value) {
    return false
  }

  return ENABLE_AI_EXPERIMENTS.value && !!platform.experiments?.aiExperiments
})

const generateRequestName = async () => {
  const generateRequestNameForPlatform =
    platform.experiments?.aiExperiments?.generateRequestName

  if (!props.requestContext || !generateRequestNameForPlatform) {
    toast.error(t("request.generate_name_error"))
    return
  }

  isGenerateRequestNamePending.value = true

  platform.analytics?.logEvent({
    type: "EXPERIMENTS_GENERATE_REQUEST_NAME_WITH_AI",
    platform: "rest",
  })

  const result = await generateRequestNameForPlatform(
    JSON.stringify(props.requestContext)
  )

  if (result && E.isLeft(result)) {
    toast.error(t("request.generate_name_error"))

    isGenerateRequestNamePending.value = false

    return
  }

  editingName.value = result.right

  isGenerateRequestNamePending.value = false
}

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
