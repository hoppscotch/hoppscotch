<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('collection.properties')"
    :full-width-body="true"
    @close="hideModal"
  >
    <template #body>
      <HoppSmartTabs
        v-model="activeTab"
        styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-0 z-10 !-py-4"
        render-inactive-tabs
      >
        <HoppSmartTab :id="'headers'" :label="`${t('tab.headers')}`">
          <HttpHeaders
            v-model="editableCollection"
            :is-collection-property="true"
          />
          <div
            class="bg-bannerInfo px-4 py-2 flex items-center sticky bottom-0"
          >
            <icon-lucide-info class="svg-icons mr-2" />
            {{ t("helpers.collection_properties_header") }}
          </div>
        </HoppSmartTab>
        <HoppSmartTab
          :id="'authorization'"
          :label="`${t('tab.authorization')}`"
        >
          <HttpAuthorization
            v-model="editableCollection.auth"
            :is-collection-property="true"
            :is-root-collection="editingProperties?.isRootCollection"
            :inherited-properties="editingProperties?.inheritedProperties"
            :source="source"
          />
          <div
            class="bg-bannerInfo px-4 py-2 flex items-center sticky bottom-0"
          >
            <icon-lucide-info class="svg-icons mr-2" />
            {{ t("helpers.collection_properties_authorization") }}
          </div>
        </HoppSmartTab>
      </HoppSmartTabs>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('action.save')"
          :loading="loadingState"
          outline
          @click="saveEditedCollection"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import {
  GQLHeader,
  HoppCollection,
  HoppGQLAuth,
  HoppRESTAuth,
  HoppRESTHeaders,
} from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import { useService } from "dioc/vue"
import { clone } from "lodash-es"
import { ref, watch } from "vue"

import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import { PersistenceService } from "~/services/persistence"

const persistenceService = useService(PersistenceService)
const t = useI18n()

export type EditingProperties = {
  collection: Partial<HoppCollection> | null
  isRootCollection: boolean
  path: string
  inheritedProperties?: HoppInheritedProperty
}

type HoppCollectionAuth = HoppRESTAuth | HoppGQLAuth
type HoppCollectionHeaders = HoppRESTHeaders | GQLHeader[]

const props = withDefaults(
  defineProps<{
    show: boolean
    loadingState: boolean
    editingProperties: EditingProperties | null
    source: "REST" | "GraphQL"
    modelValue: string
  }>(),
  {
    show: false,
    loadingState: false,
    editingProperties: null,
  }
)

const emit = defineEmits<{
  (
    e: "set-collection-properties",
    newCollection: Omit<EditingProperties, "inheritedProperties">
  ): void
  (e: "hide-modal"): void
  (e: "update:modelValue"): void
}>()

const editableCollection = ref<{
  headers: HoppCollectionHeaders
  auth: HoppCollectionAuth
}>({
  headers: [],
  auth: {
    authType: "inherit",
    authActive: false,
  },
})

watch(
  editableCollection,
  (updatedEditableCollection) => {
    if (props.show && props.editingProperties) {
      const unsavedCollectionProperties: EditingProperties = {
        collection: updatedEditableCollection,
        isRootCollection: props.editingProperties?.isRootCollection ?? false,
        path: props.editingProperties?.path,
        inheritedProperties: props.editingProperties?.inheritedProperties,
      }
      persistenceService.setLocalConfig(
        "unsaved_collection_properties",
        JSON.stringify(unsavedCollectionProperties)
      )
    }
  },
  {
    deep: true,
  }
)

const activeTab = useVModel(props, "modelValue", emit)

watch(
  () => props.show,
  (show) => {
    if (show && props.editingProperties?.collection) {
      editableCollection.value.auth = clone(
        props.editingProperties.collection.auth as HoppCollectionAuth
      )
      editableCollection.value.headers = clone(
        props.editingProperties.collection.headers as HoppCollectionHeaders
      )
    } else {
      editableCollection.value = {
        headers: [],
        auth: {
          authType: "inherit",
          authActive: false,
        },
      }

      persistenceService.removeLocalConfig("unsaved_collection_properties")
    }
  }
)

const saveEditedCollection = () => {
  if (!props.editingProperties) return
  const finalCollection = clone(editableCollection.value)
  const collection = {
    path: props.editingProperties.path,
    collection: {
      ...props.editingProperties.collection,
      ...finalCollection,
    },
    isRootCollection: props.editingProperties.isRootCollection,
  }
  emit("set-collection-properties", collection as EditingProperties)
  persistenceService.removeLocalConfig("unsaved_collection_properties")
}

const hideModal = () => {
  persistenceService.removeLocalConfig("unsaved_collection_properties")
  emit("hide-modal")
}
</script>
