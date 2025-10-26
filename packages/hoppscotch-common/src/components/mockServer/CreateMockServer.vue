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
      <div class="flex flex-col space-y-6">
        <!-- Collection Selector or Info -->
        <div class="flex flex-col space-y-2">
          <label class="text-sm font-semibold text-secondaryDark">
            {{ t("collection.title") }}
          </label>
          <!-- Collection Selector (when no collection is pre-selected) -->
          <div v-if="!collectionID && !isExistingMockServer" class="relative">
            <tippy
              interactive
              trigger="click"
              theme="popover"
              :on-shown="() => tippyActions?.focus()"
            >
              <HoppSmartSelectWrapper>
                <input
                  class="flex flex-1 px-4 py-2 bg-transparent border rounded cursor-pointer border-divider"
                  :placeholder="t('mock_server.select_collection')"
                  :value="selectedCollectionName"
                  readonly
                />
              </HoppSmartSelectWrapper>
              <template #content="{ hide }">
                <div
                  ref="tippyActions"
                  class="flex flex-col focus:outline-none max-h-60 overflow-y-auto"
                  tabindex="0"
                  @keyup.escape="hide()"
                >
                  <div
                    v-for="option in collectionOptions"
                    :key="option.value"
                    class="flex items-center justify-between px-4 py-2 hover:bg-primaryLight cursor-pointer"
                    @click="
                      () => {
                        selectCollection(option)
                        hide()
                      }
                    "
                  >
                    <span class="truncate">{{ option.label }}</span>
                  </div>
                  <div
                    v-if="collectionOptions.length === 0"
                    class="flex items-center justify-center px-4 py-8 text-secondaryLight"
                  >
                    {{ t('empty.collections') }}
                  </div>
                </div>
              </template>
            </tippy>
          </div>
          <!-- Collection Info (when collection is pre-selected) -->
          <div v-else class="text-body text-secondary">
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
              {{ t("app.status") }}
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
                    ? t("mockServer.dashboard.active")
                    : t("mockServer.dashboard.inactive")
                }}
              </span>
            </div>
          </div>
        </div>

        <!-- New Mock Server Form -->
        <div v-else class="flex flex-col space-y-4">
          <HoppSmartInput
            v-model="mockServerName"
            :label="t('mock_server.mock_server_name')"
            input-styles="floating-input"
            :disabled="loading"
            v-focus
          />
          <div class="flex items-center space-x-4">
            <div class="w-48">
              <HoppSmartInput
                v-model="delayInMsVal"
                :label="t('mock_server.delay_ms')"
                type="number"
                input-styles="floating-input"
                :disabled="loading"
              />
            </div>

            <div class="flex items-center">
              <HoppSmartToggle :on="isPublic" @change="isPublic = !isPublic">
                {{ t("mock_server.make_public") }}
              </HoppSmartToggle>
            </div>
          </div>

          <!-- Display created server info -->
          <div v-if="createdServer" class="flex flex-col space-y-4">
            <div class="flex flex-col space-y-2">
              <label class="text-sm font-semibold text-secondaryDark">
                {{ t("mock_server.path_based_url") }}
              </label>
              <div class="flex items-center space-x-2">
                <div
                  class="flex-1 px-3 py-2 border border-divider rounded bg-primaryLight text-body font-mono"
                >
                  {{ createdServer.serverUrlPathBased }}
                </div>
                <HoppButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('action.copy')"
                  :icon="copyIcon"
                  @click="
                    copyToClipboard(createdServer.serverUrlPathBased || '')
                  "
                />
              </div>
            </div>

            <!-- Subdomain-based URL (May be null) -->
            <div
              v-if="createdServer.serverUrlDomainBased"
              class="flex flex-col space-y-2"
            >
              <label class="text-sm font-semibold text-secondaryDark">
                {{ t("mock_server.subdomain_based_url") }}
              </label>
              <div class="flex items-center space-x-2">
                <div
                  class="flex-1 px-3 py-2 border border-divider rounded bg-primaryLight text-body font-mono"
                >
                  {{ createdServer.serverUrlDomainBased }}
                </div>
                <HoppButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('action.copy')"
                  :icon="copyIcon"
                  @click="copyToClipboard(createdServer.serverUrlDomainBased)"
                />
              </div>
              <div class="text-xs text-secondaryLight">
                <span class="font-medium">{{ t("mock_server.note") }}:</span>
                {{ t("mock_server.subdomain_note") }}
              </div>
            </div>
          </div>
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

        <HoppButtonSecondary
          v-if="isExistingMockServer"
          :label="t('mock_server.view_logs')"
          @click="showLogs = true"
        />

        <!-- Create Mock Server Button for new mock server -->
        <HoppButtonPrimary
          v-else
          :label="t('mock_server.create_mock_server')"
          :loading="loading"
          :disabled="!mockServerName.trim() || !effectiveCollectionID"
          :icon="IconServer"
          @click="createMockServer"
        />

        <!-- Close button shown after server creation -->
        <HoppButtonSecondary
          v-if="showCloseButton"
          :label="t('action.close')"
          @click="closeModal"
        />
      </div>
    </template>
  </HoppSmartModal>
  <MockServerLogs
    v-if="showLogs && existingMockServer"
    :show="showLogs"
    :mockServerID="existingMockServer.id"
    @close="showLogs = false"
  />
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
import { restCollections$ } from "~/newstore/collections"
import { TippyComponent } from "vue-tippy"
import {
  createMockServer as createMockServerMutation,
  updateMockServer,
} from "~/helpers/backend/mutations/MockServer"
import { WorkspaceType } from "~/helpers/backend/graphql"
import { copyToClipboard as copyToClipboardHelper } from "~/helpers/utils/clipboard"
import { refAutoReset } from "@vueuse/core"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"

