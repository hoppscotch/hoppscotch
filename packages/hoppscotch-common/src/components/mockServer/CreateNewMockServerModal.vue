<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('mock_server.create_mock_server')"
    @close="closeModal"
  >
    <template #body>
      <div class="flex flex-col space-y-6">
        <!-- Collection Selection Mode -->
        <div class="flex flex-col space-y-2">
          <label class="text-sm font-semibold text-secondaryDark">
            {{ t("collection.title") }}
          </label>

          <div class="flex flex-col space-y-4">
            <!-- Radio buttons for collection selection mode -->
            <div class="flex space-x-6">
              <label class="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  v-model="collectionSelectionMode"
                  value="existing"
                  class="w-4 h-4 text-accent border-divider focus:ring-accent"
                />
                <span class="text-body text-secondary">
                  {{ t("mock_server.existing_collection") }}
                </span>
              </label>
              <label class="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  v-model="collectionSelectionMode"
                  value="new"
                  class="w-4 h-4 text-accent border-divider focus:ring-accent"
                />
                <span class="text-body text-secondary">
                  {{ t("mock_server.new_collection") }}
                </span>
              </label>
            </div>

            <!-- Hint for new collection mode -->
            <div
              v-if="collectionSelectionMode === 'new'"
              class="w-full text-xs text-secondaryLight"
            >
              {{ t("mock_server.new_collection_name_hint") }}
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

        <!-- Mock Server Form -->
        <div class="flex flex-col space-y-6">
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

          <!-- Create Example Collection Toggle (only when "new collection" is selected) -->
          <div
            v-if="collectionSelectionMode === 'new'"
            class="flex flex-col space-y-2"
          >
            <div class="flex items-center">
              <HoppSmartToggle
                :on="createExampleCollection"
                @change="createExampleCollection = !createExampleCollection"
              >
                {{ t("mock_server.create_example_collection") }}
              </HoppSmartToggle>
            </div>
            <div
              v-if="createExampleCollection"
              class="w-full text-xs text-secondaryLight"
            >
              {{ t("mock_server.create_example_collection_hint") }}
            </div>
          </div>

          <MockServerCreatedInfo :mock-server="createdServer" />
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end space-x-2">
        <!-- Create Mock Server Button -->
        <HoppButtonPrimary
          :label="t('mock_server.create_mock_server')"
          :loading="loading"
          :disabled="
            !mockServerName.trim() ||
            (!effectiveCollectionID &&
              collectionSelectionMode === 'existing') ||
            (collectionSelectionMode === 'new' && !createExampleCollection)
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
import IconServer from "~icons/lucide/server"

const t = useI18n()
const toast = useToast()

// Use the composable for shared logic
const {
  mockServers,
  availableCollections,
  createMockServer,
  createExampleCollectionAndGetID,
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
const createExampleCollection = ref<boolean>(false)
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
  // If "new collection" mode is selected, create example collection (if toggle is enabled)
  let collectionIDToUse = effectiveCollectionID.value

  if (collectionSelectionMode.value === "new") {
    if (createExampleCollection.value) {
      loading.value = true
      toast.info(t("mock_server.creating_example_collection"))

      try {
        collectionIDToUse = await createExampleCollectionAndGetID()

        // Update the selected collection
        selectedCollectionID.value = collectionIDToUse
        selectedCollectionName.value = mockServerName.value
      } catch (error) {
        console.error("Failed to create example collection:", error)
        toast.error(t("mock_server.failed_to_create_collection"))
        loading.value = false
        return
      }
    } else {
      // If new collection mode but example collection is not enabled
      toast.error(t("mock_server.enable_example_collection_hint"))
      return
    }
  }

  if (!mockServerName.value.trim() || !collectionIDToUse) {
    return
  }

  loading.value = true

  const result = await createMockServer({
    mockServerName: mockServerName.value,
    collectionID: collectionIDToUse,
    delayInMs: Number(delayInMsVal.value) || 0,
    isPublic: isPublic.value,
    setInEnvironment: setInEnvironment.value,
    collectionName: collectionName.value,
  })

  loading.value = false

  if (result.success && result.server) {
    createdServer.value = result.server
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
    setInEnvironment.value = true
    createExampleCollection.value = false
    selectedCollectionID.value = ""
    selectedCollectionName.value = ""
    createdServer.value = null
    collectionSelectionMode.value = "existing"
  }
})

// Auto-enable example collection toggle when switching to "new" mode
watch(collectionSelectionMode, (newMode) => {
  if (newMode === "new") {
    createExampleCollection.value = true
  }
})
</script>
