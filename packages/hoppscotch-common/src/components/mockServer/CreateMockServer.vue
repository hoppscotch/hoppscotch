<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="
      isExistingMockServer
        ? t('mock_server.mock_server_configuration')
        : t('mock_server.create_mock_server')
    "
    @close="closeModal"
  >
    <template #body>
      <div class="flex flex-col space-y-6 p-6">
        <!-- Collection Info -->
        <div class="flex flex-col space-y-2">
          <label class="text-sm font-semibold text-secondaryDark">
            {{ t("collection.title") }}
          </label>
          <div class="text-body text-secondary">
            {{ collectionName }}
          </div>
        </div>

        <!-- Existing Mock Server Info -->
        <div v-if="isExistingMockServer" class="flex flex-col space-y-4">
          <div class="flex flex-col space-y-2">
            <label class="text-sm font-semibold text-secondaryDark">
              {{ t("mock_server.mock_server_name") }}
            </label>
            <div class="text-body text-secondary">
              {{ existingMockServer?.name }}
            </div>
          </div>

          <div class="flex flex-col space-y-2">
            <label class="text-sm font-semibold text-secondaryDark">
              {{ t("mock_server.base_url") }}
            </label>
            <div class="flex items-center space-x-2">
              <div
                class="flex-1 px-3 py-2 border border-divider rounded bg-primaryLight text-body font-mono"
              >
                {{ mockServerBaseUrl }}
              </div>
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.copy')"
                :icon="copyIcon"
                @click="copyToClipboard(mockServerBaseUrl)"
              />
            </div>
          </div>

          <div class="flex flex-col space-y-2">
            <label class="text-sm font-semibold text-secondaryDark">
              {{ t("state.status") }}
            </label>
            <div class="flex items-center space-x-2">
              <span
                class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                :class="
                  existingMockServer?.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                "
              >
                <span
                  class="w-2 h-2 rounded-full mr-2"
                  :class="
                    existingMockServer?.isActive
                      ? 'bg-green-400'
                      : 'bg-gray-400'
                  "
                ></span>
                {{
                  existingMockServer?.isActive
                    ? t("state.active")
                    : t("state.inactive")
                }}
              </span>
            </div>
          </div>
        </div>

        <!-- New Mock Server Form -->
        <div v-else class="flex flex-col space-y-4">
          <HoppSmartInput
            v-model="mockServerName"
            :placeholder="t('mock_server.mock_server_name_placeholder')"
            :label="t('mock_server.mock_server_name')"
            input-styles="floating-input"
            :disabled="loading"
          />
        </div>

        <!-- Help Text -->
        <div class="p-4 bg-primaryLight rounded-md border border-dividerLight">
          <p class="text-sm text-secondary">
            <Icon-lucide-info class="inline w-4 h-4 mr-2 text-accent" />
            {{ t("mock_server.description") }}
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end space-x-2">
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          @click="closeModal"
        />

        <!-- Start/Stop Server Button for existing mock server -->
        <HoppButtonPrimary
          v-if="isExistingMockServer"
          :label="
            existingMockServer?.isActive
              ? t('mock_server.stop_server')
              : t('mock_server.start_server')
          "
          :loading="loading"
          :icon="existingMockServer?.isActive ? IconSquare : IconPlay"
          @click="toggleMockServer"
        />

        <!-- Create Mock Server Button for new mock server -->
        <HoppButtonPrimary
          v-else
          :label="t('mock_server.create_mock_server')"
          :loading="loading"
          :disabled="!mockServerName.trim()"
          :icon="IconServer"
          @click="createMockServer"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { useReadonlyStream } from "@composables/stream"
import {
  showCreateMockServerModal$,
  mockServers$,
  addMockServer,
  updateMockServer as updateMockServerInStore,
} from "~/newstore/mockServers"
import {
  createMockServer as createMockServerMutation,
  updateMockServer,
} from "~/helpers/backend/mutations/MockServer"
import { getMyMockServers } from "~/helpers/backend/queries/MockServer"
import { copyToClipboard as copyToClipboardHelper } from "~/helpers/utils/clipboard"
import { refAutoReset } from "@vueuse/core"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import * as E from "fp-ts/Either"

