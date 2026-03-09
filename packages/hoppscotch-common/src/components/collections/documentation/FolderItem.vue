<template>
  <div>
    <div
      class="px-2 py-1.5 flex items-center cursor-pointer group"
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
        v-if="!expandedFolders[currentFolderId]"
        class="ml-1 mr-1.5 svg-icons transition-colors group-hover:text-secondaryDark"
      />
      <icon-lucide-folder-open
        v-else
        class="ml-1 mr-1.5 svg-icons transition-colors group-hover:text-secondaryDark"
      />
      <span
        class="text-xs truncate flex-1 transition-colors group-hover:text-secondaryDark"
        @click.stop="emit('folder-select', folder)"
      >
        {{ folderName }}
      </span>
    </div>

    <div v-if="expandedFolders[currentFolderId]">
      <div v-if="hasItems(childFolders)" class="mb-1">
        <div
          v-for="(nestedFolder, nestedIndex) in childFolders"
          :key="getFolderId(nestedFolder, nestedIndex)"
          class="pl-4"
        >
          <CollectionsDocumentationFolderItem
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

      <div v-if="hasItems(folder.requests)" class="mb-1 pl-8">
        <CollectionsDocumentationRequestItem
          v-for="(request, requestIndex) in folder.requests"
          :key="getRequestId(request, requestIndex)"
          :request="request as HoppRESTRequest"
          :depth="depth + 1"
          @request-select="emit('request-select', $event)"
        />
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
import CollectionsDocumentationFolderItem from "./FolderItem.vue"

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

const folderName = computed(() => props.folder.name)

const emit = defineEmits<{
  (e: "toggle-folder", folderId: string): void
  (e: "request-select", request: HoppRESTRequest): void
  (e: "folder-select", folder: HoppCollection): void
}>()

const childFolders = computed<Array<HoppCollection>>(() => {
  return props.folder.folders || []
})

const currentFolderId = computed(() =>
  getFolderId(props.folder, props.folderIndex)
)

/**
 * Type guard to check if a request is a REST request
 * @param request The request object to check
 * @returns True if the request is a REST request
 */
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
  // Handle regular items with id, _ref_id, and name properties
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
