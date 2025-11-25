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

        <!-- Mock Server Form -->
        <div class="flex flex-col gap-6">
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
import * as E from "fp-ts/Either"
import { platform } from "~/platform"
import { MockServer, ReqType } from "~/helpers/backend/graphql"
import { showCreateMockServerModal$ } from "~/newstore/mockServers"
import { useMockServer } from "~/composables/useMockServer"
import MockServerCreatedInfo from "~/components/mockServer/MockServerCreatedInfo.vue"
import { useService } from "dioc/vue"
import { WorkspaceService } from "~/services/workspace.service"
import { TeamCollectionsService } from "~/services/team-collection.service"
import {
  restCollections$,
  appendRESTCollections,
  setRESTCollections,
} from "~/newstore/collections"
import { hoppRESTImporter } from "~/helpers/import-export/import/importers"
import { importJSONToTeam } from "~/helpers/backend/mutations/TeamCollection"
import {
  importUserCollectionsFromJSON,
  fetchAndConvertUserCollections,
} from "~/helpers/backend/mutations/UserCollection"
import exampleCollectionJSON from "../../../assets/data/api-mock-example.json"

// Icons
import IconCheck from "~icons/lucide/check"
import IconServer from "~icons/lucide/server"

const t = useI18n()
const toast = useToast()

// Use the composable for shared logic
const { mockServers, availableCollections, createMockServer } = useMockServer()

// Services
const workspaceService = useService(WorkspaceService)
const teamCollectionsService = useService(TeamCollectionsService)

// Get current user for personal workspace import
const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

// Get collections
const collections = useReadonlyStream(restCollections$, [])

// Current workspace
const currentWorkspace = computed(() => workspaceService.currentWorkspace.value)

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

// Helper function to transform collection for team format
function translateToTeamCollectionFormat(x: any) {
  const folders: any[] = (x.folders ?? []).map(translateToTeamCollectionFormat)

  const data = {
    auth: x.auth,
    headers: x.headers,
    variables: x.variables,
  }

  const obj = {
    ...x,
    folders,
    data,
  }

  if (x.id) obj.id = x.id

  return obj
}

// Helper function to transform collection for personal format
function translateToPersonalCollectionFormat(x: any) {
  const folders: any[] = (x.folders ?? []).map(
    translateToPersonalCollectionFormat
  )

  const data = {
    auth: x.auth,
    headers: x.headers,
    variables: x.variables,
  }

  const obj = {
    ...x,
    folders,
    data,
  }

  if (x.id) obj.id = x.id

  return obj
}

// Function to create an example collection and return its ID and name
const createExampleCollectionAndGetID = async (): Promise<{
  id: string
  name: string
}> => {
  const workspaceType = currentWorkspace.value.type

  // Parse the example collection JSON using hoppRESTImporter
  const parseResult = await hoppRESTImporter([
    JSON.stringify(exampleCollectionJSON),
  ])()

  if (E.isLeft(parseResult)) {
    throw new Error("Failed to parse example collection")
  }

  const collectionsData = parseResult.right

  if (workspaceType === "personal") {
    // For personal workspace, use the same import logic as ImportExport.vue
    const currentUserValue = currentUser.value

    if (currentUserValue) {
      // User is logged in, try to import to backend first
      try {
        // Get existing collection IDs before import
        const existingCollectionIDs = new Set(
          availableCollections.value.map((col: any) => col.id ?? col._ref_id)
        )

        const transformedCollection = collectionsData.map((collection) =>
          translateToPersonalCollectionFormat(collection)
        )

        await importUserCollectionsFromJSON(
          JSON.stringify(transformedCollection),
          ReqType.Rest
        )

        // Fetch the updated collections from backend
        const updatedCollections = await fetchAndConvertUserCollections(
          ReqType.Rest
        )

        if (E.isRight(updatedCollections)) {
          setRESTCollections(updatedCollections.right)

          // Find the newly created collection by comparing IDs
          const newCollection = updatedCollections.right.find((col) => {
            const colId = col.id ?? col._ref_id
            return colId && !existingCollectionIDs.has(colId)
          })

          if (newCollection) {
            return {
              id: newCollection.id ?? newCollection._ref_id ?? "",
              name: newCollection.name || "Unknown Collection",
            }
          }

          // Fallback: return the last collection if we can't find a new one
          const lastCollection =
            updatedCollections.right[updatedCollections.right.length - 1]
          return {
            id: lastCollection.id ?? lastCollection._ref_id ?? "",
            name: lastCollection.name || "Unknown Collection",
          }
        }
      } catch (error) {
        console.error("Backend import failed, falling back to local:", error)
      }
    }

    // Fallback: append to local storage
    // Get existing collection IDs before import
    const existingCollectionIDs = new Set(
      availableCollections.value.map((col: any) => col.id ?? col._ref_id)
    )

    appendRESTCollections(collectionsData)

    // Get the appended collections
    const updatedCollections = useReadonlyStream(restCollections$, [])

    // Find the newly created collection by comparing IDs
    const newCollection = updatedCollections.value.find((col: any) => {
      const colId = col.id ?? col._ref_id
      return colId && !existingCollectionIDs.has(colId)
    })

    if (newCollection) {
      return {
        id: newCollection.id ?? newCollection._ref_id ?? "",
        name: newCollection.name || "Unknown Collection",
      }
    }

    // Fallback: return the last collection
    const lastCollection =
      updatedCollections.value[updatedCollections.value.length - 1]
    return {
      id: lastCollection.id ?? lastCollection._ref_id ?? "",
      name: lastCollection.name || "Unknown Collection",
    }
  } else if (workspaceType === "team" && currentWorkspace.value.teamID) {
    // For team workspace
    const teamID = currentWorkspace.value.teamID

    // Get existing collection IDs before import
    const existingCollectionIDs = new Set(
      teamCollectionsService.collections.value?.map((col: any) => col.id) ?? []
    )

    const transformedCollection = collectionsData.map((collection) =>
      translateToTeamCollectionFormat(collection)
    )

    const importResult = await importJSONToTeam(
      JSON.stringify(transformedCollection),
      teamID
    )

    if (!importResult) {
      throw new Error("Failed to import to team workspace")
    }

    // Wait a bit for the subscription to update
    await new Promise((resolve) => setTimeout(resolve, 500))

    // Get the team collections and find the newly created one
    const teamCollections = teamCollectionsService.collections.value
    if (teamCollections && teamCollections.length > 0) {
      // Find the newly created collection by comparing IDs
      const newCollection = teamCollections.find(
        (col: any) => col.id && !existingCollectionIDs.has(col.id)
      )

      if (newCollection) {
        return {
          id: newCollection.id,
          name: newCollection.title || "Unknown Collection",
        }
      }

      // Fallback: return the last collection
      const lastCollection = teamCollections[teamCollections.length - 1]
      return {
        id: lastCollection.id,
        name: lastCollection.title || "Unknown Collection",
      }
    }

    throw new Error("Failed to get imported team collection")
  }

  throw new Error("Unknown workspace type")
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
        const newCollection = await createExampleCollectionAndGetID()

        // Update the selected collection with the actual created collection's ID and name
        collectionIDToUse = newCollection.id
        selectedCollectionID.value = newCollection.id
        selectedCollectionName.value = newCollection.name
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
