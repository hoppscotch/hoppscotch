<template>
  <div
    id="documentation-container"
    ref="documentationContainerRef"
    class="rounded-md flex-1 relative overflow-y-auto h-full"
  >
    <div
      v-if="isLoading"
      class="absolute inset-0 bg-primary backdrop-blur-sm z-50 flex items-center justify-center"
    >
      <div class="flex flex-col items-center space-y-4 text-center">
        <icon-lucide-loader-2 class="animate-spin" size="32" />
        <div class="text-sm text-secondaryLight">
          <p class="font-medium mb-1">{{ currentLoadingMessage }}</p>
          <p v-if="!props.isExternalLoading" class="text-xs">
            {{ displayProgress }}{{ t("documentation.percent_complete") }}
          </p>
        </div>
      </div>
    </div>

    <div v-if="collection" class="flex items-start relative">
      <div class="flex-1 min-w-0 p-4">
        <template v-if="!showAllDocumentation">
          <CollectionsDocumentationCollectionPreview
            v-if="selectedFolder"
            :collection="selectedFolder"
            :documentation-description="selectedFolder.description || ''"
            :folder-path="folderPath ?? undefined"
            :path-or-i-d="pathOrID"
            :is-team-collection="isTeamCollection"
            :collection-path="collectionPath || undefined"
            :team-i-d="teamID"
            :read-only="!hasTeamWriteAccess"
          />
          <CollectionsDocumentationRequestPreview
            v-else-if="selectedRequest"
            :request="selectedRequest"
            :documentation-description="selectedRequest.description || ''"
            :collection-i-d="collectionID"
            :collection-path="collectionPath"
            :folder-path="folderPath"
            :request-index="requestIndex"
            :team-i-d="teamID"
            :read-only="!hasTeamWriteAccess"
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
            v-else
            :collection="collection"
            :documentation-description="documentationDescription"
            :folder-path="folderPath ?? undefined"
            :path-or-i-d="pathOrID"
            :is-team-collection="isTeamCollection"
            :collection-path="collectionPath || undefined"
            :team-i-d="teamID"
            :read-only="!hasTeamWriteAccess"
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
              :folder-path="folderPath ?? undefined"
              :path-or-i-d="pathOrID"
              :is-team-collection="isTeamCollection"
              :collection-path="collectionPath || undefined"
              :team-i-d="teamID"
              :read-only="!hasTeamWriteAccess"
            />
          </div>

          <div
            v-if="allItems.length === 0"
            class="p-8 text-center text-secondaryLight"
          >
            <icon-lucide-file-question class="mx-auto mb-2" size="32" />
            <p>{{ t("documentation.no_documentation_found") }}</p>
          </div>

          <!-- Rendering of all items -->
          <div v-else class="space-y-8">
            <div
              v-for="(item, index) in displayedItems"
              :id="`doc-item-${item.id}`"
              :key="item.id"
              class="flex flex-col"
            >
              <LazyDocumentationItem
                :min-height="MIN_HEIGHT_PER_ITEM"
                :force-render="shouldForceRender(index)"
              >
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
                    :request-i-d="item.requestID"
                    :team-i-d="teamID"
                    :read-only="!hasTeamWriteAccess"
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
                    :folder-path="item.folderPath ?? undefined"
                    :path-or-i-d="item.pathOrID ?? null"
                    :is-team-collection="isTeamCollection"
                    :collection-path="collectionPath || undefined"
                    :team-i-d="teamID"
                    :read-only="!hasTeamWriteAccess"
                    @update:documentation-description="
                      (value) =>
                        ((item.item as HoppCollection).description = value)
                    "
                  />
                </div>
              </LazyDocumentationItem>
            </div>

            <!-- Dummy element for infinite scroll -->
            <div
              v-if="displayedItems.length < allItems.length"
              ref="loadMoreTrigger"
              class="h-4 w-full"
            ></div>
          </div>
        </template>
      </div>

      <div v-if="showAllDocumentation" class="p-4 sticky top-0">
        <CollectionsDocumentationCollectionStructure
          :collection="collection"
          @request-select="handleRequestSelect"
          @folder-select="handleFolderSelect"
          @scroll-to-top="handleScrollToTop"
        />
      </div>
    </div>

    <div v-else class="text-center py-8 text-secondaryLight">
      <icon-lucide-file-question class="mx-auto mb-2" size="32" />
      <p>{{ t("documentation.no_collection_data") }}</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, watch, nextTick, computed } from "vue"
