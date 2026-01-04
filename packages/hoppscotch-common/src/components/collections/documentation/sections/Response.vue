<template>
  <div v-if="hasResponseExamples" class="max-w-2xl space-y-2">
    <h2
      class="text-sm font-semibold text-secondaryDark flex items-end px-4 p-2 border-b border-divider"
    >
      {{ t("documentation.response.title") }}
    </h2>

    <div
      v-if="responseExamples && responseExamples.length > 0"
      class="border border-divider"
    >
      <HoppSmartTabs
        v-model="selectedResponseTab"
        styles="sticky overflow-x-auto flex-shrink-0 z-10 bg-primary "
      >
        <HoppSmartTab
          v-for="(example, index) in responseExamples"
          :id="`response-${index}`"
          :key="index"
          :label="String(example.statusCode)"
          class="flex h-full w-full flex-1 flex-col"
        >
          <div class="rounded-md overflow-hidden my-4">
            <div class="px-4 py-2 border-b border-divider">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <span class="text-sm text-secondary">
                    {{ example.name || "Untitled" }}
                  </span>
                </div>
                <HoppSmartItem
                  :icon="IconCopy"
                  :title="t('documentation.response.copy')"
                  @click="copyResponseExample(example)"
                />
              </div>
            </div>

            <HoppSmartTabs
              v-model="selectedContentTabs[index]"
              styles="sticky overflow-x-auto flex-shrink-0 z-10 bg-primary"
            >
              <HoppSmartTab
                v-if="example.body"
                id="body"
                :label="t('documentation.response.body')"
                class="flex h-full w-full flex-1 flex-col"
              >
                <div class="p-4">
                  <div v-if="isJsonResponse(example)">
                    <pre
                      class="bg-primaryLight p-3 rounded my-2 overflow-auto max-h-64 text-sm font-mono text-secondaryLight"
                      >{{ formatJSON(example.body) }}</pre
                    >
                  </div>
                  <div v-else>
                    <pre
                      class="bg-primaryLight p-3 rounded my-2 overflow-auto max-h-64 text-sm font-mono text-secondaryLight"
                      >{{ example.body }}</pre
                    >
                  </div>
                </div>
              </HoppSmartTab>

              <HoppSmartTab
                v-if="example.headers && example.headers.length > 0"
                id="headers"
                :label="t('documentation.response.headers')"
                :info="`${example.headers.length}`"
                class="flex h-full w-full flex-1 flex-col"
              >
                <div class="p-4">
                  <table class="w-full border-collapse text-sm">
                    <thead class="bg-divider/20">
                      <tr>
                        <th
                          class="text-left py-2 px-3 font-semibold text-secondaryDark text-xs"
                        >
                          {{ t("documentation.key") }}
                        </th>
                        <th
                          class="text-left py-2 px-3 font-semibold text-secondaryDark text-xs"
                        >
                          {{ t("documentation.value") }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="(header, headerIndex) in example.headers"
                        :key="headerIndex"
                        class="border-t border-divider"
                      >
                        <td class="py-2 px-3 text-xs">
                          {{ header.key }}
                        </td>
                        <td class="py-2 px-3 text-secondaryLight text-xs">
                          {{ header.value }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </HoppSmartTab>

              <template #actions>
                <div
                  v-if="example.statusCode"
                  class="flex items-center gap-2 px-4"
                >
                  <span
                    class="px-1 py-.5 text-tiny rounded"
                    :class="getStatusCodeClass(example.statusCode)"
                  >
                    {{ example.statusCode }} -
                    {{ getStatusCodeReasonPhrase(example.statusCode) }}
                  </span>
                </div>
              </template>
            </HoppSmartTabs>
          </div>
        </HoppSmartTab>
      </HoppSmartTabs>
    </div>

    <div v-else class="text-center py-8 text-secondaryLight">
      <icon-lucide-file-text class="mx-auto mb-2" size="24" />
      <p class="text-sm">{{ t("documentation.response.no_examples") }}</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from "vue"
import IconCopy from "~icons/lucide/copy"
import { useToast } from "~/composables/toast"
import { getStatusCodeReasonPhrase } from "~/helpers/utils/statusCodes"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

interface ResponseExample {
  name?: string
  statusCode?: number
  headers?: Array<{ key: string; value: string }>
  body?: string
  contentType?: string
}

const props = defineProps<{
  responseExamples?: ResponseExample[] | null
}>()

const toast = useToast()
const selectedResponseTab = ref<string>("response-0")
const selectedContentTabs = ref<Record<number, string>>({})

// Initialize tabs when responseExamples change
watch(
  () => props.responseExamples,
  (newExamples) => {
    if (newExamples && newExamples.length > 0) {
      // Set default response tab to the first example
      selectedResponseTab.value = "response-0"

      // Initialize content tabs for each response example
      const newSelectedTabs: Record<number, string> = {}
      newExamples.forEach((example, index) => {
        // Default to "body" tab if body exists, otherwise "headers"
        newSelectedTabs[index] = example.body ? "body" : "headers"
      })
      selectedContentTabs.value = newSelectedTabs
    }
  },
  { immediate: true }
)

const hasResponseExamples = computed(() => {
  return props.responseExamples && props.responseExamples.length > 0
})

/**
 * Returns the appropriate CSS class for styling the status code badge
 * @param statusCode The HTTP status code
 * @returns CSS class string for the status code badge
 */
function getStatusCodeClass(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) {
    return "bg-green-500/10 text-green-500 "
  } else if (statusCode >= 300 && statusCode < 400) {
    return "bg-yellow-500/10 text-yellow-500"
  } else if (statusCode >= 400 && statusCode < 500) {
    return "bg-orange-500/10 text-orange-500"
  } else if (statusCode >= 500) {
    return "bg-red-500/10 text-red-500"
  }
  return "bg-secondaryLight/20 text-secondaryLight"
}

/**
 * Check if the response is JSON based on content type or body structure
 * @param example Response example
 * @returns Boolean indicating if response is JSON
 */
function isJsonResponse(example: ResponseExample): boolean {
  if (example.contentType?.includes("application/json")) {
    return true
  }

  // Try to parse as JSON to determine if it's valid JSON
  try {
    JSON.parse(example.body || "")
    return true
  } catch (e) {
    return false
  }
}

/**
 * Format JSON string for display
 * @param jsonString String to format
 * @returns Formatted JSON string
 */
function formatJSON(jsonString: string): string {
  try {
    const parsed = JSON.parse(jsonString || "{}")
    return JSON.stringify(parsed, null, 2)
  } catch (e) {
    return jsonString || ""
  }
}

/**
 * Copy response example to clipboard
 * @param example Response example to copy
 */
async function copyResponseExample(example: ResponseExample): Promise<void> {
  try {
    const responseText = example.body || ""
    await navigator.clipboard.writeText(responseText)
    toast.success(t("documentation.response.example_copied"))
  } catch (err) {
    console.error("Failed to copy response example: ", err)
    toast.error(t("documentation.response.example_copy_failed"))
  }
}
</script>
