<template>
  <div class="p-6 flex-1 overflow-y-auto">
    <div
      v-if="collection"
      class="flex-1 min-w-0 flex flex-col space-y-8 overflow-y-auto"
    >
      <div class="px-4">
        <span
          v-if="collection.id"
          class="text-xs text-secondaryLight bg-primaryDark inline-flex py-1 px-1.5 rounded-xl border border-divider shadow-sm"
        >
          {{ collection.id }}
        </span>
        <h1 class="text-3xl font-bold text-secondaryDark my-2">
          {{ collectionName }}
        </h1>
      </div>

      <!-- Collection Documentation -->
      <div class="">
        <CollectionsDocumentationMarkdownEditor
          v-model="editableContent"
          placeholder="Add description for this collection here..."
          @blur="handleBlur"
        />
      </div>

      <CollectionsDocumentationSectionsAuth :auth="collectionAuth" />

      <CollectionsDocumentationSectionsVariables
        :variables="collectionVariables"
      />

      <CollectionsDocumentationSectionsHeaders :headers="collectionHeaders" />
    </div>

    <div v-else class="text-center py-8 text-secondaryLight">
      <icon-lucide-file-question class="mx-auto mb-2" size="32" />
      <p>No collection data available</p>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {
  HoppCollection,
  HoppRESTAuth,
  HoppRESTHeaders,
  HoppCollectionVariable,
} from "@hoppscotch/data"
import { ref, computed, watch } from "vue"
import { useVModel } from "@vueuse/core"
import { useService } from "dioc/vue"
import { DocumentationService } from "~/services/documentation.service"

type CollectionType = HoppCollection | null

const props = withDefaults(
  defineProps<{
    documentationDescription: string
    collection: CollectionType
    pathOrID: string | null
    folderPath?: string
    isTeamCollection?: boolean
    collectionPath?: string
    teamID?: string
  }>(),
  {
    documentationDescription: "",
    collection: null,
    pathOrID: null,
    folderPath: "",
    isTeamCollection: false,
    collectionPath: "",
    teamID: "",
  }
)

const emit = defineEmits<{
  (event: "update:documentationDescription", value: string): void
}>()

// Extract collection name with fallback for null collections
const collectionName = computed<string>(() => {
  if (!props.collection) return ""
  return props.collection.name
})

// Extract collection auth configuration with inherit default
const collectionAuth = computed<HoppRESTAuth | null>(() => {
  if (!props.collection) return null
  return props.collection.auth || { authType: "inherit", authActive: true }
})

// Extract collection variables with empty array fallback
const collectionVariables = computed<HoppCollectionVariable[]>(() => {
  if (!props.collection) return []
  return props.collection.variables || []
})

// Extract collection headers with empty array fallback
const collectionHeaders = computed<HoppRESTHeaders>(() => {
  if (!props.collection) return []
  return props.collection.headers || []
})

const collectionDescription = useVModel(
  props,
  "documentationDescription",
  emit,
  { passive: true }
)

const documentationService = useService(DocumentationService)

// Edit mode state and content management
const editMode = ref<boolean>(false)
const editableContent = ref<string>(collectionDescription.value)

// Sync collection description with editable content when not in edit mode
watch(
  () => collectionDescription.value,
  (newContent) => {
    if (!editMode.value) {
      editableContent.value = newContent
    }
  },
  { immediate: true }
)

// Handle blur event - save changes and exit edit mode
function handleBlur(): void {
  const hasChanged = editableContent.value !== collectionDescription.value

  if (hasChanged && (props.collection?.id || props.collection?._ref_id)) {
    documentationService.setCollectionDocumentation(
      props.collection.id ?? props.collection._ref_id!,
      editableContent.value,
      {
        isTeamItem: props.isTeamCollection,
        pathOrID: props.pathOrID ?? props.folderPath,
        teamID: props.teamID,
        collectionData: props.collection as HoppCollection,
      }
    )
  }

  emit("update:documentationDescription", editableContent.value)
}
</script>