import { useVModel, useIntersectionObserver } from "@vueuse/core"
import { useService } from "dioc/vue"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { TeamCollectionsService } from "~/services/team-collection.service"
import { DocumentationItem } from "~/composables/useDocumentationWorker"
import LazyDocumentationItem from "./LazyDocumentationItem.vue"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

type CollectionType = HoppCollection | null

const props = withDefaults(
  defineProps<{
    documentationDescription?: string
    collection?: CollectionType
    collectionID?: string
    collectionPath?: string | null
    folderPath?: string | null
    pathOrID?: string | null
    requestIndex?: number | null
    requestID?: string | null
    teamID?: string
    isTeamCollection?: boolean
    allItems?: Array<DocumentationItem>
    showAllDocumentation?: boolean
    isProcessingDocumentation?: boolean
    processingProgress?: number
    isExternalLoading?: boolean
    hasTeamWriteAccess?: boolean
  }>(),
  {
    documentationDescription: "",
    collection: null,
    collectionID: "",
    collectionPath: null,
    folderPath: null,
    pathOrID: null,
    requestIndex: null,
    requestID: null,
    teamID: undefined,
    isTeamCollection: false,
    allItems: () => [],
    showAllDocumentation: false,
    isProcessingDocumentation: false,
    processingProgress: 0,
    isExternalLoading: false,
    hasTeamWriteAccess: true,
  }
)

