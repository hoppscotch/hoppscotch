<template>
  <div class="flex flex-col h-screen overflow-hidden bg-primary">
    <DocumentationHeader
      v-if="!loading && !error && publishedDoc"
      :published-doc="publishedDoc"
      :versions="availableVersions"
      :instance-display-name="instanceDisplayName"
      :environment-name="environmentName"
      :environment-enabled="environmentEnabled"
      @toggle-environment="handleEnvironmentToggle"
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
      :is-doc-modal="false"
      :all-items="allItems"
      :update-url-on-select="true"
      :environment-variables="environmentVariables"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from "vue"
import { useRoute } from "vue-router"
import { useI18n } from "~/composables/i18n"
import {
  getPublishedDocByIDREST,
  collectionFolderToHoppCollection,
} from "~/helpers/backend/queries/PublishedDocs"
import * as E from "fp-ts/Either"
import IconAlertCircle from "~icons/lucide/alert-circle"
import {
  Environment,
  HoppCollection,
  HoppRESTRequest,
  translateToNewEnvironmentVariables,
} from "@hoppscotch/data"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import {
  PublishedDocREST,
  PublishedDocsVersion,
} from "~/helpers/backend/queries/PublishedDocs"

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

const publishedDoc = ref<Partial<PublishedDocREST> | null>(null)
const availableVersions = ref<PublishedDocsVersion[]>([])
const collectionData = ref<HoppCollection | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const environmentVariables = ref<Environment["variables"]>([])
// Store the original parsed env vars so we can restore them when toggling
const parsedEnvironmentVariables = ref<Environment["variables"]>([])
const environmentName = ref<string | null>(null)
const environmentEnabled = ref(true)

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

const fetchDocs = async (docId: string, version: string) => {
  loading.value = true
  error.value = null

  if (!docId) {
    error.value = t("documentation.publish.no_doc_id")
    loading.value = false
    return
  }

  // Fetch published doc using REST API (public access, no authentication required)
  // If version is provided, fetch that specific version; otherwise fetch latest
  const result = await getPublishedDocByIDREST(docId, version)()

  console.log("result", result)

  if (E.isLeft(result)) {
    console.error("Error fetching published doc:", result.left)
    error.value = t("documentation.publish.not_found")
    loading.value = false
    return
  }

  publishedDoc.value = {
    autoSync: result.right.autoSync ?? false,
    createdOn: result.right.createdOn,
    id: result.right.id,
    updatedOn: result.right.updatedOn,
    version: result.right.version,
    metadata: result.right.metadata,
    title: result.right.title,
    creatorUid: result.right.creatorUid,
    versions: result.right.versions,
  }

  // Store environment name from the published doc response
  environmentName.value = result.right.environmentName ?? null

  // Parse environment variables from the published doc response
  const rawEnvVars = result.right.environmentVariables
  if (rawEnvVars) {
    try {
      const parsed =
        typeof rawEnvVars === "string" ? JSON.parse(rawEnvVars) : rawEnvVars
      if (Array.isArray(parsed)) {
        parsedEnvironmentVariables.value = parsed.map((v) => {
          const normalized = translateToNewEnvironmentVariables(v)
          // Ensure currentValue falls back to initialValue
          return {
            ...normalized,
            currentValue: normalized.currentValue || normalized.initialValue,
          }
        })
      }
    } catch (e) {
      console.error("Error parsing environment variables:", e)
      parsedEnvironmentVariables.value = []
    }
  }

  if (availableVersions.value.length === 0 && result.right.versions) {
    availableVersions.value = result.right.versions
  }

  // Apply environment variables based on toggle state
  // Reset to enabled for new version fetches
  environmentEnabled.value = !!environmentName.value
  environmentVariables.value = environmentEnabled.value
    ? parsedEnvironmentVariables.value
    : []

  const publishedData = JSON.parse(result.right.documentTree)

  // Convert the REST API response (CollectionFolder) to HoppCollection format
  const hoppCollection = collectionFolderToHoppCollection(publishedData)

  collectionData.value = hoppCollection

  loading.value = false
}

const handleEnvironmentToggle = (enabled: boolean) => {
  environmentEnabled.value = enabled
  environmentVariables.value = enabled ? parsedEnvironmentVariables.value : []
}

onMounted(() => {
  const docId = route.params.id as string
  const version = route.params.version as string
  fetchDocs(docId, version)
})

watch(
  () => [route.params.id, route.params.version],
  ([newId, newVersion], [oldId, oldVersion]) => {
    if (newId !== oldId || newVersion !== oldVersion) {
      fetchDocs(newId as string, newVersion as string)
    }
  }
)

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
