<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('documentation.title')"
    :full-width-body="true"
    styles="sm:max-w-6xl"
    @close="hideModal"
  >
    <template #body>
      <div class="w-full h-[80vh] overflow-hidden">
        <div class="flex h-full">
          <div class="flex-1 flex">
            <CollectionsDocumentationPreview
              v-if="currentCollection"
              v-model:documentation-description="documentationDescription"
              :collection="currentCollection"
              :collection-i-d="collectionID"
              :path-or-i-d="pathOrID"
              :folder-path="folderPath"
              :request-index="requestIndex"
              :request-i-d="requestID"
              :team-i-d="teamID"
              :is-team-collection="isTeamCollection"
              :all-items="allItems"
              :show-all-documentation="showAllDocumentation"
              :is-processing-documentation="isProcessingDocumentation"
              :processing-progress="processingProgress"
              :is-external-loading="loadingState || isLoadingTeamCollection"
              @close-modal="hideModal"
              @toggle-all-documentation="handleToggleAllDocumentation"
            />
            <CollectionsDocumentationRequestPreview
              v-else-if="request"
              v-model:documentation-description="documentationDescription"
              :request="request"
              :collection-i-d="collectionID"
              :path-or-i-d="pathOrID"
              :folder-path="folderPath"
              :request-index="requestIndex"
              :request-i-d="requestID"
              :team-i-d="teamID"
              @close-modal="hideModal"
            />
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonSecondary
          :label="t('action.close')"
          outline
          filled
          @click="hideModal"
        />
        <HoppButtonPrimary
          :label="t('action.save')"
          :loading="isSavingDocumentation"
          :disabled="isSavingDocumentation"
          outline
          filled
          @click="saveDocumentation"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script lang="ts" setup>
import { ref, computed, watch, nextTick } from "vue"
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { useDocumentationWorker } from "~/composables/useDocumentationWorker"
import { useService } from "dioc/vue"

import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { TeamCollection } from "~/helpers/teams/TeamCollection"

import {
  editRESTCollection,
  editRESTFolder,
  editRESTRequest,
} from "~/newstore/collections"

import { updateTeamCollection } from "~/helpers/backend/mutations/TeamCollection"
import { updateTeamRequest } from "~/helpers/backend/mutations/TeamRequest"
import {
  CollectionDataProps,
  getSingleTeamCollectionJSON,
  teamCollToHoppRESTColl,
} from "~/helpers/backend/helpers"
import { GQLError } from "~/helpers/backend/GQLClient"
import { getErrorMessage } from "~/helpers/backend/mutations/MockServer"

import {
  DocumentationService,
  type DocumentationItem,
} from "~/services/documentation.service"

import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"

const t = useI18n()
const toast = useToast()
const documentationService = useService(DocumentationService)

const isLoadingTeamCollection = ref<boolean>(false)
const isSavingDocumentation = ref<boolean>(false)
const allItems = ref<Array<any>>([])
const showAllDocumentation = ref<boolean>(false)

const {
  isProcessing: isProcessingDocumentation,
  progress: processingProgress,
  processDocumentation,
} = useDocumentationWorker()

const props = withDefaults(
  defineProps<{
    show?: boolean
    loadingState?: boolean
    hasTeamWriteAccess?: boolean
    collectionID?: string
    pathOrID: string | null
    collection?: HoppCollection | TeamCollection | null
    folderPath?: string | null
    requestIndex?: number | null
    requestID?: string | null
    request?: HoppRESTRequest | null
    teamID?: string
    isTeamCollection?: boolean
  }>(),
  {
    show: false,
    loadingState: false,
    hasTeamWriteAccess: true,
    isTeamCollection: false,
    collectionID: "",
    collection: null,
    folderPath: null,
    requestIndex: null,
    requestID: null,
    request: null,
    teamID: undefined,
  }
)

// Store the full collection data with all nested folders and requests
const fullCollectionData = ref<HoppCollection | null>(null)

const fetchTeamCollection = async () => {
  if (!props.isTeamCollection || !props.collection?.id || !props.teamID) {
    return
  }

  isLoadingTeamCollection.value = true

  try {
    const data = await getSingleTeamCollectionJSON(
      props.teamID,
      props.collection.id
    )

    if (data && E.isRight(data)) {
      const parsedCollection = JSON.parse(data.right)
      fullCollectionData.value = parsedCollection
    } else {
      fullCollectionData.value = teamCollToHoppRESTColl(
        props.collection as TeamCollection
      )
    }
  } catch (error) {
    fullCollectionData.value = teamCollToHoppRESTColl(
      props.collection as TeamCollection
    )
  } finally {
    isLoadingTeamCollection.value = false
  }
}

