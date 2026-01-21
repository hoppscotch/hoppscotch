<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('mock_server.create_mock_server')"
    @close="closeModal"
  >
    <template #body>
      <div class="flex flex-col space-y-6">
        <!-- Collection Selection Mode (hidden after server is created) -->
        <div v-if="!createdServer" class="flex flex-col space-y-2">
          <label class="text-sm font-semibold text-secondaryDark">
            {{ t("collection.title") }}
          </label>

          <div class="flex flex-col space-y-4">
            <!-- Radio buttons for collection selection mode -->
            <div class="flex space-x-6">
              <label class="flex items-center space-x-2 cursor-pointer">
                <input
                  v-model="collectionSelectionMode"
                  type="radio"
                  value="existing"
                  class="w-4 h-4 text-accent border-divider focus:ring-accent"
                />
                <span class="text-body text-secondary">
                  {{ t("mock_server.existing_collection") }}
                </span>
              </label>
              <label class="flex items-center space-x-2 cursor-pointer">
                <input
                  v-model="collectionSelectionMode"
                  type="radio"
                  value="new"
                  class="w-4 h-4 text-accent border-divider focus:ring-accent"
                />
                <span class="text-body text-secondary">
                  {{ t("mock_server.new_collection") }}
                </span>
              </label>
            </div>

            <!-- Collection dropdown (shown for existing collection mode) -->
            <div v-if="collectionSelectionMode === 'existing'" class="flex">
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
                      selectedCollectionName ||
                      t('mock_server.select_collection')
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
                        :active-info-icon="
                          selectedCollectionID === option.value
                        "
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
          </div>
        </div>

        <!-- Show selected collection name after server is created -->
        <div v-else class="flex flex-col space-y-2">
          <label class="text-sm font-semibold text-secondaryDark">
            {{ t("collection.title") }}
          </label>
          <div class="text-body text-secondary">
            {{ selectedCollectionName }}
          </div>
        </div>

        <!-- Mock Server Form (Before Creation) -->
        <div v-if="!createdServer" class="flex flex-col gap-6">
          <div>
            <HoppSmartInput
              v-model="mockServerName"
              v-focus
              :label="t('mock_server.mock_server_name')"
              input-styles="floating-input"
              :disabled="loading"
            />
            <!-- Hint for new collection mode -->
            <div
              v-if="collectionSelectionMode === 'new'"
              class="w-full text-xs text-secondaryLight mt-3"
            >
              {{ t("mock_server.new_collection_name_hint") }}
            </div>
          </div>

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
            {{ t("mock_server.private_access_instruction") }}
            <HoppSmartAnchor
              class="link"
              to="/profile/tokens"
              blank
              :icon="IconExternalLink"
              :label="t('mock_server.create_token_here')"
              reverse
            />
          </div>

          <!-- Set in Environment Toggle -->
          <div class="flex flex-col space-y-2">
            <div class="flex items-center">
              <HoppSmartToggle
                :on="setInEnvironment"
                @change="setInEnvironment = !setInEnvironment"
              >
                {{ t("mock_server.set_in_environment") }}
              </HoppSmartToggle>
            </div>
            <div
              v-if="setInEnvironment"
              class="w-full text-xs text-secondaryLight"
            >
              {{ t("mock_server.set_in_environment_hint") }}
            </div>
          </div>

          <!-- Auto-create Request Example Toggle (only for new collection mode) -->
          <div
            v-if="collectionSelectionMode === 'new'"
            class="flex flex-col space-y-2"
          >
            <div class="flex items-center">
              <HoppSmartToggle
                :on="autoCreateRequestExample"
                @change="autoCreateRequestExample = !autoCreateRequestExample"
              >
                {{ t("mock_server.add_example_request") }}
              </HoppSmartToggle>
            </div>
            <div
              v-if="autoCreateRequestExample"
              class="w-full text-xs text-secondaryLight"
            >
              {{ t("mock_server.add_example_request_hint") }}
            </div>
          </div>
        </div>

        <!-- Mock Server Created Info (After Creation) -->
        <div v-else class="flex flex-col space-y-4">
          <div class="flex flex-col space-y-2">
            <label class="text-sm font-semibold text-secondaryDark">
              {{ t("mock_server.mock_server_name") }}
            </label>
            <div class="text-body text-secondary">
              {{ createdServer.name }}
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
                  createdServer.isActive
                    ? 'bg-green-600/20 text-green-500 border border-green-600/30'
                    : 'text-secondary border border-secondaryLight'
                "
              >
                <span
                  class="w-2 h-2 rounded-full mr-2"
                  :class="
                    createdServer.isActive
                      ? 'bg-green-400'
                      : 'bg-secondaryLight'
                  "
                ></span>
                {{
                  createdServer.isActive
                    ? t("mockServer.dashboard.active")
                    : t("mockServer.dashboard.inactive")
                }}
              </span>
            </div>
          </div>

          <MockServerCreatedInfo :mock-server="createdServer" />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end space-x-2">
        <!-- Start/Stop Server Button (after creation) -->
        <HoppButtonPrimary
          v-if="createdServer"
          :label="
            createdServer.isActive
              ? t('mock_server.stop_server')
              : t('mock_server.start_server')
          "
          :loading="loading"
          :icon="createdServer.isActive ? IconSquare : IconPlay"
          @click="handleToggleMockServer"
        />

        <!-- Create Mock Server Button (before creation) -->
        <HoppButtonPrimary
          v-else
          :label="t('mock_server.create_mock_server')"
          :loading="loading"
          :disabled="
            !mockServerName.trim() ||
            (!effectiveCollectionID && collectionSelectionMode === 'existing')
          "
          :icon="IconServer"
          @click="handleCreateMockServer"
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
import { computed, ref, watch } from "vue"
import { TippyComponent } from "vue-tippy"
import { MockServer } from "~/helpers/backend/graphql"
import { showCreateMockServerModal$ } from "~/newstore/mockServers"
import { useMockServer } from "~/composables/useMockServer"
import MockServerCreatedInfo from "~/components/mockServer/MockServerCreatedInfo.vue"

