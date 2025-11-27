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
              :has-team-write-access="hasTeamWriteAccess"
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
              class="p-4"
              @close-modal="hideModal"
            />
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-between items-center w-full">
        <span class="flex space-x-2">
          <HoppButtonPrimary
            v-if="hasTeamWriteAccess"
            :label="t('action.save')"
            :loading="isSavingDocumentation"
            :disabled="isSavingDocumentation"
            outline
            filled
            @click="saveDocumentation"
          />
          <HoppButtonSecondary
            :label="t('action.close')"
            outline
            filled
            @click="hideModal"
          />
        </span>

        <div class="flex space-x-2 items-center">
          <!-- Publish Button - Simple button when not published -->
          <HoppButtonSecondary
            v-if="
              currentCollection && !isCollectionPublished && hasTeamWriteAccess
            "
            :icon="IconShare2"
            :label="t('documentation.publish.button')"
            outline
            filled
            @click="openPublishModal"
          />
          <tippy
            v-else-if="
              currentCollection && isCollectionPublished && hasTeamWriteAccess
            "
            ref="publishedDropdown"
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => publishedDropdownActions?.focus()"
          >
            <div
              class="flex items-center border border-accent pl-4 pr-2 rounded cursor-pointer"
            >
              <icon-lucide-globe class="svg-icons" />

              <HoppButtonSecondary
                :icon="IconCheveronDown"
                reverse
                :label="t('documentation.publish.published')"
                class="!pr-2"
              />
            </div>

            <template #content="{ hide }">
              <div
                ref="publishedDropdownActions"
                class="flex flex-col focus:outline-none"
                tabindex="0"
                @keyup.escape="hide()"
              >
                <div class="flex flex-col space-y-2">
                  <div class="flex items-center space-x-2">
                    <HoppSmartInput
                      :model-value="existingPublishedData?.url"
                      disabled
                      class="flex-1 !min-w-60"
                    />
                    <HoppButtonSecondary
                      v-tippy="{ theme: 'tooltip' }"
                      :title="t('documentation.publish.copy_url')"
                      :icon="copyIcon"
                      @click="copyPublishedUrl"
                    />
                  </div>

                  <HoppSmartItem
                    reverse
                    :icon="IconPenLine"
                    :label="t('documentation.publish.edit_published_doc')"
                    @click="
                      () => {
                        hide()
                        openPublishModal()
                      }
                    "
                  />
                </div>
              </div>
            </template>
          </tippy>
          <HoppButtonSecondary
            v-if="currentCollection"
            :icon="isDocumentationProcessing ? IconLoader2 : IconFileText"
            :label="
              isDocumentationProcessing
                ? t('documentation.fetching_documentation')
                : showAllDocumentation
                  ? t('documentation.hide_all_documentation')
                  : t('documentation.show_all_documentation')
            "
            filled
            outline
            @click="handleToggleAllDocumentation"
          />
        </div>
      </div>
    </template>
  </HoppSmartModal>

  <CollectionsDocumentationPublishDocModal
    v-if="currentCollection && collectionID"
    :show="showPublishModal"
    :collection-i-d="collectionID"
    :collection-title="
      currentCollection.name || t('documentation.untitled_collection')
    "
    :workspace-type="isTeamCollection ? WorkspaceType.Team : WorkspaceType.User"
    :workspace-i-d="isTeamCollection ? teamID || '' : ''"
    :mode="publishModalMode"
    :published-doc-id="publishedDocId"
    :existing-data="existingPublishedData"
    :loading="isProcessingPublish"
    @hide-modal="showPublishModal = false"
    @publish="handlePublish"
    @update="handleUpdate"
    @delete="handleDelete"
  />
</template>

<script lang="ts" setup>
import { ref, computed, watch, nextTick, onUnmounted, markRaw } from "vue"
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

import IconFileText from "~icons/lucide/file-text"
import IconLoader2 from "~icons/lucide/loader-2"
import IconShare2 from "~icons/lucide/share-2"
import IconPenLine from "~icons/lucide/pen-line"
import IconCheveronDown from "~icons/lucide/chevron-down"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"

import {
  WorkspaceType,
  CreatePublishedDocsArgs,
  UpdatePublishedDocsArgs,
} from "~/helpers/backend/graphql"
import {
  createPublishedDoc,
  deletePublishedDoc,
  updatePublishedDoc,
} from "~/helpers/backend/mutations/PublishedDocs"

