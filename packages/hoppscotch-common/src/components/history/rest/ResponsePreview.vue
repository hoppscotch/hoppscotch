<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('history.response_preview')"
    @close="emit('close')"
  >
    <template #body>
      <div class="flex flex-col space-y-4 p-4">
        <!-- Status & duration row -->
        <div class="flex items-center space-x-3">
          <span
            class="rounded px-2 py-0.5 text-sm font-semibold"
            :class="entryStatus.className"
          >
            {{ entry.responseMeta.statusCode ?? "—" }}
          </span>
          <span class="text-secondaryLight text-sm">
            {{ duration }}
          </span>
        </div>

        <!-- Response Headers -->
        <div v-if="entry.responseHeaders && entry.responseHeaders.length">
          <div
            class="mb-1 text-tiny font-semibold uppercase text-secondaryLight"
          >
            {{ t("mock_server.response_headers") }}
          </div>
          <div class="overflow-x-auto rounded border border-dividerLight">
            <table class="w-full text-sm">
              <thead class="bg-primaryLight">
                <tr>
                  <th
                    class="px-3 py-1 text-left font-medium text-secondaryLight"
                  >
                    {{ t("count.key") }}
                  </th>
                  <th
                    class="px-3 py-1 text-left font-medium text-secondaryLight"
                  >
                    {{ t("count.value") }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(header, i) in entry.responseHeaders"
                  :key="i"
                  class="border-t border-dividerLight"
                >
                  <td class="px-3 py-1 font-mono text-xs text-accent">
                    {{ header.key }}
                  </td>
                  <td class="px-3 py-1 font-mono text-xs break-all">
                    {{ header.value }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Response Body -->
        <div>
          <div
            class="mb-1 text-tiny font-semibold uppercase text-secondaryLight"
          >
            {{ t("mock_server.response_body") }}
          </div>
          <div
            v-if="entry.responseBody"
            class="max-h-96 overflow-auto rounded border border-dividerLight bg-primaryLight p-3 font-mono text-xs whitespace-pre-wrap break-all"
          >
            {{ displayBody }}
          </div>
          <div
            v-else
            class="rounded border border-dividerLight p-4 text-center text-sm text-secondaryLight"
          >
            {{ t("history.no_response_saved") }}
          </div>
        </div>
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "@composables/i18n"
import { RESTHistoryEntry } from "~/newstore/history"
import findStatusGroup from "~/helpers/findStatusGroup"

const props = defineProps<{
  show: boolean
  entry: RESTHistoryEntry
}>()

const emit = defineEmits<{
  (e: "close"): void
}>()

const t = useI18n()

const entryStatus = computed(() => {
  return findStatusGroup(props.entry.responseMeta.statusCode)
})

const duration = computed(() => {
  const d = props.entry.responseMeta.duration
  if (!d) return ""
  return d >= 1000 ? `${(d / 1000).toFixed(2)} s` : `${d} ms`
})

const displayBody = computed(() => {
  const body = props.entry.responseBody
  if (!body) return ""
  try {
    return JSON.stringify(JSON.parse(body), null, 2)
  } catch {
    return body
  }
})
</script>