const emit = defineEmits<{
  (event: "update:documentationDescription", value: string): void
  (event: "close-modal"): void
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

// Lazy loading state for lazy loading documentation items to prevent performance issues
const ITEMS_PER_PAGE = 40
const MIN_HEIGHT_PER_ITEM = "150px"
const displayedItems = ref<Array<DocumentationItem>>([])
const loadMoreTrigger = ref<HTMLElement | null>(null)

/**
 * Loads more items into the displayed list when scrolling
 */
const loadMoreItems = () => {
  if (displayedItems.value.length < props.allItems.length) {
    const currentLength = displayedItems.value.length
    const nextItems = props.allItems.slice(
      currentLength,
      currentLength + ITEMS_PER_PAGE
    )
    displayedItems.value = [...displayedItems.value, ...nextItems]
  }
}

// Intersection Observer for infinite scroll
useIntersectionObserver(
  loadMoreTrigger,
  ([{ isIntersecting }]) => {
    if (isIntersecting) {
      loadMoreItems()
    }
  },
  { threshold: 0.1 }
)

/**
 * Computed property to determine if the collection is loading
 * Loads when the collection is processing or external loading is active
 * or when the team collection is loading
 */
const isLoading = computed(
  () =>
    props.isProcessingDocumentation ||
    props.isExternalLoading ||
    teamCollectionService.loadingCollections.value.length !== 0
)

/**
 * Computed property to determine the current loading message
 * Returns "Loading Collection Data..." when external loading is active
 * Returns "Processing Documentation" when processing documentation is active
 * Returns "Loading..." when neither is active
 */
const currentLoadingMessage = computed(() => {
  if (props.isExternalLoading) {
    return t("documentation.loading_collection_data")
  }
  if (props.isProcessingDocumentation) {
    return t("documentation.processing_documentation")
  }
  return t("documentation.loading")
})

const displayProgress = computed(() => {
  if (props.isExternalLoading) {
    return 0 // Don't show progress during external loading
  }
  if (props.isProcessingDocumentation) {
    return props.processingProgress
  }
  return 0 // No progress for other states
})

const selectedIndex = computed(() => {
  return displayedItems.value.findIndex(
    (item) => item.id === selectedItemId.value
  )
})

/**
 * Determines if an item should be forcefully rendered based on its proximity to the selected item
 */
const shouldForceRender = (index: number) => {
  if (selectedIndex.value === -1) return false
  // Render a buffer of 20 items around the selected item to prevent scroll jumping
  return Math.abs(index - selectedIndex.value) <= 20
}

/**
 * Scrolls to a specific item by its ID, loading it if necessary
 */
const scrollToItem = (id: string): void => {
  // Check if item is in displayedItems, if not, load until it is
  const itemIndex = props.allItems.findIndex((item) => item.id === id)
  let shouldAutoScroll = false

  if (itemIndex !== -1 && itemIndex >= displayedItems.value.length) {
    // Load all items up to the target item plus a buffer page
    const targetPage = Math.ceil((itemIndex + 1) / ITEMS_PER_PAGE)
    const itemsToLoad = (targetPage + 1) * ITEMS_PER_PAGE
    displayedItems.value = props.allItems.slice(0, itemsToLoad)
    shouldAutoScroll = true
  }

  // Set selectedItemId immediately to trigger forceRender on the target item
  selectedItemId.value = id

  nextTick(() => {
    // Use a small timeout to ensure layout is fully stable after forceRender
    setTimeout(() => {
      const element = document.getElementById(`doc-item-${id}`)
      if (element) {
        element.scrollIntoView({
          behavior: shouldAutoScroll ? "auto" : "instant",
          block: "start",
        })
      } else {
        console.error("Item not found:", id)
      }
    }, 50)
  })
}

/**
 * Backup function that scrolls by name and type if ID is not available
 */
const scrollToItemByNameAndType = (
  name: string,
  type: "request" | "folder"
) => {
  const itemIndex = props.allItems.findIndex(
    (item: DocumentationItem) => item.item.name === name && item.type === type
  )

  if (itemIndex !== -1) {
    const targetItem = props.allItems[itemIndex]
    scrollToItem(targetItem.id)
  } else {
    console.error(`${type} with name "${name}" not found in allItems`)
  }
}

/**
 * Handles a request being selected from the collection structure
 */
const handleRequestSelect = (request: HoppRESTRequest) => {
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
const handleFolderSelect = (folder: HoppCollection) => {
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
 * Closes the modal by emitting the close-modal event
 */
const closeModal = () => {
  emit("close-modal")
}

const documentationContainerRef = ref<HTMLElement | null>(null)

/**
 * Scrolls the documentation container to the top
 */
const handleScrollToTop = () => {
  if (documentationContainerRef.value) {
    documentationContainerRef.value.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }
}

// Initialize displayed items when allItems changes
watch(
  () => props.allItems,
  (newItems) => {
    if (newItems && newItems.length > 0) {
      displayedItems.value = newItems.slice(0, ITEMS_PER_PAGE)
    } else {
      displayedItems.value = []
    }
  },
  { immediate: true }
)

// Watch for showAllDocumentation prop changes to reset state
watch(
  () => props.showAllDocumentation,
  (newValue) => {
    if (!newValue) {
      // Hiding all documentation - clear all selections to return to the main collection view
      selectedRequest.value = null
      selectedFolder.value = null
      selectedItemId.value = null
      // Reset displayed items
      displayedItems.value = []
    } else {
      // Reset displayed items when showing documentation
      if (props.allItems && props.allItems.length > 0) {
        displayedItems.value = props.allItems.slice(0, ITEMS_PER_PAGE)
      }
    }
  }
)

// Watch for collection changes to reset selection
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

#documentation-container {
  min-height: 300px;
}
</style>
