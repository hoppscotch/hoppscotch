<template>
  <div id="documentation-container" class="rounded-md flex-1 overflow-y-auto">
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
            :documentation-description="
              selectedRequest.documentation?.content || ''
            "
            :collection-id="collectionID"
            :collection-path="collectionPath"
            :folder-path="folderPath"
            :request-index="requestIndex"
            :team-id="teamID"
            @update:documentation-description="
              (value) => {
                if (selectedRequest?.documentation) {
                  selectedRequest.documentation.content = value
                }
              }
            "
            @close-modal="closeModal"
          />
          <CollectionsDocumentationCollectionPreview
            v-else-if="selectedFolder"
            :collection="selectedFolder"
            :documentation-description="
              selectedFolder.documentation?.content || ''
            "
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

          <div
            v-for="(itemData, index) in allItems"
            :id="`doc-item-${itemData.id}`"
            :key="`doc-${index}`"
            class="mb-8"
            :class="{ 'highlight-item': selectedItemId === itemData.id }"
          >
            <div class="rounded-md overflow-hidden">
              <div
                class="p-3 flex flex-col bg-divider/20"
                :class="{ 'bg-accent/10': selectedItemId === itemData.id }"
              />

              <div class="p-0">
                <CollectionsDocumentationRequestPreview
                  v-if="itemData.type === 'request'"
                  :request="itemData.item as HoppRESTRequest"
                  :documentation-description="
                    (itemData.item as HoppRESTRequest).documentation?.content ||
                    ''
                  "
                  :collection-id="collectionID"
                  :collection-path="collectionPath"
                  :folder-path="itemData.folderPath"
                  :request-index="itemData.requestIndex"
                  :team-id="teamID"
                  @update:documentation-description="
                    (value) =>
                      ((
                        itemData.item as HoppRESTRequest
                      ).documentation!.content = value)
                  "
                  @close-modal="closeModal"
                />

                <CollectionsDocumentationCollectionPreview
                  :collection="itemData.item as HoppCollection"
                  :documentation-description="
                    (itemData.item as HoppCollection).documentation?.content ||
                    ''
                  "
                  @update:documentation-description="
                    (value) =>
                      ((
                        itemData.item as HoppCollection
                      ).documentation!.content = value)
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
import { ref, watch, nextTick } from "vue"

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
  }>(),
  {
    documentationDescription: "",
    collection: null,
    collectionID: "",
    collectionPath: null,
    folderPath: null,
    requestIndex: null,
    teamID: undefined,
  }
)

const emit = defineEmits<{
  (event: "update:documentationDescription", value: string): void
  (event: "close-modal"): void
}>()

const collectionDescription = useVModel(
  props,
  "documentationDescription",
  emit,
  { passive: true }
)

const showAllDocumentation = ref<boolean>(false)
const allItems = ref<Array<DocumentationItem>>([])
const selectedRequest = ref<HoppRESTRequest | null>(null)
const selectedFolder = ref<HoppCollection | null>(null)
const selectedItemId = ref<string | null>(null)
const isProcessingDocumentation = ref<boolean>(false)
const processingProgress = ref<number>(0)

/**
 * Handles a request being selected from the collection structure
 */
function handleRequestSelect(request: HoppRESTRequest): void {
  selectedRequest.value = request
  selectedFolder.value = null
  selectedItemId.value = request.id || null

  if (showAllDocumentation.value) {
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

  if (showAllDocumentation.value) {
    const folderId = folder.id || folder._ref_id
    if (folderId) {
      scrollToItem(folderId)
    } else {
      scrollToItemByNameAndType(folder.name, "folder")
    }
  }
}

/**
 * Scrolls to a specific item by ID
 */
function scrollToItem(id: string): void {
  console.log("Scrolling to item with ID:", id)
  nextTick(() => {
    const element = document.getElementById(`doc-item-${id}`)
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    }
  })
}

/**
 * Backup function to scroll to an item by name and type when ID is not available
 * @param name The name of the item to find
 * @param type The type of item ('request' or 'folder')
 */
function scrollToItemByNameAndType(
  name: string,
  type: "request" | "folder"
): void {
  console.log(`Looking for ${type} with name: ${name}`)
  nextTick(() => {
    const targetItem = allItems.value.find(
      (item) => item.item.name === name && item.type === type
    )

    if (targetItem) {
      const element = document.getElementById(`doc-item-${targetItem.id}`)
      if (element) {
        console.log(`Scrolling to ${type} with generated ID: ${targetItem.id}`)
        element.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      } else {
        console.log(`Element for ${type} not found in DOM`)
      }
    } else {
      console.log(`${type} with name "${name}" not found in allItems`)
    }
  })
}

/**
 * Gathers all items with documentation from the collection with async processing
 */
