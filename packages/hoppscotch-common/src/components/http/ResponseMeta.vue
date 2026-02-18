<template>
  <div
    class="sticky top-0 z-10 flex flex-shrink-0 items-center justify-center overflow-auto overflow-x-auto whitespace-nowrap bg-primary p-4"
  >
    <AppShortcutsPrompt v-if="response == null && !isEmbed" class="flex-1" />

    <div v-if="response == null && isEmbed">
      <HoppButtonSecondary
        :label="`${t('app.documentation')}`"
        to="https://docs.hoppscotch.io/documentation/features/rest-api-testing#response"
        :icon="IconExternalLink"
        blank
        outline
        reverse
      />
    </div>

    <div v-else-if="response" class="flex flex-1 flex-col">
      <div
        v-if="response.type === 'loading' || isLoading"
        class="flex flex-col items-center justify-center"
      >
        <HoppSmartSpinner class="my-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>

      <component
        :is="response.component"
        v-if="response.type === 'extension_error'"
        class="flex-1"
      />
      <HoppSmartPlaceholder
        v-if="response.type === 'interceptor_error'"
        :src="`/images/states/${colorMode.value}/upload_error.svg`"
        :alt="
          response.error?.humanMessage?.heading?.(t) || t('error.network_fail')
        "
        :heading="
          response.error?.humanMessage?.heading?.(t) || t('error.network_fail')
        "
        :text="
          response.error?.humanMessage?.description?.(t) ||
          t('error.network_fail')
        "
      >
        <template #body>
          <AppKernelInterceptor
            class="rounded border border-dividerLight p-2"
          />
        </template>
      </HoppSmartPlaceholder>
      <HoppSmartPlaceholder
        v-if="response.type === 'network_fail'"
        :src="`/images/states/${colorMode.value}/upload_error.svg`"
        :alt="`${t('error.network_fail')}`"
        :heading="t('error.network_fail')"
        :text="t('helpers.network_fail')"
      >
        <template #body>
          <AppKernelInterceptor
            class="rounded border border-dividerLight p-2"
          />
        </template>
      </HoppSmartPlaceholder>
      <HoppSmartPlaceholder
        v-if="response.type === 'script_fail'"
        :src="`/images/states/${colorMode.value}/upload_error.svg`"
        :alt="`${t('error.script_fail')}`"
        :label="t('error.script_fail')"
        :text="t('helpers.script_fail')"
      >
        <template #body>
          <div
            class="mt-2 w-full overflow-auto whitespace-normal rounded bg-primaryLight px-4 py-2 font-mono text-red-400"
          >
            {{ response.error.name }}: {{ response.error.message }}<br />
            {{ response.error.stack }}
          </div>
        </template>
      </HoppSmartPlaceholder>
      <div
        v-if="
          (response.type === 'success' || response.type === 'fail') &&
          !isLoading
        "
        class="flex items-center text-tiny font-semibold"
      >
        <div
          :class="statusCategory.className"
          class="inline-flex flex-1 space-x-4"
        >
          <span v-if="response.statusCode">
            <span class="text-secondary"> {{ t("response.status") }}: </span>
            {{ `${response.statusCode}\xA0 • \xA0`
            }}{{
              getStatusCodeReasonPhrase(
                response.statusCode,
                response.statusText
              )
            }}
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
          <!-- NEW: Server-Timing Display -->
          <div v-if="serverTimings.length > 0" class="ml-4">
            <div class="text-secondary mb-1">Server Timing:</div>
            <div class="space-y-1">
              <div
                v-for="timing in serverTimings"
                :key="timing.name"
                class="text-xs flex justify-between items-center"
              >
                <span>
                  <span class="font-mono">{{ timing.name }}</span>
                  <span v-if="timing.description"> - {{ timing.description }}</span>
                </span>
                <span v-if="timing.duration" class="ml-2 font-mono">{{ timing.duration }}ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <AppInspection
      v-if="response?.type !== 'loading'"
      :inspection-results="tabResults"
      :class="[
        response === null || response?.type === 'network_fail'
          ? 'absolute right-2 top-2'
          : '-m-2 ml-2',
      ]"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import findStatusGroup from "@helpers/findStatusGroup"
import type { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { getStatusCodeReasonPhrase } from "~/helpers/utils/statusCodes"
import { useService } from "dioc/vue"
import { InspectionService } from "~/services/inspection"
import { RESTTabService } from "~/services/tab/rest"
import IconExternalLink from "~icons/lucide/external-link"

const t = useI18n()
const colorMode = useColorMode()
const tabs = useService(RESTTabService)

const props = withDefaults(
  defineProps<{
    response: HoppRESTResponse | null | undefined
    isEmbed?: boolean
    isLoading?: boolean
  }>(),
  {
    isLoading: false,
  }
)

// Server-Timing interface
interface ServerTiming {
  name: string
  description?: string
  duration?: number
}

// Server-Timing parser function
const parseServerTiming = (headerValue: string): ServerTiming[] => {
  if (!headerValue) return []
  
  const timings: ServerTiming[] = []
  const entries = headerValue.split(',')
  
  entries.forEach(entry => {
    const trimmed = entry.trim()
    const parts = trimmed.split(';')
    
    if (parts.length === 0) return
    
    const timing: ServerTiming = {
      name: parts[0].trim()
    }
    
    // Parse desc and dur parameters
    parts.slice(1).forEach(part => {
      const param = part.trim()
      if (param.startsWith('desc=')) {
        timing.description = param.substring(5).replace(/"/g, '')
      } else if (param.startsWith('dur=')) {
        timing.duration = parseFloat(param.substring(4))
      }
    })
    
    timings.push(timing)
  })
  
  return timings
}

// Computed property to extract and parse Server-Timing header
const serverTimings = computed(() => {
  if (
    !props.response ||
    props.response.type !== 'success' ||
    !props.response.headers
  ) return []
  
  const serverTimingHeader = props.response.headers.find(
    header => header.key.toLowerCase() === 'server-timing'
  )
  
  if (!serverTimingHeader) return []
  
  return parseServerTiming(serverTimingHeader.value)
})

/**
 * Gives the response size in a human readable format
 * (changes unit from B to MB/KB depending on the size)
 * If no changes (error res state) or value can be made (size < 1KB ?),
 * it returns undefined
 */
const readableResponseSize = computed(() => {
  if (
    props.response === null ||
    props.response === undefined ||
    props.response.type === "loading" ||
    props.response.type === "network_fail" ||
    props.response.type === "script_fail" ||
    props.response.type === "fail" ||
    props.response.type === "extension_error"
  )
    return undefined

  const size = props.response.meta.responseSize

  if (size >= 100000) return (size / 1000000).toFixed(2) + " MB"
  if (size >= 1000) return (size / 1000).toFixed(2) + " KB"

  return undefined
})

const statusCategory = computed(() => {
  if (
    props.response === null ||
    props.response === undefined ||
    props.response.type === "loading" ||
    props.response.type === "network_fail" ||
    props.response.type === "script_fail" ||
    props.response.type === "fail" ||
    props.response.type === "extension_error"
  )
    return {
      name: "error",
      className: "text-red-500",
    }
  return findStatusGroup(props.response.statusCode)
})

const inspectionService = useService(InspectionService)

const tabResults = inspectionService.getResultViewFor(
  tabs.currentTabID.value,
  (result) => result.locations.type === "response"
)
</script>