<template>
  <div
    id="documentation-container"
    class="rounded-md flex-1 overflow-y-auto relative"
  >
    <!-- Loading Overlay -->
    <div
      v-if="isLoading"
      class="absolute inset-0 bg-primary/80 backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div class="flex flex-col items-center space-y-4 text-center">
        <icon-lucide-loader-2 class="animate-spin" size="32" />
        <div class="text-sm text-secondaryLight">
          <p class="font-medium mb-1">{{ loadingMessage }}</p>
          <p class="text-xs">{{ displayProgress }}% complete</p>
          <p v-if="isLoadingComponents" class="text-xs">
            Rendering {{ allItems.length }} items...
          </p>
        </div>
      </div>
    </div>

    <div v-if="collection" class="flex items-start relative">
      <!-- Left Column - Collection Details -->
      <div class="flex-1 min-w-0 overflow-y-auto">
        <!-- Collection Header -->
        <div class="flex items-center justify-between px-10 mt-4">
          <button
            class="py-1.5 text-xs rounded-md text-accent transition-colors flex items-center disabled:cursor-not-allowed"
            :disabled="isProcessingDocumentation"
            @click="toggleAllDocumentation"
          >
            <icon-lucide-loader-2
              v-if="isProcessingDocumentation"
              class="mr-1.5 animate-spin"
              size="14"
            />
            <icon-lucide-file-text v-else class="mr-1.5" size="14" />
            {{
              isProcessingDocumentation
                ? `Processing... ${processingProgress}%`
                : showAllDocumentation
                  ? "Hide All Documentation"
                  : "Show All Documentation"
            }}
          </button>
        </div>

        <template v-if="!showAllDocumentation">
          <CollectionsDocumentationRequestPreview
            v-if="selectedRequest"
            :request="selectedRequest"
            :documentation-description="selectedRequest.description || ''"
            :collection-i-d="collectionID"
            :collection-path="collectionPath"
            :folder-path="folderPath"
            :request-index="requestIndex"
            :team-i-d="teamID"
            @update:documentation-description="
              (value) => {
                if (selectedRequest) {
                  selectedRequest.description = value
                }
              }
            "
            @close-modal="closeModal"
          />
          <CollectionsDocumentationCollectionPreview
            v-else-if="selectedFolder"
            :collection="selectedFolder"
            :documentation-description="selectedFolder.description || ''"
          />
          <CollectionsDocumentationCollectionPreview
            v-else
            :collection="collection"
            :documentation-description="documentationDescription"
            @update:documentation-description="
              (value) => emit('update:documentationDescription', value)
            "
          />
        </template>

        <!-- All Documentation View -->
        <template v-else>
          <div class="mb-8 overflow-hidden">
            <CollectionsDocumentationCollectionPreview
              v-model:documentation-description="collectionDescription"
              :collection="collection"
            />
          </div>

          <div
            v-if="allItems.length === 0"
            class="p-8 text-center text-secondaryLight"
          >
            <icon-lucide-file-question class="mx-auto mb-2" size="32" />
            <p>No documentation found for folders or requests</p>
          </div>

          <!-- Simple rendering of all items -->
          <div v-else class="space-y-8">
            <div
              v-for="(item, index) in allItems"
              :id="`doc-item-${item.id}`"
              :key="`doc-${index}`"
              class="rounded-md overflow-hidden"
              :class="{
                'highlight-item': selectedItemId === item.id,
              }"
            >
              <div
                class="p-3 flex flex-col bg-divider/20"
                :class="{
                  'bg-accent/10': selectedItemId === item.id,
                }"
              />

              <div class="p-0">
                <CollectionsDocumentationRequestPreview
                  v-if="item.type === 'request'"
                  :request="item.item as HoppRESTRequest"
                  :documentation-description="
                    (item.item as HoppRESTRequest).description || ''
                  "
                  :collection-i-d="collectionID"
                  :collection-path="collectionPath"
                  :folder-path="item.folderPath"
                  :request-index="item.requestIndex"
                  :team-i-d="teamID"
                  @update:documentation-description="
                    (value) =>
                      ((item.item as HoppRESTRequest).description = value)
                  "
                  @close-modal="closeModal"
                />

                <CollectionsDocumentationCollectionPreview
                  v-else
                  :collection="item.item as HoppCollection"
                  :documentation-description="
                    (item.item as HoppCollection).description || ''
                  "
                  @update:documentation-description="
                    (value) =>
                      ((item.item as HoppCollection).description = value)
                  "
                />
              </div>
            </div>
          </div>
        </template>
      </div>

      <div v-if="showAllDocumentation" class="p-6 sticky top-0">
        <CollectionsDocumentationCollectionStructure
          :collection="collection"
          @request-select="handleRequestSelect"
          @folder-select="handleFolderSelect"
        />
      </div>
    </div>

    <div v-else class="text-center py-8 text-secondaryLight">
      <icon-lucide-file-question class="mx-auto mb-2" size="32" />
      <p>No collection data available</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import { ref, watch, nextTick, computed } from "vue"