async function gatherAllItems(): Promise<void> {
  const items: Array<DocumentationItem> = []
  let processedCount = 0
  let totalCount = 0

  console.log(
    "Gathering all documentation items from collection",
    props.collection
  )

  if (!props.collection) {
    console.log("No collection provided")
    allItems.value = []
    return
  }

  // First pass: count total items
  const countItems = (collection: HoppCollection): number => {
    let count = 0
    if (collection.requests?.length) count += collection.requests.length
    if (collection.folders?.length) {
      count += collection.folders.length
      collection.folders.forEach((folder) => {
        count += countItems(folder)
      })
    }
    return count
  }

  totalCount = countItems(props.collection)
  console.log("Total items to process:", totalCount)

  const baseCollectionPath = props.collectionPath || ""

  // Process collection requests in batches
  if (props.collection.requests?.length) {
    console.log(
      "Processing collection requests:",
      props.collection.requests.length
    )

    for (let i = 0; i < props.collection.requests.length; i++) {
      const request = props.collection.requests[i]
      const requestId =
        request.id ||
        ("_ref_id" in request ? request._ref_id : undefined) ||
        `request-${i}`

      items.push({
        type: "request",
        item: request as HoppRESTRequest,
        parentPath: props.collection?.name || "",
        id: requestId,
        folderPath: baseCollectionPath,
        requestIndex: i,
      })

      processedCount++

      // Update progress and yield control every 10 items
      if (processedCount % 10 === 0) {
        processingProgress.value = Math.round(
          (processedCount / totalCount) * 100
        )
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    }
  }

  /**
   * Process folders recursively with async batching
   */
  const processFoldersAsync = async (
    folders: HoppCollection[],
    parentPath: string = "",
    currentFolderPath: string = ""
  ): Promise<void> => {
    for (let folderIndex = 0; folderIndex < folders.length; folderIndex++) {
      const folder = folders[folderIndex]
      const folderId =
        folder.id ||
        ("_ref_id" in folder ? folder._ref_id : undefined) ||
        `folder-${folderIndex}`

      let thisFolderPath: string
      if (baseCollectionPath) {
        thisFolderPath = currentFolderPath
          ? `${baseCollectionPath}/${currentFolderPath}/${folderIndex}`
          : `${baseCollectionPath}/${folderIndex}`
      } else {
        thisFolderPath = currentFolderPath
          ? `${currentFolderPath}/${folderIndex}`
          : `${folderIndex}`
      }

      // Add folder
      items.push({
        type: "folder",
        item: folder,
        parentPath,
        id: folderId,
        folderPath: thisFolderPath,
        requestIndex: null,
      })

      processedCount++

      // Process folder requests
      if (folder.requests?.length) {
        for (
          let requestIndex = 0;
          requestIndex < folder.requests.length;
          requestIndex++
        ) {
          const request = folder.requests[requestIndex]
          const requestId =
            request.id ||
            ("_ref_id" in request ? request._ref_id : undefined) ||
            `${folderId}-request-${requestIndex}`

          items.push({
            type: "request",
            item: request as HoppRESTRequest,
            parentPath: parentPath
              ? `${parentPath} / ${folder.name}`
              : folder.name,
            id: requestId,
            folderPath: thisFolderPath,
            requestIndex: requestIndex,
          })

          processedCount++

          // Update progress and yield control every 5 items
          if (processedCount % 5 === 0) {
            processingProgress.value = Math.round(
              (processedCount / totalCount) * 100
            )
            await new Promise((resolve) => setTimeout(resolve, 0))
          }
        }
      }

      // Process nested folders
      if (folder.folders?.length) {
        const newParentPath: string = parentPath
          ? `${parentPath} / ${folder.name}`
          : folder.name

        const relativeFolderPath = currentFolderPath
          ? `${currentFolderPath}/${folderIndex}`
          : `${folderIndex}`

        await processFoldersAsync(
          folder.folders,
          newParentPath,
          relativeFolderPath
        )
      }

      // Update progress after each folder
      processingProgress.value = Math.round((processedCount / totalCount) * 100)
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  }

  if (props.collection.folders?.length) {
    console.log(
      "Processing top-level folders:",
      props.collection.folders.length
    )
    await processFoldersAsync(props.collection.folders)
  }

  console.log("Total items gathered:", items.length)
  allItems.value = items
  processingProgress.value = 100
}

/**
 * Toggles between normal view and "All Documentation" view with async processing
 */
async function toggleAllDocumentation(): Promise<void> {
  if (!showAllDocumentation.value) {
    isProcessingDocumentation.value = true
    processingProgress.value = 0

    try {
      await gatherAllItems()
      showAllDocumentation.value = true

      // Force scroll to top after DOM update
      await nextTick()
      setTimeout(() => {
        const container = document.getElementById("documentation-container")
        if (container) {
          container.scrollTop = 0
          return
        }

        const containerByClass = document.querySelector(
          ".flex-1.overflow-y-auto"
        )
        if (containerByClass) {
          containerByClass.scrollTop = 0
          return
        }

        window.scrollTo(0, 0)
      }, 50)
    } catch (error) {
      console.error("Error processing documentation:", error)
    } finally {
      isProcessingDocumentation.value = false
      processingProgress.value = 0
    }
  } else {
    showAllDocumentation.value = false
  }
}

/**
 * Closes the modal by emitting the close-modal event
 */
function closeModal(): void {
  emit("close-modal")
}

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
</style>
