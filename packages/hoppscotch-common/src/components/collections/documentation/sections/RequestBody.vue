<template>
  <div v-if="body && body.contentType" class="max-w-2xl space-y-2">
    <h2
      class="text-sm font-semibold text-secondaryDark flex items-end px-4 p-2 border-b border-divider"
    >
      {{ t("documentation.body.title") }}
    </h2>
    <div class="p-4">
      <div class="flex items-center mb-2">
        <span class="font-medium text-secondaryDark w-32"
          >{{ t("documentation.body.content_type") }}:</span
        >
        <span class="px-2 py-1 text-xs rounded bg-divider text-secondaryDark">
          {{ body.contentType }}
        </span>
      </div>

      <!-- Display body content based on type -->
      <div v-if="body.contentType === 'application/json'">
        <pre
          class="bg-primaryLight p-3 rounded my-2 overflow-auto max-h-64 text-xs font-mono text-secondaryLight"
          >{{ formatJSON(body.body) }}</pre
        >
      </div>

      <div v-else-if="body.contentType === 'application/x-www-form-urlencoded'">
        <table class="w-full border-collapse mt-2">
          <thead class="">
            <tr>
              <th class="text-left py-2 font-semibold text-secondaryDark">
                {{ t("documentation.key") }}
              </th>
              <th class="text-left py-2 font-semibold text-secondaryDark">
                {{ t("documentation.value") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(item, index) in parseFormData(body.body)"
              :key="index"
              class="border-t border-divider"
            >
              <td class="py-2">
                {{ item.key }}
              </td>
              <td class="py-2 text-secondaryLight">
                {{ item.value }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else>
        <pre
          class="bg-primaryLight p-3 rounded my-2 overflow-auto max-h-64 font-mono text-secondaryLight"
          >{{ body.body }}</pre
        >
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { HoppRESTReqBody, parseRawKeyValueEntries } from "@hoppscotch/data"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

defineProps<{
  body: HoppRESTReqBody | null | undefined
}>()

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
 * Parse form data into key-value pairs
 * @param formData Form data string
 * @returns Array of key-value pairs
 */
function parseFormData(formData: string): { key: string; value: string }[] {
  try {
    return typeof formData === "string" ? parseRawKeyValueEntries(formData) : []
  } catch (e) {
    return []
  }
}
</script>
