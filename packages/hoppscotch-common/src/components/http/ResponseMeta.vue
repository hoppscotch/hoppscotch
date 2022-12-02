<template>
  <div
    class="sticky top-0 z-10 flex items-start justify-center flex-shrink-0 p-4 overflow-auto overflow-x-auto bg-primary whitespace-nowrap"
  >
    <AppShortcutsPrompt v-if="response == null" class="flex-1" />
    <div v-else class="flex flex-col flex-1">
      <div
        v-if="response.type === 'loading'"
        class="flex flex-col items-center justify-center"
      >
        <SmartSpinner class="my-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>
      <div
        v-if="response.type === 'network_fail'"
        class="flex flex-col items-center justify-center flex-1 p-4"
      >
        <img
          :src="`/images/states/${colorMode.value}/youre_lost.svg`"
          loading="lazy"
          class="inline-flex flex-col object-contain object-center w-32 h-32 my-4"
          :alt="`${t('error.network_fail')}`"
        />
        <span class="mb-2 font-semibold text-center">
          {{ t("error.network_fail") }}
        </span>
        <span
          class="max-w-sm mb-6 text-center whitespace-normal text-secondaryLight"
        >
          {{ t("helpers.network_fail") }}
        </span>
        <AppInterceptor class="p-2 border rounded border-dividerLight" />
      </div>
      <div
        v-if="response.type === 'script_fail'"
        class="flex flex-col items-center justify-center flex-1 p-4"
      >
        <img
          :src="`/images/states/${colorMode.value}/youre_lost.svg`"
          loading="lazy"
          class="inline-flex flex-col object-contain object-center w-32 h-32 my-4"
          :alt="`${t('error.script_fail')}`"
        />
        <span class="mb-2 font-semibold text-center">
          {{ t("error.script_fail") }}
        </span>
        <span
          class="max-w-sm mb-6 text-center whitespace-normal text-secondaryLight"
        >
          {{ t("helpers.script_fail") }}
        </span>
        <div
          class="w-full px-4 py-2 overflow-auto font-mono text-red-400 whitespace-normal rounded bg-primaryLight"
        >
          {{ response.error.name }}: {{ response.error.message }}<br />
          {{ response.error.stack }}
        </div>
      </div>
      <div
        v-if="response.type === 'success' || response.type === 'fail'"
        class="flex items-center font-semibold text-tiny"
      >
        <div
          :class="statusCategory.className"
          class="inline-flex flex-1 space-x-4"
        >
          <span v-if="response.statusCode">
            <span class="text-secondary"> {{ t("response.status") }}: </span>
            {{ `${response.statusCode}\xA0 • \xA0`
            }}{{ getStatusCodeReasonPhrase(response.statusCode) }}
          </span>
          <span v-if="response.meta && response.meta.responseDuration">
            <span class="text-secondary"> {{ t("response.time") }}: </span>
            {{ `${response.meta.responseDuration} ms` }}
          </span>
          <span
            v-if="response.meta && response.meta.responseSize"
            v-tippy="
              readableResponseSize
                ? { theme: 'tooltip' }
                : { onShow: () => false }
            "
            :title="`${response.meta.responseSize} B`"
          >
            <span class="text-secondary"> {{ t("response.size") }}: </span>
            {{
              readableResponseSize
                ? readableResponseSize
                : `${response.meta.responseSize} B`
            }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import findStatusGroup from "@helpers/findStatusGroup"
import type { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { getStatusCodeReasonPhrase } from "~/helpers/utils/statusCodes"

const t = useI18n()
const colorMode = useColorMode()

const props = defineProps<{
  response: HoppRESTResponse
}>()

/**
 * Gives the response size in a human readable format
 * (changes unit from B to MB/KB depending on the size)
 * If no changes (error res state) or value can be made (size < 1KB ?),
 * it returns undefined
 */
const readableResponseSize = computed(() => {
  if (
    props.response.type === "loading" ||
    props.response.type === "network_fail" ||
    props.response.type === "script_fail" ||
    props.response.type === "fail"
  )
    return undefined

  const size = props.response.meta.responseSize

  if (size >= 100000) return (size / 1000000).toFixed(2) + " MB"
  if (size >= 1000) return (size / 1000).toFixed(2) + " KB"

  return undefined
})

const statusCategory = computed(() => {
  if (
    props.response.type === "loading" ||
    props.response.type === "network_fail" ||
    props.response.type === "script_fail" ||
    props.response.type === "fail"
  )
    return {
      name: "error",
      className: "text-red-500",
    }
  return findStatusGroup(props.response.statusCode)
})
</script>
