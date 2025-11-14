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
      <div
        v-if="loadingState || isLoadingTeamCollection"
        class="w-full h-96 flex items-center justify-center"
      >
        <icon-lucide-loader class="svg-icons animate-spin text-4xl" />
      </div>
      <div v-else class="w-full h-[80vh] overflow-hidden">
        <div class="flex h-full">
          <div class="flex-1 flex">
            <CollectionsDocumentationPreview
              v-if="currentCollection"
              v-model:documentation-description="documentationDescription"
              :collection="currentCollection"
              :collection-i-d="collectionID"
              :collection-path="collectionPath"
              :folder-path="folderPath"
              :request-index="requestIndex"
              :team-i-d="teamID"
              :is-team-collection="isTeamCollection"
              :all-items="allItems"
              :show-all-documentation="showAllDocumentation"
              :is-processing-documentation="isProcessingDocumentation"
              :processing-progress="processingProgress"
              @close-modal="hideModal"
              @toggle-all-documentation="handleToggleAllDocumentation"
            />
            <CollectionsDocumentationRequestPreview
              v-else-if="request"
              v-model:documentation-description="documentationDescription"
              :request="request"
              :collection-i-d="collectionID"
              :collection-path="collectionPath"
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
          outline
          filled
          @click="saveDocumentation"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script lang="ts" setup>
import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { ref, computed, watch, nextTick } from "vue"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { TeamCollection } from "~/helpers/teams/TeamCollection"
import {
  editRESTCollection,
  editRESTFolder,
  editRESTRequest,
} from "~/newstore/collections"
import { updateTeamCollection } from "~/helpers/backend/mutations/TeamCollection"
import {
  CollectionDataProps,
  getSingleTeamCollectionJSON,
  teamCollToHoppRESTColl,
} from "~/helpers/backend/helpers"
import { useDocumentationWorker } from "~/composables/useDocumentationWorker"
import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { pipe } from "fp-ts/function"
import { GQLError } from "~/helpers/backend/GQLClient"
import { getErrorMessage } from "~/helpers/backend/mutations/MockServer"

const t = useI18n()
const toast = useToast()
// Loading state for team collection fetching
const isLoadingTeamCollection = ref<boolean>(false)

// Documentation processing state
const allItems = ref<Array<any>>([])
const showAllDocumentation = ref<boolean>(false)

// Use the documentation worker
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
    collectionPath?: string | null
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
    collectionPath: null,
    collection: null,
    folderPath: null,
    requestIndex: null,
    requestID: null,
    request: null,
    teamID: undefined,
  }
)

// Store the fetched team collection data
const fetchedTeamCollection = ref<TeamCollection | null>(null)

// Fetch team collection data when needed
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
      console.log("Data fetched for team collection:", JSON.parse(data.right))
      const parsedCollection = JSON.parse(data.right)
      console.log("///parsedCollection///", parsedCollection)
      fetchedTeamCollection.value = parsedCollection
    } else {
      console.error("Failed to fetch team collection data")
      fetchedTeamCollection.value = props.collection as TeamCollection
    }
  } catch (error) {
    console.error("Error fetching team collection:", error)
    fetchedTeamCollection.value = props.collection as TeamCollection
  } finally {
    isLoadingTeamCollection.value = false
  }
}

// Get the current collection - use fetched data only after toggleAllDocumentation is clicked
const currentCollection = computed<HoppCollection | null>(() => {
  if (!props.collection) return null

  // For team collections, use the fetched data only if available (after toggle)
  if (props.isTeamCollection && fetchedTeamCollection.value) {
    console.log(
      "Using fetched team collection as currentCollection",
      fetchedTeamCollection.value
    )
    return fetchedTeamCollection.value
  }

  if (props.isTeamCollection) {
    console.log(
      "Using original prop collection as currentCollection",
      props.collection
    )

    return teamCollToHoppRESTColl(props.collection as TeamCollection)
  }

  // Use the prop collection by default
  console.log("Using prop collection as currentCollection", props.collection)
  return props.collection
})

