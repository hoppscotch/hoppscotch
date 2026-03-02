<template>
  <div class="relative flex flex-1 flex-col">
    <div
      v-if="doc.response?.type === 'network_fail'"
      class="sticky top-0 z-50 flex-none flex-shrink-0 items-center justify-center whitespace-nowrap bg-primary p-4"
    >
      <div class="space-y-2">
        <div class="flex items-center gap-2 text-red-500 font-semibold">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{{ t("response.network_error") }}</span>
        </div>
        <p class="text-sm text-secondaryLight">
          {{ t("response.cors_explanation") }}
        </p>
        <div class="text-xs text-secondaryLight space-y-1">
          <p>• {{ t("response.cors_workaround_1") }}</p>
          <p>• {{ t("response.cors_workaround_2") }}</p>
          <p>• {{ t("response.cors_workaround_3") }}</p>
        </div>
        <details class="text-xs mt-2">
          <summary class="cursor-pointer text-accent hover:text-accentLight">{{ t("response.technical_details") }}</summary>
          <pre class="mt-1 p-2 bg-primaryDark rounded text-red-400 overflow-auto max-h-40">{{ doc.error }}</pre>
        </details>
      </div>
    </div>
    <HttpResponseMeta
      v-else
      :response="doc.response"
      :is-embed="false"
      :is-loading="loading"
    />
    <LensesResponseBodyRenderer
      v-if="!loading && hasResponse"
      :document="{
        request: {
          ...doc,
          response: null,
          testResults: null,
        },
        response: doc.response,
        testResults: doc.testResults,
      }"
      :is-editable="false"
      :is-test-runner="true"
      :show-response="showResponse"
    />
    <HoppSmartPlaceholder
      v-else
      :src="`/images/states/${colorMode.value}/add_files.svg`"
      :alt="`${t('collection_runner.response_body_lost_rerun')}`"
      :text="`${t('collection_runner.response_body_lost_rerun')}`"
    >
    </HoppSmartPlaceholder>
  </div>
</template>

<script setup lang="ts">
import { useVModel } from "@vueuse/core"
import { computed } from "vue"
import { useI18n } from "~/composables/i18n"
import { useColorMode } from "~/composables/theming"
import { HoppRequestDocument } from "~/helpers/rest/document"
import { TestRunnerRequest } from "~/services/test-runner/test-runner.service"

const t = useI18n()
const colorMode = useColorMode()

const props = defineProps<{
  showResponse: boolean
  document: TestRunnerRequest
}>()

const emit = defineEmits<{
  (e: "update:tab", val: HoppRequestDocument): void
}>()

const doc = useVModel(props, "document", emit)

const hasResponse = computed(
  () =>
    doc.value.response?.type === "success" ||
    doc.value.response?.type === "fail" ||
    doc.value.response?.type === "network_fail"
)

const loading = computed(
  // Check both response type AND testResults to ensure we stay in loading state
  // during test execution (when testResults is null)
  () => doc.value.response?.type === "loading" || doc.value.testResults === null
)
</script>
