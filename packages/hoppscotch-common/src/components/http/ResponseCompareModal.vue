<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('compare.title')"
    :full-width-body="true"
    styles="sm:max-w-[92vw] md:max-w-[88vw] lg:max-w-[85vw] xl:max-w-[85vw] 2xl:max-w-[85vw]"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col space-y-4 p-4 h-[80vh]">
        <!-- How it works Instruction Banner -->
        <div
          class="flex items-center space-x-2 rounded border border-accent/30 bg-accent/10 p-3 text-xs text-secondary flex-shrink-0"
        >
          <icon-lucide-info class="svg-icons text-accent flex-shrink-0" />
          <span>
            <strong>{{ t("compare.how_to_compare_title") }}</strong>
            {{ t("compare.how_to_compare_rest") }}
          </span>
        </div>

        <!-- Target Selection Header -->
        <div
          class="flex flex-col space-y-2 rounded border border-dividerLight bg-primaryLight p-3 flex-shrink-0"
        >
          <div class="flex items-center justify-between">
            <span class="font-semibold text-secondary">{{
              t("compare.target_response")
            }}</span>
            <div class="flex space-x-2">
              <HoppButtonSecondary
                :label="t('compare.open_tabs')"
                :outline="sourceType !== 'tabs'"
                filled
                class="!py-1 !px-3 text-xs"
                @click="sourceType = 'tabs'"
              />
              <HoppButtonSecondary
                :label="t('compare.raw_input')"
                :outline="sourceType !== 'raw'"
                filled
                class="!py-1 !px-3 text-xs"
                @click="sourceType = 'raw'"
              />
            </div>
          </div>

          <!-- Open Tabs Selection -->
          <div v-if="sourceType === 'tabs'" class="mt-2">
            <select
              v-model="selectedTabId"
              class="input w-full !bg-primary p-2 text-sm rounded border border-divider"
            >
              <option value="" disabled>
                {{ t("compare.select_tab_placeholder") }}
              </option>
              <option
                v-for="tItem in openTabsList"
                :key="tItem.id"
                :value="tItem.id"
              >
                {{
                  tItem.document.request.name || tItem.document.request.endpoint
                }}
                (Tab: {{ tItem.id }})
              </option>
            </select>
            <p
              v-if="openTabsList.length === 0"
              class="mt-1.5 text-xs text-secondaryLight italic"
            >
              {{ t("compare.no_open_tabs") }}
            </p>
          </div>

          <!-- Raw Input Selection -->
          <div v-else class="mt-2">
            <textarea
              v-model="rawInputText"
              rows="3"
              class="input w-full font-mono text-xs p-2 !bg-primary rounded border border-divider"
              :placeholder="t('compare.raw_input_placeholder')"
            />
          </div>
        </div>

        <!-- Metadata Comparison Summary -->
        <div
          class="grid grid-cols-2 gap-4 rounded border border-divider p-3 bg-primary flex-shrink-0"
        >
          <!-- Left Response Meta (Response A) -->
          <div class="flex flex-col space-y-1">
            <span class="text-xs font-bold text-accent">{{
              t("compare.response_a")
            }}</span>
            <div class="flex space-x-4 text-xs text-secondary">
              <span
                >{{ t("compare.status") }}:
                <strong class="text-primary">{{
                  responseAStatus
                }}</strong></span
              >
              <span
                >{{ t("compare.time") }}:
                <strong class="text-primary">{{ responseATime }}</strong></span
              >
              <span
                >{{ t("compare.size") }}:
                <strong class="text-primary">{{ responseASize }}</strong></span
              >
            </div>
          </div>

          <!-- Right Response Meta (Response B) -->
          <div class="flex flex-col space-y-1 border-l border-divider pl-4">
            <span class="text-xs font-bold text-accent">{{
              t("compare.response_b")
            }}</span>
            <div class="flex space-x-4 text-xs text-secondary">
              <span
                >{{ t("compare.status") }}:
                <strong class="text-primary">{{
                  responseBStatus
                }}</strong></span
              >
              <span
                >{{ t("compare.time") }}:
                <strong class="text-primary">{{ responseBTime }}</strong></span
              >
              <span
                >{{ t("compare.size") }}:
                <strong class="text-primary">{{ responseBSize }}</strong></span
              >
            </div>
          </div>
        </div>

        <!-- Visual Diff Viewer -->
        <div
          class="flex flex-col flex-1 rounded border border-divider bg-primary min-h-[350px] overflow-hidden"
        >
          <div
            class="flex items-center justify-between border-b border-divider bg-primaryLight px-4 py-2 text-xs font-semibold text-secondary flex-shrink-0"
          >
            <span>{{ t("compare.visual_diff") }}</span>
            <div class="flex space-x-4 text-xs">
              <span class="text-green-500 font-semibold"
                >+ {{ diffStats.added }} {{ t("compare.added") }}</span
              >
              <span class="text-red-500 font-semibold"
                >- {{ diffStats.removed }} {{ t("compare.removed") }}</span
              >
            </div>
          </div>

          <div
            class="grid grid-cols-2 divide-x divide-divider overflow-auto font-mono text-xs p-2 flex-1"
          >
            <!-- Response A Column -->
            <div class="flex flex-col space-y-0.5 pr-2">
              <div
                v-for="(line, idx) in diffResult.leftLines"
                :key="`left-${idx}`"
                :class="[
                  line.type === 'removed'
                    ? 'bg-red-500/15 text-red-400 font-semibold'
                    : '',
                  line.type === 'unchanged' ? 'text-secondaryLight' : '',
                  line.type === 'empty' ? 'opacity-0' : '',
                  'px-2 py-0.5 whitespace-pre-wrap break-all rounded-sm',
                ]"
              >
                <span
                  class="inline-block w-8 select-none opacity-40 text-right mr-2"
                  >{{ line.lineNum || "" }}</span
                >
                <span>{{ line.text }}</span>
              </div>
            </div>

            <!-- Response B Column -->
            <div class="flex flex-col space-y-0.5 pl-2">
              <div
                v-for="(line, idx) in diffResult.rightLines"
                :key="`right-${idx}`"
                :class="[
                  line.type === 'added'
                    ? 'bg-green-500/15 text-green-400 font-semibold'
                    : '',
                  line.type === 'unchanged' ? 'text-secondaryLight' : '',
                  line.type === 'empty' ? 'opacity-0' : '',
                  'px-2 py-0.5 whitespace-pre-wrap break-all rounded-sm',
                ]"
              >
                <span
                  class="inline-block w-8 select-none opacity-40 text-right mr-2"
                  >{{ line.lineNum || "" }}</span
                >
                <span>{{ line.text }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end space-x-2">
        <HoppButtonSecondary
          :label="t('compare.close')"
          outline
          filled
          @click="hideModal"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import type { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { useResponseBody } from "@composables/lens-actions"
import { useService } from "dioc/vue"
import { WorkspaceTabsService } from "~/services/tab/workspace-tabs"
import { useI18n } from "@composables/i18n"
import { computeLineDiff, getUtf8ByteSize } from "~/helpers/diff"

const t = useI18n()

const props = defineProps<{
  show: boolean
  response: HoppRESTResponse | null | undefined
  tabId?: string
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const hideModal = () => emit("hide-modal")

const workspaceTabs = useService(WorkspaceTabsService)

const sourceType = ref<"tabs" | "raw">("tabs")
const selectedTabId = ref<string>("")
const rawInputText = ref<string>("")

const openTabsList = computed(() => {
  const allTabs = workspaceTabs.getTabs()
  return allTabs.filter(
    (t) =>
      t.id !== props.tabId &&
      t.document.type === "request" &&
      t.document.response &&
      (t.document.response.type === "success" ||
        t.document.response.type === "fail")
  )
})

// Response A details
const responseAStatus = computed(() => {
  if (!props.response) return "N/A"
  if (props.response.type === "success" || props.response.type === "fail") {
    return `${props.response.statusCode} ${props.response.statusText || ""}`
  }
  return "N/A"
})

const responseATime = computed(() => {
  if (
    !props.response ||
    props.response.type === "loading" ||
    props.response.type === "network_fail"
  )
    return "N/A"
  return `${props.response.meta?.responseDuration ?? 0} ms`
})

const responseASize = computed(() => {
  if (
    !props.response ||
    props.response.type === "loading" ||
    props.response.type === "network_fail"
  )
    return "N/A"
  const bytes = props.response.meta?.responseSize ?? 0
  if (bytes > 1000) return `${(bytes / 1000).toFixed(2)} KB`
  return `${bytes} B`
})

const responseABodyText = computed(() => {
  if (!props.response) return ""
  if (props.response.type === "success" || props.response.type === "fail") {
    const { responseBodyText } = useResponseBody(props.response)
    try {
      const parsed = JSON.parse(responseBodyText.value)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return responseBodyText.value
    }
  }
  return ""
})

// Response B details resolution
const selectedTabItem = computed(() => {
  if (selectedTabId.value) {
    return openTabsList.value.find((t) => t.id === selectedTabId.value) || null
  }
  return null
})

const selectedTargetResponse = computed<HoppRESTResponse | null>(() => {
  if (
    sourceType.value === "tabs" &&
    selectedTabItem.value &&
    selectedTabItem.value.document.type === "request"
  ) {
    return selectedTabItem.value.document.response || null
  }
  return null
})

const responseBStatus = computed(() => {
  if (
    sourceType.value === "tabs" &&
    selectedTargetResponse.value &&
    (selectedTargetResponse.value.type === "success" ||
      selectedTargetResponse.value.type === "fail")
  ) {
    return `${selectedTargetResponse.value.statusCode}`
  }
  return sourceType.value === "raw" ? t("compare.custom") : "N/A"
})

const responseBTime = computed(() => {
  if (
    sourceType.value === "tabs" &&
    selectedTargetResponse.value &&
    (selectedTargetResponse.value.type === "success" ||
      selectedTargetResponse.value.type === "fail")
  ) {
    return `${selectedTargetResponse.value.meta?.responseDuration ?? 0} ms`
  }
  return "N/A"
})

const responseBSize = computed(() => {
  if (
    sourceType.value === "tabs" &&
    selectedTargetResponse.value &&
    (selectedTargetResponse.value.type === "success" ||
      selectedTargetResponse.value.type === "fail")
  ) {
    const bytes = selectedTargetResponse.value.meta?.responseSize ?? 0
    return bytes > 1000 ? `${(bytes / 1000).toFixed(2)} KB` : `${bytes} B`
  }
  if (sourceType.value === "raw") {
    const bytes = getUtf8ByteSize(rawInputText.value)
    return bytes > 1000 ? `${(bytes / 1000).toFixed(2)} KB` : `${bytes} B`
  }
  return "N/A"
})

const responseBBodyText = computed(() => {
  if (sourceType.value === "raw") {
    try {
      const parsed = JSON.parse(rawInputText.value)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return rawInputText.value
    }
  }

  const res = selectedTargetResponse.value
  if (res && (res.type === "success" || res.type === "fail")) {
    const { responseBodyText } = useResponseBody(res)
    try {
      const parsed = JSON.parse(responseBodyText.value)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return responseBodyText.value
    }
  }

  return ""
})

const diffResult = computed(() => {
  const textA = responseABodyText.value.split("\n")
  const textB = responseBBodyText.value.split("\n")
  return computeLineDiff(textA, textB)
})

const diffStats = computed(() => {
  let added = 0
  let removed = 0
  diffResult.value.rightLines.forEach((l) => {
    if (l.type === "added") added++
  })
  diffResult.value.leftLines.forEach((l) => {
    if (l.type === "removed") removed++
  })
  return { added, removed }
})
</script>
