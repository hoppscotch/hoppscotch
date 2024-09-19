<script setup lang="ts">
import IconArrowRight from "~icons/lucide/arrow-right"
import IconThumbsUp from "~icons/lucide/thumbs-up"
import IconThumbsDown from "~icons/lucide/thumbs-down"
import {
  useModifyRequestBody,
  useSubmitFeedback,
} from "~/composables/ai-experiments"
import { ref } from "vue"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

const props = defineProps<{
  currentBody: string
}>()

const emit = defineEmits<{
  (e: "closeModal"): void
  (e: "updateBody", body: string): void
}>()

const generatedBodyContent = ref("")

const userPrompt = ref("")

const { modifyRequestBody, isModifyRequestBodyPending, lastTraceID } =
  useModifyRequestBody(props.currentBody, userPrompt, generatedBodyContent)

const { submitFeedback, isSubmitFeedbackPending } = useSubmitFeedback()
</script>

<template>
  <HoppSmartModal styles="sm:max-w-3xl" full-width>
    <template #body>
      <div class="flex flex-col border-b border-divider transition relative">
        <div class="flex items-center pt-3 pb-3 sticky">
          <input
            id="command"
            v-model="userPrompt"
            v-focus
            type="text"
            autocomplete="off"
            name="command"
            :placeholder="`${t(
              'ai_experiments.generate_or_modify_request_body_input_placeholder'
            )}`"
            class="flex flex-1 bg-transparent px-6 text-base text-secondaryDark"
          />

          <HoppButtonSecondary
            :icon="IconArrowRight"
            class="mr-6 rounded-md"
            outline
            filled
            :loading="isModifyRequestBodyPending"
            :disabled="!userPrompt || isModifyRequestBodyPending"
            @click="modifyRequestBody"
          />
          <!-- <HoppSmartSpinner class="mr-6" /> -->

          <!-- px-6 py-3 -->
          <!-- <HoppSmartSpinner v-if="searchSession?.loading" class="mr-6" /> -->
        </div>

        <div>
          <AiexperimentsMergeView
            :content-left="{
              content: currentBody ?? '',
              langMime: 'application/json',
            }"
            :content-right="{
              content: generatedBodyContent,
              langMime: 'application/json',
            }"
          ></AiexperimentsMergeView>
        </div>

        <!-- :loading="loadingState" -->
        <!-- @click="addNewCollection" -->
      </div>
    </template>

    <template #footer>
      <div class="flex gap-1 px-6 py-3 justify-between items-center w-full">
        <div v-if="lastTraceID" class="flex items-center gap-2">
          <p>Rate the generation, helps us to improve</p>
          <HoppButtonSecondary
            :icon="IconThumbsUp"
            outline
            @click="submitFeedback('positive', lastTraceID)"
          />
          <HoppButtonSecondary
            :icon="IconThumbsDown"
            outline
            @click="submitFeedback('negative', lastTraceID)"
          />
        </div>
        <div class="ml-auto">
          <HoppButtonSecondary
            :label="t('action.cancel')"
            outline
            @click="
              () => {
                emit('closeModal')
              }
            "
          />
          <HoppButtonSecondary
            :label="t('ai_experiments.accept_change')"
            outline
            filled
            :disabled="isModifyRequestBodyPending || !generatedBodyContent"
            @click="
              () => {
                emit('updateBody', generatedBodyContent)
                emit('closeModal')
              }
            "
          />
        </div>
      </div>
    </template>
  </HoppSmartModal>
</template>