import { useService } from "dioc/vue"
import { TeamCollectionsService } from "~/services/team-collection.service"

type CollectionType = HoppCollection | null

interface DocumentationItem {
  type: "folder" | "request"
  item: HoppCollection | HoppRESTRequest
  parentPath: string
  id: string
  folderPath?: string | null
  requestIndex?: number | null
}

const props = withDefaults(
  defineProps<{
    documentationDescription?: string
    collection?: CollectionType
    collectionID?: string
    collectionPath?: string | null
    folderPath?: string | null
    requestIndex?: number | null
    teamID?: string
    isTeamCollection?: boolean
    allItems?: Array<DocumentationItem>
    showAllDocumentation?: boolean
    isProcessingDocumentation?: boolean
    processingProgress?: number
  }>(),
  {
    documentationDescription: "",
    collection: null,
    collectionID: "",
    collectionPath: null,
    folderPath: null,
    requestIndex: null,
    teamID: undefined,
    isTeamCollection: false,
    allItems: () => [],
    showAllDocumentation: false,
    isProcessingDocumentation: false,
    processingProgress: 0,
  }
)

const emit = defineEmits<{
  (event: "update:documentationDescription", value: string): void
  (event: "close-modal"): void
  (event: "toggle-all-documentation"): void
}>()

const teamCollectionService = useService(TeamCollectionsService)

const collectionDescription = useVModel(
  props,
  "documentationDescription",
  emit,
  { passive: true }
)

const selectedRequest = ref<HoppRESTRequest | null>(null)
const selectedFolder = ref<HoppCollection | null>(null)
const selectedItemId = ref<string | null>(null)

// Enhanced loading states
const isLoadingComponents = ref<boolean>(false)
const loadingMessage = ref<string>("Processing Documentation")

// Computed property for overall loading state
const isLoading = computed(
  () =>
    props.isProcessingDocumentation ||
    isLoadingComponents.value ||
    teamCollectionService.loadingCollections.value.length !== 0
)

// Simple progress calculation
const displayProgress = computed(() => {
  if (props.isProcessingDocumentation) {
    return props.processingProgress
  }
  return 100 // Show 100% during component loading
})

/**
 * Simple scroll to item function
 */
function scrollToItem(id: string): void {
  console.log("Scrolling to item with ID:", id)

  nextTick(() => {
    const element = document.getElementById(`doc-item-${id}`)
    if (element) {
      console.log("Item found, scrolling to it")
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
      selectedItemId.value = id
    } else {
      console.log("Item not found:", id)
    }
  })
}

/**
 * Backup function that scrolls by name and type
 */
function scrollToItemByNameAndType(
  name: string,
  type: "request" | "folder"
): void {
  console.log(`Looking for ${type} with name: ${name}`)

  const itemIndex = props.allItems.findIndex(
    (item: DocumentationItem) => item.item.name === name && item.type === type
  )

  if (itemIndex !== -1) {
    const targetItem = props.allItems[itemIndex]
    console.log(`Found ${type} at index: ${itemIndex}`)
    scrollToItem(targetItem.id)
  } else {
    console.log(`${type} with name "${name}" not found in allItems`)
  }
}

/**
 * Handles a request being selected from the collection structure
 */
