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
          <div v-if="!collectionID && !isExistingMockServer" class="flex">
            <tippy
              interactive
              trigger="click"
              theme="popover"
              :on-shown="() => tippyActions?.focus()"
            >
              <HoppSmartSelectWrapper>
                <HoppButtonSecondary
                  class="flex flex-1 !justify-start rounded-none pr-8"
                  :label="
                    selectedCollectionName || t('mock_server.select_collection')
                  "
                  outline
                />
              </HoppSmartSelectWrapper>
              <template #content="{ hide }">
                <div
                  ref="tippyActions"
                  class="flex flex-col focus:outline-none"
                  tabindex="0"
                  @keyup.escape="hide()"
                >
                  <HoppSmartLink
                    v-for="option in collectionOptions"
                    :key="option.value"
                    class="flex flex-1"
                    :class="{
                      'opacity-50 cursor-not-allowed': option.disabled,
                    }"
                    @click="
                      () => {
                        if (!option.disabled) {
                          selectCollection(option)
                          hide()
                        }
                      }
                    "
                  >
                    <HoppSmartItem
                      :label="option.label"
                      :active-info-icon="selectedCollectionID === option.value"
                      :info-icon="
                        selectedCollectionID === option.value
                          ? IconCheck
                          : option.hasMockServer
                            ? IconServer
                            : null
                      "
                      :disabled="option.disabled"
                    />
                  </HoppSmartLink>
                  <div
                    v-if="collectionOptions.length === 0"
                    class="flex items-center justify-center px-4 py-8 text-secondaryLight"
                  >
                    {{ t("empty.collections") }}
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
                class="flex-1 px-3 py-2 border border-divider rounded bg-primaryLight"
              >
                {{
                  existingMockServer?.serverUrlPathBased ||
                  existingMockServer?.serverUrlDomainBased ||
                  ""
                }}
              </div>
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.copy')"
                :icon="copyIcon"
                @click="
                  copyToClipboard(
                    existingMockServer?.serverUrlPathBased ||
                      existingMockServer?.serverUrlDomainBased ||
                      ''
                  )
                "
              />
            </div>
          </div>

          <div class="flex flex-col space-y-2">
            <label class="text-sm font-semibold text-secondaryDark">
              {{ t("app.status") }}
            </label>
            <div class="flex items-center space-x-2">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                :class="
                  existingMockServer?.isActive
                    ? 'bg-green-600/20 text-green-500 border border-green-600/30'
                    : 'text-secondary border border-secondaryLight'
                "
              >
                <span
                  class="w-2 h-2 rounded-full mr-2"
                  :class="
                    existingMockServer?.isActive
                      ? 'bg-green-400'
                      : 'bg-secondaryLight'
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
        <div v-else class="flex flex-col space-y-6">
          <HoppSmartInput
            v-model="mockServerName"
            v-focus
            :label="t('mock_server.mock_server_name')"
            input-styles="floating-input"
            :disabled="loading"
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
          <!-- Hint for private mock servers -->
          <div v-if="!isPublic" class="w-full mt-2 text-xs text-secondaryLight">
            {{ t("mock_server.private_access_hint") }}
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
        <div
          class="py-4 px-3 bg-primaryLight rounded-md border border-dividerLight shadow-sm"
        >
          <p class="text-secondary flex space-x-2 items-start">
            <Icon-lucide-info class="svg-icons text-accent" />
            <span>
              {{ t("mock_server.description") }}
            </span>
          </p>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end space-x-2">
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
          :disabled="!mockServerName.trim() || !effectiveCollectionID"
          :icon="IconServer"
          @click="createMockServer"
        />

        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          @click="closeModal"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { useToast } from "@composables/toast"
import { refAutoReset } from "@vueuse/core"
import { useService } from "dioc/vue"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { computed, ref, watch } from "vue"
import { TippyComponent } from "vue-tippy"
import { MockServer, WorkspaceType } from "~/helpers/backend/graphql"
import {
  createMockServer as createMockServerMutation,
  updateMockServer,
} from "~/helpers/backend/mutations/MockServer"
import { copyToClipboard as copyToClipboardHelper } from "~/helpers/utils/clipboard"
import { restCollections$ } from "~/newstore/collections"
import {
  addMockServer,
  mockServers$,
  showCreateMockServerModal$,
  updateMockServer as updateMockServerInStore,
} from "~/newstore/mockServers"
import { TeamCollectionsService } from "~/services/team-collection.service"
import { WorkspaceService } from "~/services/workspace.service"

