<script setup lang="ts">
import { computed, reactive, shallowRef, useTemplateRef } from "vue"
import IconWrapText from "~icons/lucide/wrap-text"
import { useCodemirror } from "~/composables/codemirror"
import { useI18n } from "~/composables/i18n"
import {
  useCopyResponse,
  useDownloadResponse,
} from "~/composables/lens-actions"
import { useNestedSetting } from "~/composables/settings"
import type { GRPCUnaryResponse } from "~/helpers/grpc"
import { toggleNestedSetting } from "~/newstore/settings"

const props = defineProps<{
  response?: GRPCUnaryResponse | null
  error?: string | null
  loading?: boolean
}>()

const t = useI18n()
const responseEditor = useTemplateRef<HTMLDivElement>("responseEditor")
const wrapLines = useNestedSetting("WRAP_LINES", "httpResponseBody")
const activeTab = shallowRef<"body" | "metadata" | "trailers">("body")
const responseTabs = ["body", "metadata", "trailers"] as const

const responseBody = computed(() => props.response?.message ?? "")

const readableResponseSize = computed(() => {
  const size = props.response?.size
  if (size === undefined || size < 1000)
    return size === undefined ? "" : `${size} B`
  if (size < 100000) return `${(size / 1000).toFixed(2)} KB`
  return `${(size / 1000000).toFixed(2)} MB`
})

useCodemirror(
  responseEditor,
  responseBody,
  reactive({
    extendedEditorConfig: {
      mode: "application/ld+json",
      readOnly: true,
      lineWrapping: wrapLines,
    },
    linter: null,
    completer: null,
    environmentHighlights: false,
    predefinedVariablesHighlights: false,
  })
)

const { copyIcon, copyResponse } = useCopyResponse(responseBody)
const { downloadIcon, downloadResponse } = useDownloadResponse(
  "application/json",
  responseBody,
  "gRPC-Response"
)
</script>

<template>
  <div class="relative flex h-full flex-1 flex-col overflow-auto">
    <div
      class="flex flex-shrink-0 items-center justify-center overflow-x-auto whitespace-nowrap bg-primary p-4"
    >
      <div v-if="loading" class="flex flex-col items-center justify-center">
        <HoppSmartSpinner class="my-4" />
        <span class="text-secondaryLight">{{ t("state.loading") }}</span>
      </div>
      <HoppSmartPlaceholder v-else-if="error" :heading="error" :text="error" />
      <div
        v-else-if="response"
        class="flex flex-1 items-center text-tiny font-semibold"
      >
        <div class="inline-flex flex-1 space-x-4 text-green-500">
          <span>
            <span class="text-secondary">{{ t("response.status") }}: </span>
            {{ `${response.status}\xA0 • \xA0${response.statusText}` }}
          </span>
          <span>
            <span class="text-secondary">{{ t("response.time") }}: </span>
            {{ `${response.duration.toFixed(0)} ms` }}
          </span>
          <span :title="`${response.size} B`">
            <span class="text-secondary">{{ t("response.size") }}: </span>
            {{ readableResponseSize }}
          </span>
        </div>
      </div>
      <div v-else class="flex-1 text-center text-secondaryLight">
        Invoke a unary method to see its response.
      </div>
    </div>

    <div v-if="response && !loading" class="flex min-h-0 flex-1 flex-col">
      <div
        class="flex flex-shrink-0 items-center justify-between border-b border-dividerLight bg-primary pl-4"
      >
        <div
          class="flex self-stretch"
          role="tablist"
          :aria-label="t('response.title')"
        >
          <button
            v-for="tab in responseTabs"
            :id="`grpc-response-${tab}-tab`"
            :key="tab"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab"
            :aria-controls="`grpc-response-${tab}-panel`"
            :tabindex="activeTab === tab ? 0 : -1"
            class="px-4 text-secondaryLight"
            :class="
              activeTab === tab && 'border-b-2 border-accent text-secondaryDark'
            "
            @click="activeTab = tab"
          >
            {{ t(`response.${tab}`) }}
          </button>
        </div>
        <div v-if="activeTab === 'body'" class="flex items-center">
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('state.linewrap')"
            :class="{ '!text-accent': wrapLines }"
            :icon="IconWrapText"
            @click.prevent="
              toggleNestedSetting('WRAP_LINES', 'httpResponseBody')
            "
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.download_file')"
            :icon="downloadIcon"
            @click="downloadResponse"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.copy')"
            :icon="copyIcon"
            @click="copyResponse"
          />
        </div>
      </div>
      <div
        v-show="activeTab === 'body'"
        id="grpc-response-body-panel"
        role="tabpanel"
        aria-labelledby="grpc-response-body-tab"
        class="relative min-h-64 flex-1 overflow-auto bg-primary"
      >
        <div ref="responseEditor" class="absolute inset-0"></div>
      </div>
      <div
        v-if="activeTab !== 'body'"
        :id="`grpc-response-${activeTab}-panel`"
        role="tabpanel"
        :aria-labelledby="`grpc-response-${activeTab}-tab`"
        class="flex min-h-64 flex-1 flex-col overflow-auto bg-primary"
      >
        <div
          v-for="entry in activeTab === 'metadata'
            ? response.metadata
            : response.trailers"
          :key="`${entry.key}:${entry.value}`"
          class="grid grid-cols-2 border-b border-dividerLight px-4 py-2"
        >
          <span class="break-all font-semibold text-secondaryDark">
            {{ entry.key }}
          </span>
          <span class="break-all text-secondaryLight">{{ entry.value }}</span>
        </div>
        <div
          v-if="
            (activeTab === 'metadata' ? response.metadata : response.trailers)
              .length === 0
          "
          class="flex flex-1 items-center justify-center text-secondaryLight"
        >
          {{
            activeTab === "metadata"
              ? t("response.no_metadata")
              : t("response.no_trailers")
          }}
        </div>
      </div>
    </div>
  </div>
</template>
