<template>
  <div class="flex flex-col lg:flex-row gap-4 flex-1">
    <!-- Left Metadata Panel -->
    <div class="lg:w-72 flex-shrink-0 flex flex-col space-y-3">
      <!-- Title & version header -->
      <div class="space-y-2">
        <h3 class="text-sm font-semibold text-secondaryDark truncate">
          {{ existingData?.title }}
        </h3>
        <div class="flex items-center space-x-2">
          <span
            class="text-xs text-secondaryLight rounded border border-dividerDark px-2 py-0.5"
          >
            {{ existingData?.version }}
          </span>
        </div>
        <!-- Environment badge -->
        <div
          v-if="existingData?.environmentName"
          class="flex items-center space-x-1.5"
        >
          <icon-lucide-layers
            class="w-3 h-3 text-secondaryLight flex-shrink-0"
          />
          <span class="text-xs text-secondaryLight">
            {{ existingData.environmentName }}
          </span>
        </div>
      </div>

      <hr class="border-divider" />

      <!-- Published URL -->
      <div class="space-y-3">
        <div v-if="publishedUrl" class="space-y-1">
          <label
            class="text-[10px] font-semibold uppercase tracking-wider text-secondaryLight"
          >
            {{ t("documentation.publish.published_url") }}
          </label>
          <div
            class="flex items-center rounded border border-divider bg-primaryLight"
          >
            <span
              class="flex-1 px-2.5 py-1.5 text-xs text-secondary truncate select-all"
            >
              {{ publishedUrl }}
            </span>
            <div class="flex items-center border-l border-divider">
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('documentation.publish.copy_url')"
                :icon="copyIcon"
                class="!rounded-none !px-2 !py-1.5"
                @click="handleCopyUrl"
              />
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('documentation.publish.open_published_doc')"
                :icon="IconExternalLink"
                class="!rounded-none !rounded-r !px-2 !py-1.5"
                @click="$emit('viewPublished')"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Status notice -->
      <div
        v-if="existingData && !isLive"
        class="flex items-start space-x-2 px-3 py-2.5 rounded-md bg-primaryLight border border-divider"
      >
        <icon-lucide-lock
          class="w-3.5 h-3.5 text-secondaryLight flex-shrink-0 mt-0.5"
        />
        <span class="text-xs text-secondaryLight leading-relaxed">
          {{ t("documentation.publish.version_immutable") }}
        </span>
      </div>
      <div
        v-else-if="existingData && isLive"
        class="flex items-start space-x-2 px-3 py-2.5 rounded-md bg-green-500/5 border border-green-500/15"
      >
        <icon-lucide-refresh-cw
          class="w-3.5 h-3.5 text-green-600 flex-shrink-0 mt-0.5"
        />
        <span class="text-xs text-green-600 leading-relaxed">
          {{ t("documentation.publish.auto_sync_live_notice") }}
        </span>
      </div>
    </div>

    <!-- Right: Snapshot Preview -->
    <div
      class="flex-1 min-w-0 rounded-md border border-divider flex flex-col overflow-hidden bg-primary"
    >
      <!-- Loading state -->
      <div
        v-if="isLoadingSnapshot"
        class="flex items-center justify-center flex-1 min-h-[300px]"
      >
        <div class="flex flex-col items-center space-y-3">
          <HoppSmartSpinner />
          <span class="text-xs text-secondaryLight">
            {{ t("documentation.publish.loading_snapshot") }}
          </span>
        </div>
      </div>

      <!-- Error state -->
      <div
        v-else-if="snapshotError"
        class="flex items-center justify-center flex-1 min-h-[300px]"
      >
        <div class="flex flex-col items-center space-y-3">
          <icon-lucide-alert-circle class="w-5 h-5 text-red-400" />
          <span class="text-xs text-secondaryLight">
            {{ t("documentation.publish.snapshot_load_error") }}
          </span>
          <HoppButtonSecondary
            :label="t('documentation.publish.retry_snapshot')"
            :icon="IconRefreshCw"
            outline
            @click="fetchSnapshotPreview"
          />
        </div>
      </div>

      <!-- Empty state -->
      <div
        v-else-if="!snapshotCollectionData"
        class="flex items-center justify-center flex-1 min-h-[300px]"
      >
        <div class="flex flex-col items-center space-y-2">
          <icon-lucide-file-x class="w-5 h-5 text-secondaryLight" />
          <span class="text-xs text-secondaryLight">
            {{ t("documentation.publish.snapshot_empty") }}
          </span>
        </div>
      </div>

      <!-- Snapshot content -->
      <div v-else-if="snapshotCollectionData" class="h-[60vh] flex flex-col">
        <DocumentationContent
          :collection-data="snapshotCollectionData"
          :all-items="snapshotItems"
          :update-url-on-select="false"
          :compact="true"
          :is-doc-modal="true"
          :environment-variables="snapshotEnvironmentVariables"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, markRaw, computed } from "vue"