import { TippyComponent } from "vue-tippy"

import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { refAutoReset, useClipboard } from "@vueuse/core"

const t = useI18n()
const toast = useToast()

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

const documentationService = useService(DocumentationService)

const isLoadingTeamCollection = ref<boolean>(false)
const isSavingDocumentation = ref<boolean>(false)
const isProcessingPublish = ref<boolean>(false)

const copyIcon = refAutoReset(markRaw(IconCopy), 3000)
const { copy } = useClipboard()

const allItems = ref<Array<any>>([])

const showAllDocumentation = ref<boolean>(false)
const showPublishModal = ref<boolean>(false)

const publishedDropdown = ref<TippyComponent | null>(null)
const publishedDropdownActions = ref<HTMLDivElement | null>(null)

// Published docs state
const publishedDocStatus = computed(() => {
  if (!props.collectionID) return undefined
  return documentationService.getPublishedDocStatus(props.collectionID)
})

const isCollectionPublished = computed(() => !!publishedDocStatus.value)
const publishedDocId = computed(() => publishedDocStatus.value?.id)
const existingPublishedData = computed(() => {
  if (!publishedDocStatus.value) return undefined
  return {
    title: publishedDocStatus.value.title,
    version: publishedDocStatus.value.version,
    autoSync: publishedDocStatus.value.autoSync,
    url: publishedDocStatus.value.url,
  }
})

const publishModalMode = computed<"create" | "update" | "view">(() => {
  return isCollectionPublished.value ? "update" : "create"
})

const isDocumentationProcessing = computed(() => {
  return isProcessingDocumentation.value || isLoadingTeamCollection.value
})

const {
  isProcessing: isProcessingDocumentation,
  progress: processingProgress,
  processDocumentation,
} = useDocumentationWorker()

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
  async (newVal) => {
    if (newVal) {
      // No need to manually check published docs status as it is now reactive
    } else {
      // Reset when modal closes
      fullCollectionData.value = null
      isLoadingTeamCollection.value = false
      // Clear all processed items
      allItems.value = []
      showAllDocumentation.value = false
      // Clear documentation service changes
      documentationService.clearAll()
    }
  },
  {
    immediate: true,
  }
)

// Ensure cleanup when component is unmounted
onUnmounted(() => {
  documentationService.clearAll()
})

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

const openPublishModal = () => {
  showPublishModal.value = true
}

const copyPublishedUrl = () => {
  if (existingPublishedData.value?.url) {
    copyIcon.value = markRaw(IconCheck)
    copy(existingPublishedData.value.url)

    toast.success(t("documentation.publish.url_copied"))
  }
}

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
      const results: boolean[] = []
      for (const item of changedItems) {
        if (item.type === "collection") {
          const saveCollectionResult =
            await saveCollectionDocumentationById(item)
          results.push(saveCollectionResult)
        } else if (item.type === "request") {
          const saveRequestResult = await saveRequestDocumentationById(item)
          results.push(saveRequestResult)
        }
      }

      const successCount = results.filter((r) => r).length
      const failureCount = results.length - successCount

      if (failureCount === 0) {
        toast.success(t("documentation.save_success"))
      } else if (successCount === 0) {
        toast.error(t("documentation.save_error"))
      } else {
        toast.success(
          t("documentation.saved_items_status", {
            success: successCount,
            failure: failureCount,
          })
        )
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
const saveCollectionDocumentationById = async (
  item: DocumentationItem
): Promise<boolean> => {
  // Type guard to ensure it's a collection item
  if (item.type !== "collection") return false

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

      const result = await pipe(
        updateTeamCollection(collectionId, data),
        TE.match(
          (err: GQLError<string>) => {
            console.error(getErrorMessage(err))
            return false
          },
          () => {
            return true
          }
        )
      )()
      isSavingDocumentation.value = false
      return result
    }
    console.error("Collection data not found in service")
    isSavingDocumentation.value = false
    return false
  }
  if (pathOrID && collectionData) {
    const updatedCollection = {
      ...collectionData,
      description: documentation,
    }

    // Check if this is a root collection or a folder
    const pathSegments = pathOrID.split("/")
    try {
      if (pathSegments.length === 1) {
        editRESTCollection(parseInt(pathOrID), updatedCollection)
      } else {
        editRESTFolder(pathOrID, updatedCollection)
      }
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  } else {
    console.error("Collection path or data not found")
    return false
  }
}