// Icons
import IconServer from "~icons/lucide/server"
import IconPlay from "~icons/lucide/play"
import IconSquare from "~icons/lucide/square"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"

const t = useI18n()
const toast = useToast()

// Modal state
const modalData = useReadonlyStream(showCreateMockServerModal$, {
  show: false,
  collectionID: undefined,
  collectionName: undefined,
})

const mockServers = useReadonlyStream(mockServers$, [])

// Component state
const mockServerName = ref("")
const loading = ref(false)

// Props computed from modal data
const show = computed(() => modalData.value.show)
const collectionID = computed(() => modalData.value.collectionID)
const collectionName = computed(
  () => modalData.value.collectionName || "Unknown Collection"
)

// Find existing mock server for this collection
const existingMockServer = computed(() => {
  if (!collectionID.value) return null
  return mockServers.value.find(
    (server) => server.collectionID === collectionID.value
  )
})

const isExistingMockServer = computed(() => !!existingMockServer.value)

// Mock server base URL construction
const mockServerBaseUrl = computed(() => {
  if (!existingMockServer.value) return ""

  // Extract host and port from backend API URL
  const backendApiUrl =
    import.meta.env.VITE_BACKEND_API_URL || "http://localhost:3170"
  const url = new URL(backendApiUrl)
  const protocol = url.protocol
  const port = url.port ? `:${url.port}` : ""

  // Create subdomain URL: mock-1234.localhost:3170
  return `${protocol}//${existingMockServer.value.subdomain}.${url.hostname}${port}`
})

// Copy functionality
const copyIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const copyToClipboard = (text: string) => {
  copyToClipboardHelper(text)
  copyIcon.value = IconCheck
  toast.success(t("state.copied_to_clipboard"))
}

// Reset form when modal opens/closes
watch(show, (newShow) => {
  if (newShow) {
    mockServerName.value = ""
    loading.value = false
  }
})

// Create new mock server
const createMockServer = async () => {
  if (!mockServerName.value.trim() || !collectionID.value) return

  loading.value = true

  await pipe(
    createMockServerMutation(
      mockServerName.value.trim(),
      collectionID.value,
      "USER", // workspaceType
      undefined, // workspaceID (will use current user)
      0, // delayInMs
      true // isPublic
    ),
    TE.match(
      (error) => {
        console.error("Failed to create mock server:", error)
        toast.error(t("error.something_went_wrong"))
        loading.value = false
      },
      (result) => {
        console.log("Mock server created:", result)
        toast.success(t("mock_server.mock_server_created"))

        // Add the new mock server to the store
        addMockServer(result)

        loading.value = false
        closeModal()
      }
    )
  )()
}

// Toggle mock server active state
const toggleMockServer = async () => {
  if (!existingMockServer.value) return

  loading.value = true
  const newActiveState = !existingMockServer.value.isActive

  await pipe(
    updateMockServer(existingMockServer.value.id, { isActive: newActiveState }),
    TE.match(
      (error) => {
        console.error("Failed to update mock server:", error)
        toast.error(t("error.something_went_wrong"))
        loading.value = false
      },
      (result) => {
        console.log("Mock server updated:", result)
        toast.success(
          newActiveState
            ? t("mock_server.mock_server_started")
            : t("mock_server.mock_server_stopped")
        )

        // Update the mock server in the store
        updateMockServerInStore(existingMockServer.value!.id, {
          isActive: newActiveState,
        })

        loading.value = false
      }
    )
  )()
}

// Watch for modal close and emit event
watch(show, (newShow) => {
  if (!newShow) {
    // Close modal by updating the store
    showCreateMockServerModal$.next({
      show: false,
      collectionID: undefined,
      collectionName: undefined,
    })
  }
})

// Close modal function
const closeModal = () => {
  showCreateMockServerModal$.next({
    show: false,
    collectionID: undefined,
    collectionName: undefined,
  })
}
</script>
