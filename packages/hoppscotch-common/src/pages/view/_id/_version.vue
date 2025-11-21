<template>
  <div class="flex flex-col min-h-screen bg-primary">
    <!-- Header -->
    <!-- <header class="border-b border-divider bg-primary sticky top-0 z-10">
      <div class="max-w-5xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            <h1 class="text-2xl font-bold text-secondaryDark">
              {{ collectionData?.name || "Loading..." }}
            </h1>
          </div>
        </div>
      </div>
    </header> -->

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center flex-1 py-20">
      <div class="flex flex-col items-center space-y-4">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"
        ></div>
        <p class="text-secondaryLight">{{ t("state.loading") }}</p>
      </div>
    </div>

    <!-- Error State -->
    <div
      v-else-if="error"
      class="flex items-center justify-center flex-1 py-20"
    >
      <div class="flex flex-col items-center space-y-4 max-w-md text-center">
        <IconAlertCircle class="w-16 h-16 text-red-500" />
        <h2 class="text-xl font-semibold text-secondaryDark">
          {{ t("error.something_went_wrong") }}
        </h2>
        <p class="text-secondaryLight">{{ error }}</p>
      </div>
    </div>

    <!-- Content -->
    <main v-else-if="collectionData" class="flex-1 flex">
      <!-- Sidebar with Collection Structure -->
      <div
        class="sticky top-0 w-80 border-r border-divider bg-primary overflow-y-auto max-h-screen"
      >
        <CollectionsDocumentationCollectionStructure
          v-if="collectionData"
          :collection="collectionData"
          :is-doc-modal="false"
          @request-select="handleRequestSelect"
          @folder-select="handleFolderSelect"
        />
      </div>

      <!-- Main Content -->
      <div class="flex-1 p-6 overflow-y-auto">
        <div class="flex-1 min-w-0 flex flex-col space-y-8">
          <!-- Main Collection Documentation -->
          <div class="mb-8 overflow-hidden">
            <CollectionsDocumentationCollectionPreview
              v-if="collectionData"
              :collection="collectionData"
              :documentation-description="collectionData.description || ''"
              :path-or-i-d="null"
              :read-only="true"
            />
          </div>

          <!-- All Items Documentation -->
          <div
            v-if="allItems.length > 0"
            class="space-y-8 mt-8 divide-y divide-divider"
          >
            <div
              v-for="item in allItems"
              :id="`doc-item-${item.id}`"
              :key="item.id"
              class="flex flex-col py-4"
            >
              <CollectionsDocumentationCollectionPreview
                v-if="item.type === 'folder'"
                :collection="item.item as HoppCollection"
                :documentation-description="
                  (item.item as HoppCollection).description || ''
                "
                :path-or-i-d="null"
                :read-only="true"
              />
              <CollectionsDocumentationRequestPreview
                v-else
                :request="item.item as HoppRESTRequest"
                :documentation-description="
                  (item.item as HoppRESTRequest).description || ''
                "
                :collection-i-d="''"
                :read-only="true"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import { useRoute } from "vue-router"
import { useI18n } from "~/composables/i18n"
import {
  getPublishedDocByIDREST,
  collectionFolderToHoppCollection,
} from "~/helpers/backend/queries/PublishedDocs"
import * as E from "fp-ts/Either"
import IconAlertCircle from "~icons/lucide/alert-circle"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"

const route = useRoute()
const t = useI18n()

const collectionData = ref<any>(null)
const loading = ref(true)
const error = ref<string | null>(null)

type DocumentationItem = {
  id: string
  type: "folder" | "request"
  item: HoppCollection | HoppRESTRequest
}

/**
 * Recursively flattens a collection into an array of documentation items
 */
const flattenCollection = (
  collection: HoppCollection,
  items: DocumentationItem[] = []
): DocumentationItem[] => {
  // Add folders
  if (collection.folders && collection.folders.length > 0) {
    collection.folders.forEach((folder: HoppCollection) => {
      items.push({
        id: folder.id || (folder as any)._ref_id || `folder-${folder.name}`,
        type: "folder",
        item: folder,
      })
      // Recursively flatten nested folders
      flattenCollection(folder, items)
    })
  }

  // Add requests
  // Note: collectionFolderToHoppCollection ensures all requests are converted to the latest version
  if (collection.requests && collection.requests.length > 0) {
    ;(collection.requests as HoppRESTRequest[]).forEach((request) => {
      items.push({
        id: request.id || (request as any)._ref_id || `request-${request.name}`,
        type: "request",
        item: request,
      })
    })
  }

  return items
}

const allItems = computed<DocumentationItem[]>(() => {
  if (!collectionData.value) return []
  return flattenCollection(collectionData.value)
})

/**
 * Handles a request being selected from the collection structure sidebar
 */
const handleRequestSelect = (request: HoppRESTRequest) => {
  const requestId = request.id || (request as any)._ref_id
  if (requestId) {
    scrollToItem(requestId)
  } else {
    scrollToItemByName(request.name, "request")
  }
}

/**
 * Handles a folder being selected from the collection structure sidebar
 */
const handleFolderSelect = (folder: HoppCollection) => {
  const folderId = folder.id || (folder as any)._ref_id
  if (folderId) {
    scrollToItem(folderId)
  } else {
    scrollToItemByName(folder.name, "folder")
  }
}

/**
 * Scrolls to a specific item by its ID
 */
const scrollToItem = (id: string): void => {
  setTimeout(() => {
    const element = document.getElementById(`doc-item-${id}`)
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      })
    } else {
      console.log("Item not found:", id)
    }
  }, 100)
}

/**
 * Backup function that scrolls by name and type if ID is not available
 */
const scrollToItemByName = (name: string, type: "request" | "folder") => {
  const item = allItems.value.find(
    (item) => item.item.name === name && item.type === type
  )

  if (item) {
    scrollToItem(item.id)
  } else {
    console.log(`${type} with name "${name}" not found in allItems`)
  }
}

onMounted(async () => {
  const docId = route.params.id as string
  const version = route.params.version as string

  console.log("Fetching published doc via REST API:", docId)
  console.log("Version:", version)
  if (!docId) {
    error.value = "No document ID provided"
    loading.value = false
    return
  }

  // Fetch published doc using REST API (public access, no authentication required)
  const result = await getPublishedDocByIDREST(docId)()

  console.log("//result///", result)

  if (E.isLeft(result)) {
    console.error("Error fetching published doc:", result.left)
    error.value = "Published documentation not found"
    loading.value = false
    return
  }

  // Convert the REST API response (CollectionFolder) to HoppCollection format
  const hoppCollection = collectionFolderToHoppCollection(result.right)
  collectionData.value = hoppCollection
  console.log(
    "Collection data converted to HoppCollection:",
    collectionData.value
  )

  loading.value = false
})
</script>

<route lang="yaml">
meta:
  layout: empty
</route>