// Icons
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"
import IconPlay from "~icons/lucide/play"
import IconServer from "~icons/lucide/server"
import IconSquare from "~icons/lucide/square"

const t = useI18n()
const toast = useToast()
const workspaceService = useService(WorkspaceService)
const teamCollectionsService = useService(TeamCollectionsService)

// Modal state
const modalData = useReadonlyStream(showCreateMockServerModal$, {
  show: false,
  collectionID: undefined,
  collectionName: undefined,
})

const mockServers = useReadonlyStream(mockServers$, [])
const collections = useReadonlyStream(restCollections$, [])
const currentWorkspace = computed(() => workspaceService.currentWorkspace.value)

// Get collections based on current workspace
const availableCollections = computed(() => {
  if (currentWorkspace.value.type === "team" && currentWorkspace.value.teamID) {
    return teamCollectionsService.collections.value || []
  }
  return collections.value
})

// Component state
const mockServerName = ref("")
const loading = ref(false)
const showCloseButton = ref(false)
const createdServer = ref<MockServer | null>(null)
const delayInMsVal = ref<string>("0")
const isPublic = ref<boolean>(true)
const selectedCollectionID = ref("")
const selectedCollectionName = ref("")
const tippyActions = ref<TippyComponent | null>(null)

// Props computed from modal data
const show = computed(() => modalData.value.show)
const collectionID = computed(() => modalData.value.collectionID)
const collectionName = computed(() => {
  // Prefer name provided by modalData (pre-selected from caller)
  if (modalData.value.collectionName) return modalData.value.collectionName

  // If user selected a collection inside the modal, use that
  if (selectedCollectionName.value) return selectedCollectionName.value

  // Try finding the collection from availableCollections using effectiveCollectionID
  const id = effectiveCollectionID.value
  if (!id) return "Unknown Collection"

  const coll = availableCollections.value.find((c: any) => (c as any).id === id)
  return (coll as any)?.name || (coll as any)?.title || "Unknown Collection"
})

// Find existing mock server for the effective collection (pre-selected or user-selected)
const existingMockServer = computed(() => {
  const collId = effectiveCollectionID.value
  if (!collId) return null
  return mockServers.value.find((server) => server.collectionID === collId)
})

const isExistingMockServer = computed(() => !!existingMockServer.value)

// Collection options for the selector (only root collections)
const collectionOptions = computed(() => {
  return availableCollections.value.map((collection) => {
    const collectionId =
      currentWorkspace.value.type === "team"
        ? collection.id
        : (collection.id ?? collection._ref_id) // TODO: fix this fallback logic for personal workspaces in the future
    const hasMockServer = mockServers.value.some(
      (server) => server.collectionID === collectionId
    )

    return {
      label: collection.name || collection.title,
      value: collectionId,
      collection: collection,
      hasMockServer: hasMockServer,
      disabled: hasMockServer,
    }
  })
})

// Get the effective collection ID (either pre-selected or user-selected)
const effectiveCollectionID = computed(() => {
  return collectionID.value || selectedCollectionID.value
})

// Collection selection handler
const selectCollection = (option: any) => {
  // Prevent selection of collections that already have mock servers
  if (option.disabled || option.hasMockServer) {
    return
  }

  selectedCollectionID.value = option.value
  selectedCollectionName.value = option.label
}

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

  // Determine workspace type and ID based on current workspace
  const workspaceType =
    currentWorkspace.value.type === "team"
      ? WorkspaceType.Team
      : WorkspaceType.User
  const workspaceID =
    currentWorkspace.value.type === "team"
      ? currentWorkspace.value.teamID
      : undefined

  await pipe(
    createMockServerMutation(
      mockServerName.value.trim(),
      effectiveCollectionID.value,
      workspaceType,
      workspaceID,
      Number(delayInMsVal.value) || 0, // delayInMs
      Boolean(isPublic.value) // isPublic
    ),
    TE.match(
      (error) => {
        // `error` here is the message string produced by the mutation helper.
        // Show the backend-provided error message if available, otherwise fallback to generic
        toast.error(String(error) || t("error.something_went_wrong"))
        loading.value = false
      },
      (result) => {
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
      () => {
        toast.error(t("error.something_went_wrong"))
        loading.value = false
      },
      () => {
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

// Close modal function
const closeModal = () => {
  showCreateMockServerModal$.next({
    show: false,
    collectionID: undefined,
    collectionName: undefined,
  })
}
</script>
