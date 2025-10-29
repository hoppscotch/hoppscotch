<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('mock_server.logs_title')"
    styles="sm:max-w-4xl"
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
            class="mb-4 border border-dividerDark rounded overflow-hidden"
          >
            <div
              class="p-3 cursor-pointer hover:bg-primaryLight/5 transition-colors duration-200"
              @click="toggleLogExpansion(log.id)"
            >
              <div class="flex justify-between items-center">
                <div class="flex items-center space-x-3">
                  <icon-lucide-chevron-right
                    class="w-4 h-4 transition-transform duration-200"
                    :class="{ 'rotate-90': isLogExpanded(log.id) }"
                  />
                  <div
                    :style="{
                      color: getMethodLabelColor(log.requestMethod),
                    }"
                    class="flex-1"
                  >
                    {{ log.requestMethod }}
                  </div>
                  <div class="text-secondaryDark truncate">
                    {{ log.requestPath }}
                  </div>

                  <div
                    v-if="log.responseStatus"
                    class="px-2 py-1 rounded text-xs font-medium"
                    :class="getStatusColor(log.responseStatus)"
                  >
                    {{ log.responseStatus }}
                  </div>
                </div>
                <div class="text-secondaryLight flex flex-1 justify-center">
                  {{ formatExecutedAt(log.executedAt) }}
                </div>
                <HoppSmartItem
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('action.delete')"
                  :icon="IconTrash"
                  class="bg-transparent hover:bg-transparent !text-red-500"
                  @click.stop="confirmRemoveLog(log.id)"
                />
              </div>
            </div>

            <div
              v-if="isLogExpanded(log.id)"
              class="border-t border-dividerDark"
            >
              <div class="py-4 px-3 text-xs flex flex-col space-y-4">
                <MockServerLogSection
                  :title="t('mock_server.request_headers')"
                  :content="log.requestHeaders"
                />

                <MockServerLogSection
                  v-if="log.requestBody"
                  :title="t('mock_server.request_body')"
                  :content="log.requestBody"
                />

                <MockServerLogSection
                  :title="t('mock_server.response_headers')"
                  :content="log.responseHeaders"
                />

                <MockServerLogSection
                  v-if="log.responseBody"
                  :title="t('mock_server.response_body')"
                  :content="log.responseBody"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end">
        <HoppButtonPrimary :label="t('action.close')" @click="close" />
      </div>
    </template>
  </HoppSmartModal>

  <HoppSmartConfirmModal
    :show="showDeleteConfirm"
    :title="t('mock_server.confirm_delete_log')"
    @hide-modal="showDeleteConfirm = false"
    @resolve="confirmDelete"
  />
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
import IconTrash from "~icons/lucide/trash"
import { getMethodLabelColor } from "~/helpers/rest/labelColoring"
import { HoppSmartItem } from "@hoppscotch/ui"

const props = defineProps<{ show: boolean; mockServerID: string }>()
const emit = defineEmits<{ (e: "close"): void }>()

const t = useI18n()
const toast = useToast()

const loading = ref(false)
const logs = ref<any[]>([])
const expandedLogs = ref<Set<string>>(new Set())
const showDeleteConfirm = ref(false)
const logToDelete = ref<string | null>(null)

const fetchLogs = async () => {
  loading.value = true
  await pipe(
    getMockServerLogs(props.mockServerID),
    TE.match(
      () => {
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

const confirmRemoveLog = (id: string) => {
  logToDelete.value = id
  showDeleteConfirm.value = true
}

const confirmDelete = async () => {
  if (logToDelete.value) {
    await pipe(
      deleteMockServerLog(logToDelete.value),
      TE.match(
        () => {
          toast.error(t("error.something_went_wrong"))
        },
        (res) => {
          if (res) {
            logs.value = logs.value.filter((l) => l.id !== logToDelete.value)
            toast.success(t("mock_server.log_deleted"))
            logToDelete.value = null
            showDeleteConfirm.value = false
          }
        }
      )
    )()
  }
}

const formatExecutedAt = (executedAt: string) => {
  return new Date(executedAt).toLocaleString()
}

const toggleLogExpansion = (id: string) => {
  if (expandedLogs.value.has(id)) {
    expandedLogs.value.delete(id)
  } else {
    expandedLogs.value.add(id)
  }
}

const isLogExpanded = (id: string) => {
  return expandedLogs.value.has(id)
}

const getStatusColor = (statusCode: number) => {
  const status = statusCode.toString()
  if (status.startsWith("2")) return "bg-green-800/20 text-green-600"
  if (status.startsWith("4")) return "bg-yellow-800/20 text-yellow-400"
  if (status.startsWith("5")) return "bg-red-800/20 text-red-400"
  return "bg-gray-600/20 text-secondaryDark"
}
</script>
