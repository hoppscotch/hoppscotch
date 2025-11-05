<template>
  <div>
    <div
      class="px-3 py-1.5 flex items-center cursor-pointer group"
      @click.stop="emit('toggle-folder', currentFolderId)"
    >
      <span
        class="w-4 h-4 flex items-center justify-center transition-transform-2"
        :class="{
          'transform rotate-90': expandedFolders[currentFolderId],
        }"
      >
        <icon-lucide-chevron-right class="svg-icons" />
      </span>
      <icon-lucide-folder
        class="ml-1 mr-1.5 svg-icons transition-colors group-hover:text-secondaryDark"
      />
      <span
        class="text-xs truncate flex-1 transition-colors group-hover:text-secondaryDark"
        @click.stop="emit('folder-select', folder)"
      >
        {{ folder.name }}
      </span>
    </div>

    <div v-if="expandedFolders[currentFolderId]">
      <div v-if="hasItems(folder.folders)" class="mb-1">
        <div
          v-for="(nestedFolder, nestedIndex) in folder.folders"
          :key="getFolderId(nestedFolder, nestedIndex)"
          class="pl-4"
        >
          <FolderItem
            :folder="nestedFolder"
            :folder-index="nestedIndex"
            :depth="depth + 1"
            :expanded-folders="expandedFolders"
            @toggle-folder="emit('toggle-folder', $event)"
            @request-select="emit('request-select', $event)"
            @folder-select="emit('folder-select', $event)"
          />
        </div>
      </div>

      <div v-if="hasItems(folder.requests)" class="mb-1">
        <div
          v-for="(request, requestIndex) in folder.requests"
          :key="getRequestId(request, requestIndex)"
          class="py-1.5 ml-6 pl-2 space-x-2 flex items-center group cursor-pointer"
          @click.stop="emit('request-select', request as HoppRESTRequest)"
        >
          <span
            class="text-tiny px-1 rounded-sm"
            :class="getMethodClass(getRequestMethod(request))"
          >
            {{ getRequestMethod(request) }}
          </span>
          <span
            class="text-secondaryLight text-xs truncate transition-colors group-hover:text-secondaryDark"
          >
            {{ request.name }}
          </span>
        </div>
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
import { computed } from "vue"

type ExpandedFoldersType = { [key: string]: boolean }

type HoppRequest = HoppRESTRequest | HoppGQLRequest

type ItemWithPossibleId = {
  id?: string
  _ref_id?: string
  name?: string
  [key: string]: unknown
}

const props = defineProps<{
  folder: HoppCollection
  folderIndex: number
  depth: number
  expandedFolders: ExpandedFoldersType
}>()

const emit = defineEmits<{
  (e: "toggle-folder", folderId: string): void
  (e: "request-select", request: HoppRESTRequest): void
  (e: "folder-select", folder: HoppCollection): void
}>()

const currentFolderId = computed(() =>
  getFolderId(props.folder, props.folderIndex)
)

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
/* Animation for folder expansion */
.transition-transform-2 {
  transition: transform 200ms ease-in-out;
}
</style>
