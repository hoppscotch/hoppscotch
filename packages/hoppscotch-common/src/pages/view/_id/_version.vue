<template>
  <div class="flex flex-col min-h-screen bg-primary">
    <DocumentationHeader
      v-if="!loading && !error && publishedDoc"
      :published-doc="publishedDoc"
      :instance-display-name="instanceDisplayName"
    />

    <DocumentationSkeleton v-if="loading" />

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

    <DocumentationContent
      v-else-if="collectionData"
      :collection-data="collectionData"
      :all-items="allItems"
    />
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
import { PublishedDocs } from "~/helpers/backend/graphql"
import { getKernelMode } from "@hoppscotch/kernel"
import { useService } from "dioc/vue"
import { InstanceSwitcherService } from "~/services/instance-switcher.service"
import { useReadonlyStream } from "~/composables/stream"

const route = useRoute()
const t = useI18n()

const kernelMode = getKernelMode()
const instanceSwitcherService =
  kernelMode === "desktop" ? useService(InstanceSwitcherService) : null

const currentState =
  kernelMode === "desktop" && instanceSwitcherService
    ? useReadonlyStream(
        instanceSwitcherService.getStateStream(),
        instanceSwitcherService.getCurrentState().value
      )
    : ref({
        status: "disconnected",
        instance: { displayName: "Hoppscotch" },
      })

const instanceDisplayName = computed(() => {
  if (currentState.value.status !== "connected") {
    return "Hoppscotch"
  }
  return currentState.value.instance.displayName
})

const publishedDoc = ref<Partial<PublishedDocs> | null>(null)
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
  if (collection.folders && collection.folders.length > 0) {
    collection.folders.forEach((folder: HoppCollection) => {
      items.push({
        id: folder.id || (folder as any)._ref_id || `folder-${folder.name}`,
        type: "folder",
        item: folder,
      })
      flattenCollection(folder, items)
    })
  }

  // collectionFolderToHoppCollection ensures all requests are converted to the latest version
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

  publishedDoc.value = {
    autoSync: false,
    createdOn: result.right.createdOn,
    id: result.right.id,
    updatedOn: result.right.updatedOn,
    version: result.right.version,
    metadata: result.right.metadata,
    title: result.right.title,
    creator: result.right.creator,
  }

  console.log("publishedDoc.value", publishedDoc.value)

  const publishedData = JSON.parse(result.right.documentTree)

  // Convert the REST API response (CollectionFolder) to HoppCollection format
  const hoppCollection = collectionFolderToHoppCollection(publishedData)
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