// Handle toggle all documentation - process items in parent
const handleToggleAllDocumentation = async () => {
  if (!showAllDocumentation.value) {
    // For team collections, fetch latest collection data first
    if (props.isTeamCollection && props.collection?.id && props.teamID) {
      await fetchTeamCollection()
      await nextTick() // Wait for collection to update
    }

    // Get the current collection to process
    const collectionToProcess = currentCollection.value
    if (!collectionToProcess) {
      console.log("No collection available to process")
      return
    }

    try {
      console.log(
        "Processing documentation for collection",
        collectionToProcess
      )

      // Process documentation in parent
      const items = await processDocumentation(
        collectionToProcess as HoppCollection,
        props.collectionPath
      )

      console.log("All documentation items processed:", items)

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
      fetchedTeamCollection.value = null
      isLoadingTeamCollection.value = false
    }
  }
)

// Watch for changes in current collection and update documentation description
const documentationDescription = ref<string>("")

watch(
  () => currentCollection.value,
  (newCollection) => {
    if (newCollection) {
      documentationDescription.value =
        (newCollection as HoppCollection).description ||
        "### Hoppscotch Collection Documentation"
    } else if (props.request) {
      documentationDescription.value =
        props.request.description || "### Hoppscotch Request Documentation"
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

// TODO: Save documentation for sub folders in show all doc state
const saveDocumentation = async () => {
  if (!props.hasTeamWriteAccess) {
    toast.error(t("documentation.no_write_access"))
    return
  }

  if (currentCollection.value && props.collectionPath) {
    console.log("collection-path", props.collectionPath)

    try {
      // Check if this is a team collection
      if (props.isTeamCollection) {
        // Team collection
        const teamCollection = currentCollection.value
        console.log("props.collectionID", props.collectionID)
        console.log("saving team collection documentation...", teamCollection)
        console.log("documentationDescription", documentationDescription.value)

        let data: CollectionDataProps | undefined = undefined

        if (
          "data" in teamCollection &&
          typeof teamCollection.data === "string"
        ) {
          const parsedData = JSON.parse(teamCollection.data)
          data = {
            auth: parsedData.auth ?? null,
            headers: parsedData.headers ?? [],
            variables: parsedData.variables ?? [],
            description: documentationDescription.value,
          }
        } else {
          const coll = teamCollection as HoppCollection
          data = {
            auth: coll.auth,
            headers: coll.headers,
            variables: coll.variables,
            description: documentationDescription.value,
          }
        }

        console.log("updateTeamCollection data:", data)

        pipe(
          updateTeamCollection(teamCollection.id!, data),
          TE.match(
            (err: GQLError<string>) => {
              toast.error(`${getErrorMessage(err)}`)
            },
            () => {
              toast.success(t("documentation.save_success"))
            }
          )
        )()
      } else {
        // Personal collection
        const personalCollection = currentCollection.value as HoppCollection
        const updatedCollection = {
          ...personalCollection,
          description: documentationDescription.value,
        }

        // Check if this is a root collection (no "/" in path) or a folder
        const pathSegments = props.collectionPath.split("/")

        if (pathSegments.length === 1) {
          editRESTCollection(parseInt(props.collectionPath), updatedCollection)
        } else {
          editRESTFolder(props.collectionPath, updatedCollection)
        }
        toast.success(t("documentation.save_success"))
      }
    } catch (error) {
      console.error("Error saving documentation:", error)
      toast.error(t("documentation.save_error"))
    }
  } else if (
    props.request &&
    props.folderPath !== undefined &&
    props.folderPath !== null &&
    props.requestIndex !== undefined &&
    props.requestIndex !== null
  ) {
    const updatedRequest = {
      ...props.request,
      description: documentationDescription.value,
    }
    console.log("updatedRequest", updatedRequest)
    console.log("props.folderPath", props.folderPath)
    console.log("props.requestIndex", props.requestIndex)

    try {
      if (props.isTeamCollection || props.teamID) {
        // Team request - we need the requestRefID to update it
        // For now, this is a limitation - team requests need the requestRefID
        console.warn(
          "Team request documentation update not fully implemented - need requestRefID"
        )
        toast.error("Team request documentation update not fully supported yet")
      } else {
        // Personal request
        editRESTRequest(props.folderPath, props.requestIndex, updatedRequest)
        toast.success(t("documentation.save_success"))
      }
    } catch (error) {
      console.error("Error saving request documentation:", error)
      toast.error(t("documentation.save_error"))
    }
  }
}

const hideModal = async () => {
  console.log("Hiding documentation modal...")
  emit("hide-modal")
}
</script>
