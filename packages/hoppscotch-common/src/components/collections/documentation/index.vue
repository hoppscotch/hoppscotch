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
        v-if="loadingState"
        class="w-full h-96 flex items-center justify-center"
      >
        <icon-lucide-loader class="svg-icons animate-spin text-4xl" />
      </div>
      <div v-else class="w-full h-[80vh] overflow-hidden">
        <div class="flex h-full">
          <div class="flex-1 flex">
            <CollectionsDocumentationPreview
              v-if="collection"
              v-model:documentation-description="documentationDescription"
              :collection="collection"
              :collection-i-d="collectionID"
              :collection-path="collectionPath"
              :folder-path="folderPath"
              :request-index="requestIndex"
              :team-i-d="teamID"
              @close-modal="hideModal"
            />
            <CollectionsDocumentationRequestPreview
              v-else-if="request"
              v-model:documentation-description="documentationDescription"
              :request="request"
              :collection-i-d="collectionID"
              :collection-path="collectionPath"
              :folder-path="folderPath"
              :request-index="requestIndex"
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
import { ref } from "vue"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import {
  editRESTCollection,
  editRESTFolder,
  editRESTRequest,
} from "~/newstore/collections"

const t = useI18n()
const toast = useToast()

const props = withDefaults(
  defineProps<{
    show?: boolean
    loadingState?: boolean
    hasTeamWriteAccess?: boolean
    collectionID?: string
    collectionPath?: string | null
    collection?: HoppCollection | null
    folderPath?: string | null
    requestIndex?: number | null
    request?: HoppRESTRequest | null
    teamID?: string
  }>(),
  {
    show: false,
    loadingState: false,
    hasTeamWriteAccess: true,
    collectionID: "",
    collectionPath: null,
    collection: null,
    folderPath: null,
    requestIndex: null,
    request: null,
    teamID: undefined,
  }
)

const documentationDescription = ref<string>(
  props.collection
    ? props.collection.description || "### Hoppscotch Collection Documentation"
    : props.request
      ? props.request.description || " ### Hoppscotch Request Documentation"
      : ""
)

const getPersonalCollection = () => {
  console.log("Get personal collection", props.collection)
}

getPersonalCollection()

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "update:modelValue"): void
}>()

const saveDocumentation = async () => {
  if (!props.hasTeamWriteAccess) {
    toast.error(t("documentation.no_write_access"))
    return
  }

  if (props.collection && props.collectionPath) {
    const updatedCollection = {
      ...props.collection,
      description: documentationDescription.value,
    }

    console.log("collection-path", props.collectionPath)

    try {
      // Check if this is a root collection (no "/" in path) or a folder
      const pathSegments = props.collectionPath.split("/")

      if (pathSegments.length === 1) {
        editRESTCollection(parseInt(props.collectionPath), updatedCollection)
      } else {
        editRESTFolder(props.collectionPath, updatedCollection)
      }

      toast.success(t("documentation.save_success"))
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
    editRESTRequest(props.folderPath, props.requestIndex, updatedRequest)
    toast.success("Request documentation saved successfully.")
  }
}

const hideModal = async () => {
  console.log("Hiding documentation modal...")
  emit("hide-modal")
}
</script>