function handleRequestSelect(request: HoppRESTRequest): void {
  selectedRequest.value = request
  selectedFolder.value = null
  selectedItemId.value = request.id || null

  if (props.showAllDocumentation) {
    const requestId = request.id || request._ref_id
    if (requestId) {
      scrollToItem(requestId)
    } else {
      scrollToItemByNameAndType(request.name, "request")
    }
  }
}

/**
 * Handles a folder being selected from the collection structure
 */
function handleFolderSelect(folder: HoppCollection): void {
  selectedFolder.value = folder
  selectedRequest.value = null
  selectedItemId.value = folder.id || null

  if (props.showAllDocumentation) {
    const folderId = folder.id || folder._ref_id
    if (folderId) {
      scrollToItem(folderId)
    } else {
      scrollToItemByNameAndType(folder.name, "folder")
    }
  }
}

/**
 * Emits toggle event for parent to handle processing
 */
function toggleAllDocumentation(): void {
  emit("toggle-all-documentation")
}

/**
 * Closes the modal by emitting the close-modal event
 */
function closeModal(): void {
  emit("close-modal")
}

// Watch for showAllDocumentation prop changes
watch(
  () => props.showAllDocumentation,
  (newValue) => {
    if (newValue && props.allItems.length > 0) {
      // Starting to show all documentation - set loading state
      isLoadingComponents.value = true
      loadingMessage.value = "Rendering Documentation"

      nextTick(() => {
        // Check if all documentation components are present in DOM
        const documentedItems = props.allItems.filter(
          (item: DocumentationItem) =>
            (item.type === "request" &&
              (item.item as HoppRESTRequest).description) ||
            (item.type === "folder" &&
              (item.item as HoppCollection).description)
        )

        // Wait a bit for components to render
        const extraDelay = Math.min(documentedItems.length * 50, 1000) // Max 1 second
        setTimeout(() => {
          isLoadingComponents.value = false
          loadingMessage.value = ""
        }, extraDelay)
      })
    } else if (!newValue) {
      // Hiding all documentation - reset to original collection state
      isLoadingComponents.value = false
      loadingMessage.value = ""

      // Clear all selections to return to the main collection view
      selectedRequest.value = null
      selectedFolder.value = null
      selectedItemId.value = null
    }
  }
)

// Watch for allItems changes to handle component loading
watch(
  () => props.allItems.length,
  (newLength) => {
    if (
      newLength > 0 &&
      props.showAllDocumentation &&
      !props.isProcessingDocumentation
    ) {
      // Items are set, now wait for component rendering
      nextTick(() => {
        // Check if all documentation components are present in DOM
        const documentedItems = props.allItems.filter(
          (item: DocumentationItem) =>
            (item.type === "request" &&
              (item.item as HoppRESTRequest).description) ||
            (item.type === "folder" &&
              (item.item as HoppCollection).description)
        )

        // Wait a bit more if we have many components to render
        const extraDelay = Math.min(documentedItems.length * 50, 1000) // Max 1 second
        setTimeout(() => {
          isLoadingComponents.value = false
        }, extraDelay)
      })
    }
  }
)

// Watch for collection changes
watch(
  () => props.collection,
  () => {
    selectedRequest.value = null
    selectedFolder.value = null
    selectedItemId.value = null
  },
  { immediate: true }
)
</script>

<style scoped>
:deep(.scrollable-structure) {
  scrollbar-width: thin;
}

:deep(.scrollable-structure::-webkit-scrollbar) {
  width: 6px;
}

:deep(.scrollable-structure::-webkit-scrollbar-track) {
  background: transparent;
}

:deep(.scrollable-structure::-webkit-scrollbar-thumb) {
  background: var(--divider-color);
  border-radius: 9999px;
}

:deep(.scrollable-structure::-webkit-scrollbar-thumb:hover) {
  background: var(--divider-light-color);
}

:deep(.overflow-y-auto) {
  scroll-behavior: smooth;
}

#documentation-container {
  min-height: 300px;
  scroll-behavior: smooth;
}

.overflow-y-auto {
  scroll-behavior: smooth !important;
}

.highlight-item {
  background-color: rgba(var(--accent-color-rgb), 0.1);
  border-radius: 8px;
  transition: background-color 0.2s ease;
}
</style>
