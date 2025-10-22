<template>
  <div class="rounded-md border border-divider w-64">
    <div
      class="p-2 border-b border-divider bg-divider flex items-center justify-between space-x-16"
    >
      <h2 class="font-medium text-secondaryDark flex items-center text-xs">
        <icon-lucide-folder-tree class="mr-2 svg-icons" />
        <span>
          {{ collection.name }}
        </span>
      </h2>
      <button
        class="p-1 rounded hover:bg-divider text-secondaryLight"
        title="Expand/Collapse All"
        @click="toggleAllFolders"
      >
        <icon-lucide-chevrons-down v-if="!allExpanded" size="14" />
        <icon-lucide-chevrons-up v-else size="14" />
      </button>
    </div>

    <!-- Tree structure -->
    <div class="max-h-[calc(100vh-180px)] overflow-y-auto scrollable-structure">
      <div v-if="hasItems(collection.folders)">
        <FolderItem
          v-for="(rootFolder, rootFolderIndex) in collection.folders"
          :key="getFolderId(rootFolder, rootFolderIndex)"
          :folder="rootFolder"
          :folder-index="rootFolderIndex"
          :depth="0"
          :expanded-folders="expandedFolders"
          @toggle-folder="toggleFolder"
          @request-select="onRequestSelect"
          @folder-select="onFolderSelect"
        />
      </div>

      <!-- Root Requests -->
      <div v-if="hasItems(collection.requests)">
        <div
          v-for="(request, requestIndex) in collection.requests"
          :key="getRequestId(request, requestIndex)"
        >
          <div
            class="px-3 py-1.5 flex items-center group border-l-2 border-transparent hover:bg-divider/20 hover:border-l-2 hover:border-dividerLight cursor-pointer"
            @click.stop="onRequestSelect(request as HoppRESTRequest)"
          >
            <span
              class="text-tiny font-mono mr-2 px-1 rounded-sm"
              :class="getMethodClass(getRequestMethod(request))"
            >
              {{ getRequestMethod(request) }}
            </span>
            <span class="text-secondaryLight text-xs truncate">
              {{ request.name }}
            </span>
          </div>
        </div>
      </div>

      <div
        v-if="!hasItems(collection.folders) && !hasItems(collection.requests)"
        class="p-3 text-center text-secondaryLight text-xs italic"
      >
        No requests or folders
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  HoppCollection,
  HoppRESTRequest,
  HoppGQLRequest,
} from "@hoppscotch/data"
import { ref, reactive, watch } from "vue"
import FolderItem from "./FolderItem.vue"

type ExpandedFoldersType = { [key: string]: boolean }

type HoppRequest = HoppRESTRequest | HoppGQLRequest

type ItemWithPossibleId = {
  id?: string
  _ref_id?: string
  name?: string
  [key: string]: unknown
}

const props = defineProps<{
  collection: HoppCollection
  initiallyExpanded?: boolean
}>()

const emit = defineEmits<{
  (e: "request-select", request: HoppRESTRequest): void
  (e: "folder-select", folder: HoppCollection): void
}>()

const expandedFolders = reactive<ExpandedFoldersType>({})
const allExpanded = ref<boolean>(props.initiallyExpanded || false)

// Initialize folder structure with first level expanded
watch(
  () => props.collection,
  (newCollection) => {
    if (newCollection?.folders?.length) {
      // By default, expand first level folders using fallback IDs
      newCollection.folders.forEach((folder: HoppCollection, index: number) => {
        const folderId = getFolderId(folder, index)
        expandedFolders[folderId] = true
      })
    }
  },
  { immediate: true }
)

function toggleFolder(folderId: string): void {
  expandedFolders[folderId] = !expandedFolders[folderId]
}

function toggleAllFolders(): void {
  allExpanded.value = !allExpanded.value

  // Recursively expand or collapse all folders
  if (props.collection?.folders) {
    const processAllFolders = (folders: HoppCollection[]) => {
      folders.forEach((folder, index) => {
        const folderId = getFolderId(folder, index)
        expandedFolders[folderId] = allExpanded.value

        if (folder.folders && folder.folders.length > 0) {
          processAllFolders(folder.folders)
        }
      })
    }

    processAllFolders(props.collection.folders)
  }
}

function onRequestSelect(request: HoppRESTRequest): void {
  emit("request-select", request)
}

function onFolderSelect(folder: HoppCollection): void {
  emit("folder-select", folder)
}

/**
 * Type guard to check if a request is a REST request
 * @param request The request object to check
 * @returns True if the request is a REST request
 */
function isRESTRequest(request: HoppRequest): request is HoppRESTRequest {
  return "method" in request && typeof request.method === "string"
}

/**
 * Gets the HTTP method from a request object, handling different request types
 * @param request The request object (REST or GraphQL)
 * @returns The HTTP method string
 */
function getRequestMethod(request: HoppRequest): string {
  // Handle REST requests that have a method property
  if (isRESTRequest(request)) {
    return request.method
  }

  // Default fallback
  return "GET"
}

/**
 * Returns the appropriate CSS class for styling the request method badge
 * @param method The HTTP method
 * @returns CSS class string for the method badge
 */
function getMethodClass(method: string): string {
  const methodLower: string = method?.toLowerCase() || ""

  switch (methodLower) {
    case "get":
      return "bg-green-500/10 text-green-500"
    case "post":
      return "bg-blue-500/10 text-blue-500"
    case "put":
      return "bg-orange-500/10 text-orange-500"
    case "delete":
      return "bg-red-500/10 text-red-500"
    case "patch":
      return "bg-teal-500/10 text-teal-500"
    default:
      return "bg-gray-500/10 text-secondaryLight"
  }
}

/**
 * Check if a value exists and has length > 0
 * @param value Array to check
 * @returns Boolean indicating if array has items
 */
function hasItems<T>(value: T[] | undefined): boolean {
  return !!value && value.length > 0
}

/**
 * Generate a fallback ID for items that don't have one
 * @param item The folder or request item
 * @param index The index of the item in its parent array
 * @param prefix The prefix to use for the generated ID
 * @returns A generated ID string
 */
function generateFallbackId(
  item: ItemWithPossibleId,
  index: number,
  prefix: string
): string {
  return (
    item.id ||
    item._ref_id ||
    `${prefix}-${item.name?.replace(/\s+/g, "-").toLowerCase()}-${index}`
  )
}

/**
 * Get a reliable ID for a folder, with fallback generation
 * @param folder The folder object
 * @param index The folder's index in its parent array
 * @returns A reliable ID string
 */
function getFolderId(folder: HoppCollection, index: number): string {
  return generateFallbackId(folder, index, "folder")
}

/**
 * Get a reliable ID for a request, with fallback generation
 * @param request The request object
 * @param index The request's index in its parent array
 * @returns A reliable ID string
 */
function getRequestId(request: HoppRequest, index: number): string {
  return generateFallbackId(request, index, "request")
}
</script>

<style scoped>
.scrollable-structure {
  scrollbar-width: thin;
}

/* Custom scrollbar styling */
.scrollable-structure::-webkit-scrollbar {
  width: 6px;
}

.scrollable-structure::-webkit-scrollbar-track {
  @apply bg-transparent;
}

.scrollable-structure::-webkit-scrollbar-thumb {
  @apply bg-divider rounded-full;
}

.scrollable-structure::-webkit-scrollbar-thumb:hover {
  @apply bg-dividerLight;
}

/* Animation for folder expansion */
.transition-transform-2 {
  @apply transition-transform duration-200 ease-in-out;
}
</style>
