<template>
  <div
    class="sticky top-0 z-10 flex flex-shrink-0 items-center justify-center overflow-auto overflow-x-auto whitespace-nowrap bg-primary p-4"
  >
    <AppShortcutsPrompt v-if="response == null && !isEmbed" class="flex-1" />

    <div v-if="response == null && isEmbed">
      <HoppButtonSecondary
        :label="`${t('app.documentation')}`"
        to="https://docs.hoppscotch.io/documentation/features/graphql-api-testing"
        :icon="IconExternalLink"
        blank
        outline
        reverse
      />
    </div>

    <div v-else-if="response" class="flex flex-1 flex-col">
      <div v-if="isLoading" class="flex flex-col items-center justify-center">
        <HoppSmartSpinner class="my-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>

      <component
        :is="errorResponse?.error?.component"
        v-if="errorResponse?.error?.component"
        class="flex-1"
      />

      <HoppSmartPlaceholder
        v-if="errorResponse && !errorResponse.error.component"
        :src="`/images/states/${colorMode.value}/upload_error.svg`"
        :alt="errorResponse.error.message || t('error.network_fail')"
        :heading="errorResponse.error.message || t('error.network_fail')"
        :text="errorResponse.error.message || t('error.network_fail')"
      />

      <div
        v-if="successResponse"
        class="flex items-center text-tiny font-semibold"
      >
        <div
          :class="statusCategory.className"
          class="inline-flex flex-1 space-x-4"
        >
          <span v-if="successResponse.document?.statusCode">
            <span class="text-secondary"> {{ t("response.status") }}: </span>
            {{ `${successResponse.document.statusCode}\xA0 • \xA0`
            }}{{
              getStatusCodeReasonPhrase(
                successResponse.document.statusCode,
                successResponse.document.statusText
              )
            }}
          </span>
          <span v-if="successResponse.document?.meta?.responseDuration">
            <span class="text-secondary"> {{ t("response.time") }}: </span>
            {{ `${successResponse.document.meta.responseDuration} ms` }}
          </span>
          <span
            v-if="successResponse.document?.meta?.responseSize"
            v-tippy="
              readableResponseSize
                ? { theme: 'tooltip' }
                : { onShow: () => false }
            "
            :title="`${successResponse.document.meta.responseSize} B`"
          >
            <span class="text-secondary"> {{ t("response.size") }}: </span>
            {{
              readableResponseSize
                ? readableResponseSize
                : `${successResponse.document.meta.responseSize} B`
            }}
          </span>
        </div>
      </div>
    </div>
    <AppInspection
      v-if="!isLoading"
      :inspection-results="tabResults"
      :class="[
        response === null || errorResponse
          ? 'absolute right-2 top-2'
          : '-m-2 ml-2',
      ]"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import findStatusGroup from "@helpers/findStatusGroup"
import type { GQLResponseEvent } from "~/helpers/graphql/connection"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { getStatusCodeReasonPhrase } from "~/helpers/utils/statusCodes"
import { useService } from "dioc/vue"
import { InspectionService } from "~/services/inspection"
import { GQLTabService } from "~/services/tab/graphql"
import IconExternalLink from "~icons/lucide/external-link"

const t = useI18n()
const colorMode = useColorMode()
const tabs = useService(GQLTabService)

const props = defineProps<{
  response: GQLResponseEvent[] | null | undefined
  isEmbed?: boolean
}>()

const isLoading = computed(() => {
  return props.response === null || props.response === undefined
})

const successResponse = computed(() => {
  if (!props.response || props.response.length === 0) return null
  // For subscriptions with multiple responses, show the latest one
  const responses = props.response.filter((r) => r.type === "response")
  if (responses.length === 0) return null
  return responses[responses.length - 1]
})

const errorResponse = computed(() => {
  if (!props.response || props.response.length === 0) return null
  const firstResponse = props.response[0]
  return firstResponse?.type === "error" ? firstResponse : null
})

/**
 * Gives the response size in a human readable format
 * (changes unit from B to MB/KB depending on the size)
 * If no changes (error res state) or value can be made (size < 1KB ?),
 * it returns undefined
 */
const readableResponseSize = computed(() => {
  if (!successResponse.value?.document?.meta?.responseSize) return undefined

  const size = successResponse.value.document.meta.responseSize

  if (size >= 100000) return (size / 1000000).toFixed(2) + " MB"
  if (size >= 1000) return (size / 1000).toFixed(2) + " KB"

  return undefined
})

const statusCategory = computed(() => {
  if (!successResponse.value?.document?.statusCode) {
    return {
      name: "error",
      className: "text-red-500",
    }
  }
  return findStatusGroup(successResponse.value.document.statusCode)
})

const inspectionService = useService(InspectionService)

const tabResults = inspectionService.getResultViewFor(
  tabs.currentTabID.value,
  (result) => result.locations.type === "response"
)
</script>