// Save request documentation by ID
const saveRequestDocumentationById = async (
  item: DocumentationItem
): Promise<boolean> => {
  if (item.type !== "request") return false

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

      const result = await pipe(
        updateTeamRequest(item.requestID, data),
        TE.match(
          (err: GQLError<string>) => {
            console.error(getErrorMessage(err))
            return false
          },
          () => {
            return true
          }
        )
      )()
      isSavingDocumentation.value = false
      return result
    }
    console.error("Team request data not found in service")
    isSavingDocumentation.value = false
    return false
  }
  if (
    folderPath !== undefined &&
    item.requestIndex !== undefined &&
    requestData
  ) {
    const updatedRequest = {
      ...requestData,
      description: documentation,
    }

    try {
      editRESTRequest(folderPath, item.requestIndex, updatedRequest)
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  } else {
    console.error("Personal request data not found in service")
    return false
  }
}

// Used to prevent accidental closing of the modal with unsaved changes
const closeAttempted = ref(false)

let closeTimeout: ReturnType<typeof setTimeout> | null = null

const hideModal = () => {
  if (documentationService.hasChanges.value && !closeAttempted.value) {
    // Get the number of unsaved changes
    const unsavedChangesLength = documentationService.getChangedItems().length

    closeAttempted.value = true
    toast.info(
      t("documentation.unsaved_changes", { count: unsavedChangesLength }),
      {
        action: {
          text: t("action.close"),
          onClick: (_, toastObject) => {
            toastObject.goAway(0)
            closeAttempted.value = false
            emit("hide-modal")
          },
        },
      }
    )

    if (closeTimeout) clearTimeout(closeTimeout)
    closeTimeout = setTimeout(() => {
      closeAttempted.value = false
    }, 3000)

    return
  }

  emit("hide-modal")
  closeAttempted.value = false
  if (closeTimeout) clearTimeout(closeTimeout)
}

const handlePublish = async (doc: CreatePublishedDocsArgs) => {
  isProcessingPublish.value = true
  await pipe(
    createPublishedDoc(doc),
    TE.match(
      (error) => {
        console.error("Error publishing documentation:", error)
        toast.error(t("documentation.publish.publish_error"))
      },
      (data) => {
        const url = data.createPublishedDoc.url
        toast.success(t("documentation.publish.publish_success"))

        const newDocInfo = {
          id: data.createPublishedDoc.id,
          title: doc.title,
          version: doc.version,
          autoSync: doc.autoSync,
          url: url,
        }

        // Update service
        if (props.collectionID) {
          documentationService.setPublishedDocStatus(
            props.collectionID,
            newDocInfo
          )
        }
      }
    )
  )()
  isProcessingPublish.value = false
}

const handleUpdate = async (id: string, doc: UpdatePublishedDocsArgs) => {
  isProcessingPublish.value = true
  await pipe(
    updatePublishedDoc(id, doc),
    TE.match(
      (error) => {
        console.error("Error updating documentation:", error)
        toast.error(t("documentation.publish.update_error"))
      },
      (data) => {
        const url = data.updatePublishedDoc.url
        toast.success(t("documentation.publish.update_success"))
        // Update existing data
        if (existingPublishedData.value) {
          const updatedDocInfo = {
            id: id,
            title: data.updatePublishedDoc.title,
            version: data.updatePublishedDoc.version,
            autoSync: data.updatePublishedDoc.autoSync,
            url: url,
          }

          // Update service
          if (props.collectionID) {
            documentationService.setPublishedDocStatus(
              props.collectionID,
              updatedDocInfo
            )
          }
        }
      }
    )
  )()
  isProcessingPublish.value = false
}

const handleDelete = async () => {
  if (!publishedDocId.value) return

  isProcessingPublish.value = true
  await pipe(
    deletePublishedDoc(publishedDocId.value),
    TE.match(
      (error) => {
        console.error("Error deleting documentation:", error)
        toast.error(t("documentation.publish.delete_error"))
      },
      () => {
        toast.success(t("documentation.publish.delete_success"))

        showPublishModal.value = false

        // Update service
        if (props.collectionID) {
          documentationService.setPublishedDocStatus(props.collectionID, null)
        }
      }
    )
  )()
  isProcessingPublish.value = false
}
</script>