// Icons
import IconCheck from "~icons/lucide/check"
import IconPlay from "~icons/lucide/play"
import IconServer from "~icons/lucide/server"
import IconSquare from "~icons/lucide/square"
import IconExternalLink from "~icons/lucide/external-link"

const t = useI18n()
const toast = useToast()

// Use the composable for shared logic
const {
  mockServers,
  availableCollections,
  createMockServer,
  toggleMockServer,
} = useMockServer()

// Modal state
const modalData = useReadonlyStream(showCreateMockServerModal$, {
  show: false,
  collectionID: undefined,
  collectionName: undefined,
})

// Component state
const mockServerName = ref("")
const loading = ref(false)
const createdServer = ref<MockServer | null>(null)
const delayInMsVal = ref<string>("0")
const isPublic = ref<boolean>(true)
const setInEnvironment = ref<boolean>(true)
const autoCreateRequestExample = ref<boolean>(true)
const selectedCollectionID = ref("")
const selectedCollectionName = ref("")
const tippyActions = ref<TippyComponent | null>(null)
const collectionSelectionMode = ref<"new" | "existing">("existing")

// Props computed from modal data
// This modal only shows when collectionID is NOT provided (from dashboard "New" button)
const show = computed(
  () => modalData.value.show && !modalData.value.collectionID
)

// Collection options for the selector (only root collections)
const collectionOptions = computed(() => {
  return availableCollections.value.map((collection: any) => {
    const collectionId = collection.id ?? collection._ref_id
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

// Get the effective collection ID (user-selected)
const effectiveCollectionID = computed(() => {
  return selectedCollectionID.value
})

// Get collection name
const collectionName = computed(() => {
  if (selectedCollectionName.value) return selectedCollectionName.value
  // When creating new collection, use the mock server name as collection name
  if (collectionSelectionMode.value === "new") return mockServerName.value
  return "Unknown Collection"
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

// Create new mock server
const handleCreateMockServer = async () => {
  // Validate mock server name first
  if (!mockServerName.value.trim()) {
    toast.error(t("mock_server.provide_mock_server_name"))
    return
  }

  // For existing collection mode, validate that a collection is selected
  if (
    collectionSelectionMode.value === "existing" &&
    !effectiveCollectionID.value
  ) {
    toast.error(t("mock_server.select_collection_error"))
    return
  }

  // Start loading
  loading.value = true

  // Determine if we should auto-create a collection
  const isNewCollectionMode = collectionSelectionMode.value === "new"

  // Now create the mock server
  const result = await createMockServer({
    mockServerName: mockServerName.value,
    collectionID: isNewCollectionMode ? undefined : effectiveCollectionID.value,
    autoCreateCollection: isNewCollectionMode ? true : undefined,
    autoCreateRequestExample:
      isNewCollectionMode && autoCreateRequestExample.value ? true : undefined,
    delayInMs: Number(delayInMsVal.value) || 0,
    isPublic: isPublic.value,
    setInEnvironment: setInEnvironment.value,
    collectionName: collectionName.value,
  })

  loading.value = false

  if (result.success && result.server) {
    createdServer.value = result.server

    // Update the selected collection info from the created server
    if (result.server.collection) {
      selectedCollectionID.value = result.server.collection.id
      selectedCollectionName.value = result.server.collection.title
    }
  }
}

// Toggle mock server active state
const handleToggleMockServer = async () => {
  if (!createdServer.value) return

  loading.value = true
  const result = await toggleMockServer(createdServer.value as any)
  loading.value = false

  // Update the local `createdServer` state with the toggled state
  if (result.success && createdServer.value) {
    createdServer.value = {
      ...createdServer.value,
      isActive: !createdServer.value.isActive,
    }
  }
}

// Close modal
const closeModal = () => {
  showCreateMockServerModal$.next({
    show: false,
    collectionID: undefined,
    collectionName: undefined,
  })
}

// Reset form when modal opens/closes
watch(show, (newShow) => {
  if (newShow) {
    mockServerName.value = ""
    loading.value = false
    delayInMsVal.value = "0"
    isPublic.value = true
    autoCreateRequestExample.value = true
    setInEnvironment.value = true
    selectedCollectionID.value = ""
    selectedCollectionName.value = ""
    createdServer.value = null
    collectionSelectionMode.value = "existing"
  }
})
</script>