// Get the current collection - use fetched data only after toggleAllDocumentation is clicked
const currentCollection = computed<HoppCollection | null>(() => {
  if (!props.collection) return null

  // For team collections, use the full collection data only if available (after toggle)
  if (props.isTeamCollection && fullCollectionData.value) {
    return fullCollectionData.value
  }

  if (props.isTeamCollection) {
    return teamCollToHoppRESTColl(props.collection as TeamCollection)
  }

  // Use the prop collection by default
  return props.collection as HoppCollection
})

// Handle toggle all documentation - process items in parent
const handleToggleAllDocumentation = async () => {
  if (!showAllDocumentation.value) {
    // For team collections, fetch latest collection data first
    if (props.isTeamCollection && props.collection?.id && props.teamID) {
      await fetchTeamCollection()
      await nextTick() // Wait for collection to update
    }

    const collectionToProcess = currentCollection.value
    if (!collectionToProcess) {
      return
    }

    try {
      // Process documentation in parent
      const items = await processDocumentation(
        collectionToProcess as HoppCollection,
        props.pathOrID,
        props.isTeamCollection
      )

      // Set processed items and toggle state - child will react automatically
      allItems.value = items
      showAllDocumentation.value = true
    } catch (error) {
      console.error("Error processing documentation:", error)
      allItems.value = []
      showAllDocumentation.value = false
    }
  } else {
    // Hide all documentation - child will react automatically
    showAllDocumentation.value = false
    allItems.value = []
  }
}

// Reset fetched collection data when modal opens/closes
watch(
  () => props.show,
  (isVisible) => {
    if (!isVisible) {
      // Reset when modal closes
      fullCollectionData.value = null
      isLoadingTeamCollection.value = false
      // Clear all processed items
      allItems.value = []
      showAllDocumentation.value = false
      // Clear documentation service changes
      documentationService.clearAll()
    }
  }
)

const documentationDescription = ref<string>("")

watch(
  () => currentCollection.value,
  (newCollection) => {
    if (newCollection) {
      documentationDescription.value = newCollection.description || ""
    } else if (props.request) {
      documentationDescription.value = props.request.description || ""
    } else {
      documentationDescription.value = ""
    }
  },
  { immediate: true }
)

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "update:modelValue"): void
}>()

const saveDocumentation = async () => {
  if (!props.hasTeamWriteAccess) {
    toast.error(t("documentation.no_write_access"))
    return
  }

  try {
    // Get all changed items from documentation service
    const changedItems = documentationService.getChangedItems()

    if (changedItems.length === 0 && !showAllDocumentation.value) {
      // No changes to save, but save current documentation description if exists
      if (currentCollection.value && props.pathOrID) {
        await saveCollectionDocumentation()
      } else if (
        props.request &&
        props.folderPath !== undefined &&
        props.folderPath !== null &&
        props.requestIndex !== undefined &&
        props.requestIndex !== null
      ) {
        await saveRequestDocumentation()
      }
    } else {
      // Save all changed items from documentation service
      for (const item of changedItems) {
        if (item.type === "collection") {
          await saveCollectionDocumentationById(item)
        } else if (item.type === "request") {
          await saveRequestDocumentationById(item)
        }
      }

      // Clear all changes after successful save
      documentationService.clearAll()
    }
  } catch (error) {
    console.error("Error saving documentation:", error)
    toast.error(t("documentation.save_error"))
  }
}

const saveCollectionDocumentation = async () => {
  const collection = currentCollection.value!

  if (props.isTeamCollection) {
    // Set loading state for team operations only
    isSavingDocumentation.value = true

    // Team collection data
    const data: CollectionDataProps = {
      auth: collection.auth || { authType: "inherit", authActive: true },
      headers: collection.headers || [],
      variables: collection.variables || [],
      description: documentationDescription.value,
    }

    pipe(
      updateTeamCollection(collection.id!, data),
      TE.match(
        (err: GQLError<string>) => {
          toast.error(`${getErrorMessage(err)}`)
          isSavingDocumentation.value = false
        },
        () => {
          toast.success(t("documentation.save_success"))
          isSavingDocumentation.value = false
        }
      )
    )()
  } else {
    // Personal collection (no loading state)
    const updatedCollection = {
      ...collection,
      description: documentationDescription.value,
    }

    // Check if this is a root collection or a folder
    const pathSegments = props.pathOrID!.split("/")
    if (pathSegments.length === 1) {
      editRESTCollection(parseInt(props.pathOrID!), updatedCollection)
    } else {
      editRESTFolder(props.pathOrID!, updatedCollection)
    }
    toast.success(t("documentation.save_success"))
  }
}

