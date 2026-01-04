<template>
  <main class="flex-1 flex overflow-hidden">
    <div class="w-80 border-r border-divider bg-primary overflow-y-auto h-full">
      <CollectionsDocumentationCollectionStructure
        v-if="collectionData"
        :collection="collectionData"
        :is-doc-modal="false"
        @request-select="handleRequestSelect"
        @folder-select="handleFolderSelect"
        @scroll-to-top="handleScrollToTop"
      />
    </div>

    <div ref="mainContentRef" class="flex-1 p-6 overflow-y-auto h-full">
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
            class="flex flex-col py-4 scroll-mt-14"
          >
            <CollectionsDocumentationCollectionPreview
              v-if="item.type === 'folder'"
              :collection="item.item as HoppCollection"
              :documentation-description="
                (item.item as HoppCollection).description || ''
              "
              :path-or-i-d="null"
              :read-only="true"
              :inherited-properties="getInheritedProperties(item)"
            />
            <CollectionsDocumentationRequestPreview
              v-if="item.type === 'request'"
              :request="item.item as HoppRESTRequest"
              :documentation-description="
                (item.item as HoppRESTRequest).description || ''
              "
              :collection-i-d="collectionData.id"
              :inherited-properties="getInheritedProperties(item)"
              :read-only="true"
            />
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { PropType, ref, onMounted } from "vue"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import { useRouter, useRoute } from "vue-router"

type DocumentationItem = {
  id: string
  type: "folder" | "request"
  item: HoppCollection | HoppRESTRequest
  inheritedProperties: HoppInheritedProperty
}

const props = defineProps({
  collectionData: {
    type: Object as PropType<HoppCollection>,
    default: null,
  },
  allItems: {
    type: Array as PropType<DocumentationItem[]>,
    default: () => [],
  },
  updateUrlOnSelect: {
    type: Boolean,
    default: false,
  },
})

const router = useRouter()
const route = useRoute()

/**
 * Handles a request being selected from the collection structure sidebar
 */
const handleRequestSelect = (request: HoppRESTRequest) => {
  const requestId = request.id || (request as any)._ref_id
  if (requestId) {
    scrollToItem(requestId)
    if (props.updateUrlOnSelect) {
      router.replace({ query: { ...route.query, section: requestId } })
    }
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
    if (props.updateUrlOnSelect) {
      router.replace({ query: { ...route.query, section: folderId } })
    }
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
      console.error("Item not found:", id)
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
    console.error(`${type} with name "${name}" not found in allItems`)
  }
}

const mainContentRef = ref<HTMLElement | null>(null)

/**
 * Scrolls the main content to the top
 */
const handleScrollToTop = () => {
  if (mainContentRef.value) {
    mainContentRef.value.scrollTo({
      top: 0,
      behavior: "smooth",
    })
  }

  // Clear the section query parameter when scrolling to top
  if (props.updateUrlOnSelect) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { section, ...restQuery } = route.query
    router.replace({ query: restQuery })
  }
}

const getInheritedProperties = (
  item: DocumentationItem
): HoppInheritedProperty => {
  return item.inheritedProperties
}

// Scroll to the section specified in the URL on mount
onMounted(() => {
  if (props.updateUrlOnSelect) {
    const sectionId = route.query.section as string
    if (sectionId) {
      scrollToItem(sectionId)
    }
  }
})
</script>
