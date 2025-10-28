<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('mock_server.logs_title')"
    @close="close"
  >
    <template #body>
      <div class="p-4">
        <div v-if="loading" class="flex justify-center py-8">
          <HoppSmartSpinner />
        </div>

        <div v-else>
          <div v-if="logs.length === 0" class="text-center text-secondary">
            {{ t("mock_server.no_logs") }}
          </div>

          <div
            v-for="log in logs"
            :key="log.id"
            class="mb-4 p-3 border rounded"
          >
            <div class="flex justify-between items-start">
              <div class="font-mono text-sm text-secondaryDark">
                {{ log.requestMethod }} {{ log.requestPath }}
              </div>
              <div class="text-sm text-secondaryLight">
                {{ new Date(log.executedAt).toLocaleString() }}
              </div>
            </div>
            <div class="mt-2 text-xs text-secondaryLight">
              <div>
                <span class="font-medium"
                  >{{ t("mock_server.request_headers") }}:</span
                >
                <pre class="whitespace-pre-wrap">{{
                  prettyJSON(log.requestHeaders)
                }}</pre>
              </div>
              <div v-if="log.requestBody">
                <span class="font-medium"
                  >{{ t("mock_server.request_body") }}:</span
                >
                <pre class="whitespace-pre-wrap">{{
                  prettyJSON(log.requestBody)
                }}</pre>
              </div>
              <div class="mt-2">
                <span class="font-medium"
                  >{{ t("mock_server.response_status") }}:</span
                >
                {{ log.responseStatus }}
              </div>
              <div class="mt-1">
                <span class="font-medium"
                  >{{ t("mock_server.response_headers") }}:</span
                >
                <pre class="whitespace-pre-wrap">{{
                  prettyJSON(log.responseHeaders)
                }}</pre>
              </div>
              <div v-if="log.responseBody" class="mt-1">
                <span class="font-medium"
                  >{{ t("mock_server.response_body") }}:</span
                >
                <pre class="whitespace-pre-wrap">{{
                  prettyJSON(log.responseBody)
                }}</pre>
              </div>
            </div>
            <div class="flex justify-end mt-2">
              <HoppButtonSecondary outline @click="removeLog(log.id)">{{
                t("action.delete")
              }}</HoppButtonSecondary>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end">
        <HoppButtonSecondary @click="close">{{
          t("action.close")
        }}</HoppButtonSecondary>
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useI18n } from "~/composables/i18n"
import {
  getMockServerLogs,
  deleteMockServerLog,
} from "~/helpers/backend/queries/MockServerLogs"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { useToast } from "~/composables/toast"

const props = defineProps<{ show: boolean; mockServerID: string }>()
const emit = defineEmits<{ (e: "close"): void }>()

const t = useI18n()
const toast = useToast()

const loading = ref(false)
const logs = ref<any[]>([])

const fetchLogs = async () => {
  loading.value = true
  await pipe(
    getMockServerLogs(props.mockServerID),
    TE.match(
      (err) => {
        console.error("Failed to load logs", err)
        toast.error(t("error.something_went_wrong"))
        loading.value = false
      },
      (res) => {
        logs.value = res
        loading.value = false
      }
    )
  )()
}

onMounted(() => {
  if (props.show) fetchLogs()
})

const close = () => emit("close")

const removeLog = async (id: string) => {
  await pipe(
    deleteMockServerLog(id),
    TE.match(
      (err) => {
        console.error("Failed to delete log", err)
        toast.error(t("error.something_went_wrong"))
      },
      (res) => {
        if (res) {
          logs.value = logs.value.filter((l) => l.id !== id)
          toast.success(t("mock_server.log_deleted"))
        }
      }
    )
  )()
}

const prettyJSON = (s: string | null | undefined) => {
  try {
    if (!s) return ""
    const obj = typeof s === "string" ? JSON.parse(s) : s
    return JSON.stringify(obj, null, 2)
  } catch (e) {
    return String(s)
  }
}
</script>
