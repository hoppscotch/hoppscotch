<template>
  <div class="flex flex-col h-screen overflow-hidden bg-primary">
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
      :update-url-on-select="true"
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
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import { PublishedDocs } from "~/helpers/backend/graphql"
import { getKernelMode } from "@hoppscotch/kernel"
import { platform } from "~/platform"
import { useReadonlyStream } from "~/composables/stream"
import { usePageHead } from "~/composables/head"

const route = useRoute()
const t = useI18n()

const kernelMode = getKernelMode()

const instancePlatform = platform.instance

const currentState =
  kernelMode === "desktop" &&
  instancePlatform?.instanceSwitchingEnabled &&
  instancePlatform.getConnectionStateStream
    ? useReadonlyStream(
        instancePlatform.getConnectionStateStream(),
        instancePlatform.getCurrentConnectionState?.() ?? {
          status: "disconnected" as const,
        }
      )
    : ref({
        status: "disconnected" as const,
        instance: { displayName: "Hoppscotch" },
      })

const instanceDisplayName = computed(() => {
  if (currentState.value.status !== "connected") {
    return "Hoppscotch"
  }
  return currentState.value.instance.displayName
})

const publishedDoc = ref<Partial<PublishedDocs> | null>(null)
const collectionData = ref<HoppCollection | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

type DocumentationItem = {
  id: string
  type: "folder" | "request"
  item: HoppCollection | HoppRESTRequest
  inheritedProperties: HoppInheritedProperty
}

/**
 * Recursively flattens a collection into an array of documentation items
 */
const flattenCollection = (
  collection: HoppCollection,
  items: DocumentationItem[] = [],
  inheritedProperties: HoppInheritedProperty | undefined = undefined
): DocumentationItem[] => {
  const currentInheritedProps: HoppInheritedProperty = {
    auth:
      collection.auth.authType === "inherit"
        ? (inheritedProperties?.auth ?? {
            parentID: "",
            parentName: "",
            inheritedAuth: { authType: "none", authActive: true },
          })
        : {
            parentID: collection.id || "",
            parentName: collection.name,
            inheritedAuth: collection.auth,
          },
    headers: [
      ...(inheritedProperties?.headers || []),
      ...(collection.headers || []).map((h) => ({
        parentID: collection.id || "",
        parentName: collection.name,
        inheritedHeader: h,
      })),
    ],
    variables: [
      ...(inheritedProperties?.variables || []),
      {
        parentID: collection.id || "",
        parentName: collection.name,
        inheritedVariables: (collection.variables || []).map((v) => ({
          ...v,
          secret: v.secret,
        })),
      },
    ],
  }

  if (collection.folders && collection.folders.length > 0) {
    collection.folders.forEach((folder: HoppCollection) => {
      items.push({
        id: folder.id || (folder as any)._ref_id || `folder-${folder.name}`,
        type: "folder",
        item: folder,
        inheritedProperties: currentInheritedProps,
      })
      flattenCollection(folder, items, currentInheritedProps)
    })
  }

  // collectionFolderToHoppCollection ensures all requests are converted to the latest version
  if (collection.requests && collection.requests.length > 0) {
    ;(collection.requests as HoppRESTRequest[]).forEach((request) => {
      items.push({
        id: request.id || (request as any)._ref_id || `request-${request.name}`,
        type: "request",
        item: request,
        inheritedProperties: currentInheritedProps,
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
  // will use in next iteration
  //const version = route.params.version as string

  if (!docId) {
    error.value = "No document ID provided"
    loading.value = false
    return
  }

  // Fetch published doc using REST API (public access, no authentication required)
  const result = await getPublishedDocByIDREST(docId)()

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

  const publishedData = JSON.parse(result.right.documentTree)

  // Convert the REST API response (CollectionFolder) to HoppCollection format
  const hoppCollection = collectionFolderToHoppCollection(publishedData)
  collectionData.value = hoppCollection

  loading.value = false
})

usePageHead({
  title: computed(
    () => publishedDoc.value?.title || "Hoppscotch Documentation"
  ),
  meta: [
    {
      name: "description",
      content: computed(
        () =>
          collectionData.value?.description ||
          "Hoppscotch API Documentation - Open source API development ecosystem"
      ),
    },
    {
      property: "og:title",
      content: computed(
        () => publishedDoc.value?.title || "Hoppscotch Documentation"
      ),
    },
    {
      property: "og:description",
      content: computed(
        () =>
          collectionData.value?.description ||
          "Hoppscotch API Documentation - Open source API development ecosystem"
      ),
    },
    {
      property: "og:site_name",
      content: "Hoppscotch",
    },
    {
      property: "og:image",
      content: "https://hoppscotch.io/banner.png",
    },
    {
      name: "twitter:card",
      content: "summary_large_image",
    },
    {
      name: "twitter:site",
      content: "@hoppscotch_io",
    },
    {
      name: "twitter:creator",
      content: "@hoppscotch_io",
    },
    {
      name: "twitter:title",
      content: computed(
        () => publishedDoc.value?.title || "Hoppscotch Documentation"
      ),
    },
    {
      name: "twitter:description",
      content: computed(
        () =>
          collectionData.value?.description ||
          "Hoppscotch API Documentation - Open source API development ecosystem"
      ),
    },
    {
      name: "twitter:image",
      content: "https://hoppscotch.io/banner.png",
    },
  ],
})
</script>

<route lang="yaml">
meta:
  layout: empty
</route>