// Icons
import IconServer from "~icons/lucide/server"
import IconPlay from "~icons/lucide/play"
import IconSquare from "~icons/lucide/square"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import MockServerLogs from "~/components/mockServer/MockServerLogs.vue"

const t = useI18n()
const toast = useToast()

// Modal state
const modalData = useReadonlyStream(showCreateMockServerModal$, {
  show: false,
  collectionID: undefined,
  collectionName: undefined,
})

const mockServers = useReadonlyStream(mockServers$, [])
const collections = useReadonlyStream(restCollections$, [])

// Component state
const mockServerName = ref("")
const loading = ref(false)
const showCloseButton = ref(false)
const createdServer = ref<any>(null)
const delayInMsVal = ref<string>("0")
const isPublic = ref<boolean>(true)
const showLogs = ref(false)
const selectedCollectionID = ref("")
const selectedCollectionName = ref("")
const tippyActions = ref<TippyComponent | null>(null)

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

// Collection options for the selector
const collectionOptions = computed(() => {
  const flattenCollections = (collections: any[], prefix = ""): any[] => {
    const result: any[] = []
    
    collections.forEach((collection) => {
      const displayName = prefix ? `${prefix} / ${collection.name}` : collection.name
      result.push({
        label: displayName,
        value: collection.id || collection._ref_id,
        collection: collection
      })
      
      // Add folders as nested options
      if (collection.folders && collection.folders.length > 0) {
        result.push(...flattenCollections(collection.folders, displayName))
      }
    })
    
    return result
  }
  
  return flattenCollections(collections.value)
})

// Get the effective collection ID (either pre-selected or user-selected)
const effectiveCollectionID = computed(() => {
  return collectionID.value || selectedCollectionID.value
})

// Collection selection handler
const selectCollection = (option: any) => {
  selectedCollectionID.value = option.value
  selectedCollectionName.value = option.label
}

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
    delayInMsVal.value = "0"
    isPublic.value = true
    selectedCollectionID.value = ""
    selectedCollectionName.value = ""
    showCloseButton.value = false
    createdServer.value = null
  }
})

// Create new mock server
const createMockServer = async () => {
  if (!mockServerName.value.trim() || !effectiveCollectionID.value) {
    if (!effectiveCollectionID.value) {
      toast.error(t("mock_server.select_collection_error"))
    }
    return
  }

  loading.value = true

  await pipe(
    createMockServerMutation(
      mockServerName.value.trim(),
      effectiveCollectionID.value,
      WorkspaceType.User, // workspaceType
      undefined, // workspaceID (will use current user)
      Number(delayInMsVal.value) || 0, // delayInMs
      Boolean(isPublic.value) // isPublic
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

        // Store the created server data and show close button
        createdServer.value = result
        showCloseButton.value = true

        loading.value = false
        // Don't close the modal automatically
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
