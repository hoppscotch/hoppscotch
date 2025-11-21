<template>
  <main class="flex-1 flex">
    <div
      class="sticky top-[3.3rem] w-80 border-r border-divider bg-primary overflow-y-auto max-h-screen"
    >
      <CollectionsDocumentationCollectionStructure
        v-if="collectionData"
        :collection="collectionData"
        :is-doc-modal="false"
        @request-select="handleRequestSelect"
        @folder-select="handleFolderSelect"
      />
    </div>

    <div class="flex-1 p-6 overflow-y-auto">
      <div class="flex-1 min-w-0 flex flex-col space-y-8">
        <div class="mb-8 overflow-hidden">
          <CollectionsDocumentationCollectionPreview
            v-if="collectionData"
            :collection="collectionData"
            :documentation-description="collectionData.description || ''"
            :path-or-i-d="null"
            :read-only="true"
          />
        </div>

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
</template>

<script setup lang="ts">
import { PropType } from "vue"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"

type DocumentationItem = {
  id: string
  type: "folder" | "request"
  item: HoppCollection | HoppRESTRequest
}

const props = defineProps({
  collectionData: {
    type: Object as PropType<any>,
    default: null,
  },
  allItems: {
    type: Array as PropType<DocumentationItem[]>,
    default: () => [],
  },
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
  const item = props.allItems.find(
    (item) => item.item.name === name && item.type === type
  )

  if (item) {
    scrollToItem(item.id)
  } else {
    console.log(`${type} with name "${name}" not found in allItems`)
  }
}
</script>
