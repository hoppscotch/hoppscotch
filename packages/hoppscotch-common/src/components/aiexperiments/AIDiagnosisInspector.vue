<template>
  <div class="flex flex-col divide-y divide-dashed divide-dividerDark">
    <div class="flex flex-col px-3 py-2">
      <div class="flex flex-col space-y-2">
        <div class="flex flex-col">
          <span class="text-tiny text-secondaryLight mb-1">{{
            t("ai_experiments.diagnosis")
          }}</span>
          <span>{{ diagnosis }}</span>
        </div>
        <div class="flex flex-col">
          <span class="text-tiny text-secondaryLight mb-1">{{
            t("ai_experiments.suggested_fix")
          }}</span>
          <span>{{ fix }}</span>
        </div>
      </div>
    </div>
    <div
      v-if="traceID && !submittedFeedback"
      class="flex items-center gap-2 px-3 py-2"
    >
      <p class="text-tiny">{{ t("ai_experiments.feedback_cta_text_long") }}</p>
      <template v-if="!isSubmitFeedbackPending">
        <HoppButtonSecondary
          :icon="IconThumbsUp"
          outline
          @click="
            async () => {
              await submitFeedback('positive')
            }
          "
        />
        <HoppButtonSecondary
          :icon="IconThumbsDown"
          outline
          @click="
            async () => {
              await submitFeedback('negative')
            }
          "
        />
      </template>
      <HoppSmartSpinner v-else />
    </div>
    <div v-if="submittedFeedback" class="px-3 py-2">
      <p class="text-tiny">{{ t("ai_experiments.feedback_thank_you") }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { useI18n } from "~/composables/i18n"
import IconThumbsUp from "~icons/lucide/thumbs-up"
import IconThumbsDown from "~icons/lucide/thumbs-down"
import { platform } from "~/platform"
import { useToast } from "~/composables/useToast"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  diagnosis: string
  fix: string
  traceID: string
}>()

const submittedFeedback = ref(false)
const isSubmitFeedbackPending = ref(false)

const submitFeedback = async (type: "positive" | "negative") => {
  if (!props.traceID) return

  isSubmitFeedbackPending.value = true
  try {
    const score = type === "positive" ? 1 : -1
    await platform.experiments?.aiExperiments?.submitFeedback(
      score,
      props.traceID
    )
    submittedFeedback.value = true
  } catch (error) {
    toast.error(t("ai_experiments.feedback_failure"))
  } finally {
    isSubmitFeedbackPending.value = false
  }
}
</script>