import { useI18n } from "~/composables/i18n"
import {
  HoppCollection,
  HoppRESTRequest,
  Environment,
  translateToNewEnvironmentVariables,
} from "@hoppscotch/data"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import {
  getPublishedDocBySlugREST,
  collectionFolderToHoppCollection,
} from "~/helpers/backend/queries/PublishedDocs"
import * as E from "fp-ts/Either"
import { refAutoReset } from "@vueuse/core"

import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import IconExternalLink from "~icons/lucide/external-link"
import IconRefreshCw from "~icons/lucide/refresh-cw"
import { isLiveVersion } from "~/services/documentation.service"

const t = useI18n()

type ExistingData = {
  title: string
  version: string
  autoSync: boolean
  url: string
  environmentName?: string | null
  environmentID?: string | null
}

const props = defineProps<{
  existingData?: ExistingData
  publishedUrl: string | null
  show: boolean
}>()

const emit = defineEmits<{
  (e: "copyUrl"): void
  (e: "viewPublished"): void
}>()

const copyIcon = refAutoReset(markRaw(IconCopy), 3000)

const handleCopyUrl = () => {
  copyIcon.value = markRaw(IconCheck)
  emit("copyUrl")
}

// Snapshot state
type SnapshotDocumentationItem = {
  id: string
  type: "folder" | "request"
  item: HoppCollection | HoppRESTRequest
  inheritedProperties: HoppInheritedProperty
}

const isLoadingSnapshot = ref(false)
const snapshotError = ref(false)
const snapshotCollectionData = ref<HoppCollection | null>(null)
const snapshotItems = ref<SnapshotDocumentationItem[]>([])
const snapshotEnvironmentVariables = ref<Environment["variables"]>([])

/**
 * Checks whether the currently displayed published doc is the live (current) version.
 */
const isLive = computed(() => {
  if (!props.existingData) return true
  return isLiveVersion(props.existingData)
})

/**
 * Extracts slug and version from a published doc URL
 */
const extractSlugFromUrl = (
  url: string
): { slug: string; version: string } | null => {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split("/").filter(Boolean)
    const viewIndex = pathParts.indexOf("view")
    if (viewIndex !== -1 && pathParts.length > viewIndex + 2) {
      return {
        slug: pathParts[viewIndex + 1],
        version: pathParts[viewIndex + 2],
      }
    }
  } catch {
    const match = url.match(/\/view\/([^/]+)\/([^/]+)/)
    if (match) {
      return { slug: match[1], version: match[2] }
    }
  }
  return null
}

/**
 * Recursively flattens a collection into documentation items
 */
const flattenCollection = (
  collection: HoppCollection,
  items: SnapshotDocumentationItem[] = [],
  inheritedProperties: HoppInheritedProperty | undefined = undefined
): SnapshotDocumentationItem[] => {
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

/**
 * Fetches the snapshot documentTree via REST and converts it for display
 */
const fetchSnapshotPreview = async () => {
  if (!props.existingData?.url) return

  const parsed = extractSlugFromUrl(props.existingData.url)
  if (!parsed) {
    snapshotError.value = true
    return
  }

  isLoadingSnapshot.value = true
  snapshotError.value = false
  snapshotCollectionData.value = null
  snapshotItems.value = []
  snapshotEnvironmentVariables.value = []

  try {
    const result = await getPublishedDocBySlugREST(
      parsed.slug,
      parsed.version
    )()

    if (E.isLeft(result)) {
      snapshotError.value = true
      return
    }

    // Parse environment variables from the snapshot
    const rawEnvVars = result.right.environmentVariables
    if (rawEnvVars) {
      try {
        const parsedVars =
          typeof rawEnvVars === "string" ? JSON.parse(rawEnvVars) : rawEnvVars
        if (Array.isArray(parsedVars)) {
          snapshotEnvironmentVariables.value = parsedVars.map((v) => {
            const normalized = translateToNewEnvironmentVariables(v)
            // Ensure currentValue falls back to initialValue
            return {
              ...normalized,
              currentValue: normalized.currentValue || normalized.initialValue,
            }
          })
        }
      } catch (e) {
        console.error("Error parsing snapshot environment variables:", e)
      }
    }

    const publishedData = JSON.parse(result.right.documentTree)
    const hoppCollection = collectionFolderToHoppCollection(publishedData)
    snapshotCollectionData.value = hoppCollection
    snapshotItems.value = flattenCollection(hoppCollection)
  } catch (error) {
    console.error("Error loading snapshot preview:", error)
    snapshotError.value = true
  } finally {
    isLoadingSnapshot.value = false
  }
}

const cleanup = () => {
  snapshotCollectionData.value = null
  snapshotItems.value = []
  snapshotError.value = false
  snapshotEnvironmentVariables.value = []
}

// Fetch snapshot when component becomes visible
watch(
  () => props.show,
  (isVisible) => {
    if (isVisible && props.existingData?.url) {
      fetchSnapshotPreview()
    } else if (!isVisible) {
      cleanup()
    }
  },
  { immediate: true }
)
</script>
