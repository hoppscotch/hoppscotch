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
          v-model="requestUpdateData.name"
          class="flex-grow"
          placeholder=" "
          :label="t('action.label')"
          input-styles="floating-input"
          @submit="saveRequest"
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
import * as E from "fp-ts/Either"
import { computed, ref, watch } from "vue"

import { useSetting } from "~/composables/settings"
import { useReadonlyStream } from "~/composables/stream"
import { editGraphqlRequest } from "~/newstore/collections"
import { platform } from "~/platform"
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

const requestUpdateData = ref({ name: null as string | null })

watch(
  () => props.editingRequestName,
  (val) => {
    requestUpdateData.value.name = val
  }
)

const ENABLE_AI_EXPERIMENTS = useSetting("ENABLE_AI_EXPERIMENTS")

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
    platform: "gql",
  })

  const result = await generateRequestNameForPlatform(
    JSON.stringify(props.requestContext)
  )

  if (result && E.isLeft(result)) {
    toast.error(t("request.generate_name_error"))

    isGenerateRequestNamePending.value = false

    return
  }

  requestUpdateData.value.name = result.right

  isGenerateRequestNamePending.value = false
}

const saveRequest = () => {
  if (!requestUpdateData.value.name) {
    toast.error(`${t("collection.invalid_name")}`)
    return
  }

  const requestUpdated = {
    ...(props.request as any),
    name: requestUpdateData.value.name || (props.request as any).name,
  }

  editGraphqlRequest(props.folderPath, props.requestIndex, requestUpdated)

  hideModal()
}

const hideModal = () => {
  requestUpdateData.value = { name: null }
  emit("hide-modal")
}
</script>
