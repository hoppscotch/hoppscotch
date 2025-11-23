<template>
  <div
    class="rounded-md border border-divider"
    :class="{
      ' w-64': isDocModal,
    }"
  >
    <div
      class="sticky top-0 z-[99] py-2 border-b border-divider bg-primaryLight flex items-center justify-between space-x-3"
    >
      <div
        class="font-medium text-secondaryDark flex flex-1 items-center text-xs px-2 truncate cursor-pointer transition-colors"
        @click="scrollToTop"
      >
        <span class="truncate">
          {{ collectionName }}
        </span>
      </div>
      <HoppSmartItem
        v-if="hasItems(collectionFolders) || hasItems(collectionRequests)"
        :icon="allExpanded ? IconCheveronsUp : IconCheveronsDown"
        class="focus-visible:bg-transparent hover:bg-transparent"
        @click="toggleAllFolders"
      />
    </div>

    <!-- Tree structure -->
    <div
      class="overflow-y-auto"
      :class="{
        '!max-h-[400px]': isDocModal,
      }"
    >
      <div v-if="hasItems(collectionFolders)">
        <CollectionsDocumentationFolderItem
          v-for="(rootFolder, rootFolderIndex) in collectionFolders"
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
      <div v-if="hasItems(collectionRequests)" class="ml-4">
        <CollectionsDocumentationRequestItem
          v-for="(request, requestIndex) in collectionRequests"
          :key="getRequestId(request, requestIndex)"
          :request="request as HoppRESTRequest"
          :depth="0"
          @request-select="onRequestSelect"
        />
      </div>

      <div
        v-if="!hasItems(collectionFolders) && !hasItems(collectionRequests)"
        class="p-3 text-center text-secondaryLight text-xs italic"
      >
        {{ t("documentation.no_requests_or_folders") }}
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
import { ref, reactive, watch, computed } from "vue"
import IconCheveronsDown from "~icons/lucide/chevrons-down"
import IconCheveronsUp from "~icons/lucide/chevrons-up"
import { useService } from "dioc/vue"
import { TeamCollectionsService } from "~/services/team-collection.service"
import { useI18n } from "~/composables/i18n"

const t = useI18n()

type ExpandedFoldersType = { [key: string]: boolean }

type HoppRequest = HoppRESTRequest | HoppGQLRequest

type ItemWithPossibleId = {
  id?: string
  _ref_id?: string
  name?: string
  [key: string]: unknown
}

const props = withDefaults(
  defineProps<{
    collection: HoppCollection
    initiallyExpanded?: boolean
    isDocModal?: boolean
  }>(),
  {
    initiallyExpanded: false,
    isDocModal: true,
  }
)

const emit = defineEmits<{
  (e: "request-select", request: HoppRESTRequest): void
  (e: "folder-select", folder: HoppCollection): void
  (e: "scroll-to-top"): void
}>()

const expandedFolders = reactive<ExpandedFoldersType>({})
const allExpanded = ref<boolean>(props.initiallyExpanded || false)

const teamCollectionService = useService(TeamCollectionsService)

const collectionFolders = computed<HoppCollection[]>(() => {
  return props.collection.folders || []
})

const collectionRequests = computed<HoppRequest[]>(() => {
  return props.collection.requests
})

const collectionName = computed<string>(() => {
  return props.collection.name || t("documentation.untitled_collection")
})
/**
 * Generate a fallback ID for items that don't have one
 * @param item The folder or request item
 * @param index The index of the item in its parent array
 * @param prefix The prefix to use for the generated ID
 * @returns A generated ID string
 */
const generateFallbackId = (
  item: ItemWithPossibleId,
  index: number,
  prefix: string
): string => {
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
const getFolderId = (folder: HoppCollection, index: number): string => {
  return generateFallbackId(folder, index, "folder")
}

// Initialize folder structure with first level expanded
watch(
  () => props.collection,
  () => {
    const folders = collectionFolders.value
    if (folders?.length) {
      folders.forEach((folder: HoppCollection, index: number) => {
        const folderId = getFolderId(folder, index)
        expandedFolders[folderId] = true
      })
    }
  },
  { immediate: true }
)

const toggleFolder = async (folderId: string) => {
  expandedFolders[folderId] = !expandedFolders[folderId]
  await teamCollectionService.expandCollection(folderId)
}

const toggleAllFolders = () => {
  allExpanded.value = !allExpanded.value

  const processAllFolders = (folders: HoppCollection[]) => {
    folders.forEach((folder, index) => {
      const folderId = getFolderId(folder, index)
      expandedFolders[folderId] = allExpanded.value

      if (folder.folders && folder.folders.length > 0) {
        processAllFolders(folder.folders)
      }
    })
  }

  const folders = collectionFolders.value
  if (folders?.length) {
    processAllFolders(folders)
  }
}

const onRequestSelect = (request: HoppRESTRequest) => {
  emit("request-select", request)
}

const onFolderSelect = (folder: HoppCollection) => {
  emit("folder-select", folder)
}

/**
 * Emits event to scroll to the top of the documentation
 */
const scrollToTop = () => {
  emit("scroll-to-top")
}

/**
 * Type guard to check if a request is a REST request
 * @returns True if the request is a REST request
 */
/**
 * Check if a value exists and has length > 0
 * @param value Array to check
 * @returns Boolean indicating if array has items
 */
const hasItems = <T,>(value: T[] | undefined): boolean => {
  return !!value && value.length > 0
}

/**
 * Get a reliable ID for a request, with fallback generation
 * @param request The request object
 * @param index The request's index in its parent array
 * @returns A reliable ID string
 */
const getRequestId = (request: HoppRequest, index: number): string => {
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