const saveRequestDocumentation = async () => {
  const updatedRequest = {
    ...props.request!,
    description: documentationDescription.value,
  }

  if (props.isTeamCollection && props.requestID) {
    // Set loading state for team operations only
    isSavingDocumentation.value = true

    const data = {
      request: JSON.stringify(updatedRequest),
      title: updatedRequest.name,
    }

    pipe(
      updateTeamRequest(props.requestID!, data),
      TE.match(
        (err: GQLError<string>) => {
          toast.error(`${getErrorMessage(err)}`)
          isSavingDocumentation.value = false
        },
        () => {
          toast.success(t("documentation.save_success"))
          isSavingDocumentation.value = false
        }
      )
    )()
  } else {
    // Personal request
    editRESTRequest(props.folderPath!, props.requestIndex!, updatedRequest)
    toast.success(t("documentation.save_success"))
  }
}

// Save collection documentation by ID
const saveCollectionDocumentationById = async (item: DocumentationItem) => {
  // Type guard to ensure it's a collection item
  if (item.type !== "collection") return

  const {
    id: collectionId,
    documentation,
    isTeamItem,
    pathOrID,
    collectionData,
  } = item

  if (isTeamItem) {
    // Set loading state for team operations only
    isSavingDocumentation.value = true

    // Use the stored collection data from the service
    if (collectionData) {
      const data: CollectionDataProps = {
        auth: collectionData.auth || { authType: "inherit", authActive: true },
        headers: collectionData.headers || [],
        variables: collectionData.variables || [],
        description: documentation,
      }

      pipe(
        updateTeamCollection(collectionId, data),
        TE.match(
          (err: GQLError<string>) => {
            toast.error(`${getErrorMessage(err)}`)
            isSavingDocumentation.value = false
          },
          () => {
            toast.success(t("documentation.save_success"))
            isSavingDocumentation.value = false
          }
        )
      )()
    } else {
      toast.error("Collection data not found in service")
      isSavingDocumentation.value = false
    }
  } else {
    if (pathOrID && collectionData) {
      const updatedCollection = {
        ...collectionData,
        description: documentation,
      }

      // Check if this is a root collection or a folder
      const pathSegments = pathOrID.split("/")
      if (pathSegments.length === 1) {
        editRESTCollection(parseInt(pathOrID), updatedCollection)
      } else {
        editRESTFolder(pathOrID, updatedCollection)
      }
      toast.success(t("documentation.save_success"))
    } else {
      toast.error("Collection path or data not found")
    }
  }
}

// Save request documentation by ID
const saveRequestDocumentationById = async (item: DocumentationItem) => {
  if (item.type !== "request") return

  const { documentation, isTeamItem, folderPath, requestData } = item

  if (isTeamItem) {
    // Set loading state for team operations only
    isSavingDocumentation.value = true

    // For team requests, check if requestID exists
    if (requestData && item.requestID) {
      const updatedRequest = {
        ...requestData,
        description: documentation,
      }

      const data = {
        request: JSON.stringify(updatedRequest),
        title: updatedRequest.name,
      }

      pipe(
        updateTeamRequest(item.requestID, data),
        TE.match(
          (err: GQLError<string>) => {
            toast.error(`${getErrorMessage(err)}`)
            isSavingDocumentation.value = false
          },
          () => {
            toast.success(t("documentation.save_success"))
            isSavingDocumentation.value = false
          }
        )
      )()
    } else {
      toast.error("Team request data not found in service")
      isSavingDocumentation.value = false
    }
  } else {
    if (
      folderPath !== undefined &&
      item.requestIndex !== undefined &&
      requestData
    ) {
      const updatedRequest = {
        ...requestData,
        description: documentation,
      }

      editRESTRequest(folderPath, item.requestIndex, updatedRequest)
      toast.success(t("documentation.save_success"))
    } else {
      toast.error("Personal request data not found in service")
    }
  }
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
