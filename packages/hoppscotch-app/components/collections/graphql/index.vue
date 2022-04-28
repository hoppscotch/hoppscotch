<template>
  <div :class="{ 'rounded border border-divider': savingMode }">
    <div
      class="sticky top-0 z-10 flex flex-col border-b divide-dividerLight divide-y border-dividerLight"
      :class="{ 'bg-primary': !savingMode }"
    >
      <input
        v-if="showCollActions"
        v-model="filterText"
        type="search"
        autocomplete="off"
        :placeholder="$t('action.search')"
        class="flex px-4 py-2 bg-transparent"
      />
      <div class="flex justify-between flex-1">
        <ButtonSecondary
          svg="plus"
          :label="$t('action.new')"
          class="!rounded-none"
          @click.native="displayModalAdd(true)"
        />
        <div class="flex">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            to="https://docs.hoppscotch.io/features/collections"
            blank
            :title="$t('app.wiki')"
            svg="help-circle"
          />
          <ButtonSecondary
            v-if="showCollActions"
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('modal.import_export')"
            svg="archive"
            @click.native="displayModalImportExport(true)"
          />
        </div>
      </div>
    </div>
    <div class="flex-col">
      <CollectionsGraphqlCollection
        v-for="(collection, index) in filteredCollections"
        :key="`collection-${index}`"
        :picked="picked"
        :name="collection.name"
        :collection-index="index"
        :collection="collection"
        :doc="doc"
        :is-filtered="filterText.length > 0"
        :saving-mode="savingMode"
        @edit-collection="editCollection(collection, index)"
        @add-request="addRequest($event)"
        @add-folder="addFolder($event)"
        @edit-folder="editFolder($event)"
        @edit-request="editRequest($event)"
        @duplicate-request="duplicateRequest($event)"
        @select-collection="$emit('use-collection', collection)"
        @select="$emit('select', $event)"
      />
    </div>
    <div
      v-if="collections.length === 0"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <img
        :src="`/images/states/${$colorMode.value}/pack.svg`"
        loading="lazy"
        class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
        :alt="$t('empty.collections')"
      />
      <span class="pb-4 text-center">
        {{ $t("empty.collections") }}
      </span>
      <ButtonSecondary
        :label="$t('add.new')"
        filled
        @click.native="displayModalAdd(true)"
      />
    </div>
    <div
      v-if="!(filteredCollections.length !== 0 || collections.length === 0)"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <i class="pb-2 opacity-75 material-icons">manage_search</i>
      <span class="my-2 text-center">
        {{ $t("state.nothing_found") }} "{{ filterText }}"
      </span>
    </div>
    <CollectionsGraphqlAdd
      :show="showModalAdd"
      @hide-modal="displayModalAdd(false)"
    />
    <CollectionsGraphqlEdit
      :show="showModalEdit"
      :editing-collection="editingCollection"
      :editing-collection-index="editingCollectionIndex"
      :editing-collection-name="editingCollection?.name"
      @hide-modal="displayModalEdit(false)"
    />
    <CollectionsGraphqlAddRequest
      :show="showModalAddRequest"
      :folder-path="editingFolderPath"
      @add-request="onAddRequest($event)"
      @hide-modal="displayModalAddRequest(false)"
    />
    <CollectionsGraphqlAddFolder
      :show="showModalAddFolder"
      :folder-path="editingFolderPath"
      @add-folder="onAddFolder($event)"
      @hide-modal="displayModalAddFolder(false)"
    />
    <CollectionsGraphqlEditFolder
      :show="showModalEditFolder"
      :collection-index="editingCollectionIndex"
      :folder="editingFolder"
      :folder-index="editingFolderIndex"
      :folder-path="editingFolderPath"
      :editing-folder-name="editingFolder?.name"
      @hide-modal="displayModalEditFolder(false)"
    />
    <CollectionsGraphqlEditRequest
      :show="showModalEditRequest"
      :folder-path="editingFolderPath"
      :request="editingRequest"
      :request-index="editingRequestIndex"
      :editing-request-name="editingRequest?.name"
      @hide-modal="displayModalEditRequest(false)"
    />
    <CollectionsGraphqlImportExport
      :show="showModalImportExport"
      @hide-modal="displayModalImportExport(false)"
    />
  </div>
</template>

<script setup lang="ts">
import { HoppCollection, HoppGQLRequest } from "@hoppscotch/data"
import { ref, computed, Ref } from "@nuxtjs/composition-api"
import cloneDeep from "lodash/cloneDeep"
import clone from "lodash/clone"
import { useReadonlyStream, useI18n } from "~/helpers/utils/composables"
import {
  graphqlCollections$,
  addGraphqlFolder,
  saveGraphqlRequestAs,
} from "~/newstore/collections"
import { getGQLSession, setGQLSession } from "~/newstore/GQLSession"

const t = useI18n()

defineProps({
  // Whether to activate the ability to pick items (activates 'select' events)
  savingMode: { type: Boolean, default: false },
  doc: { type: Boolean, default: false },
  picked: { type: Object, default: null },
  // Whether to show the 'New' and 'Import/Export' actions
  showCollActions: { type: Boolean, default: false },
})

const collections = useReadonlyStream(graphqlCollections$, [])
const filterText = ref("")

// modal display switches
const showModalAdd = ref(false)
const showModalEdit = ref(false)
const showModalImportExport = ref(false)
const showModalAddRequest = ref(false)
const showModalAddFolder = ref(false)
const showModalEditFolder = ref(false)
const showModalEditRequest = ref(false)

// modal prop variables
const editingCollection: Ref<HoppCollection<HoppGQLRequest> | undefined> =
  ref(undefined)
const editingCollectionIndex: Ref<number | undefined> = ref(undefined)
const editingFolder: Ref<HoppCollection<HoppGQLRequest> | undefined> =
  ref(undefined)
const editingFolderIndex: Ref<number | undefined> = ref(undefined)
const editingFolderPath: Ref<string | undefined> = ref(undefined)
const editingRequest: Ref<HoppGQLRequest | undefined> = ref(undefined)
const editingRequestIndex: Ref<number | undefined> = ref(undefined)

// reset all modal prop variables
const resetSelectedData = () => {
  editingCollection.value = undefined
  editingCollectionIndex.value = undefined
  editingFolder.value = undefined
  editingFolderIndex.value = undefined
  editingFolderPath.value = undefined
  editingRequest.value = undefined
  editingRequestIndex.value = undefined
}

// modal display functions to show and reset data
const displayModalAdd = (shouldDisplay: boolean) => {
  showModalAdd.value = shouldDisplay
}
const displayModalEdit = (shouldDisplay: boolean) => {
  showModalEdit.value = shouldDisplay
  if (!shouldDisplay) resetSelectedData()
}
const displayModalImportExport = (shouldDisplay: boolean) => {
  showModalImportExport.value = shouldDisplay
}
const displayModalAddFolder = (shouldDisplay: boolean) => {
  showModalAddFolder.value = shouldDisplay
  if (!shouldDisplay) resetSelectedData()
}
const displayModalEditFolder = (shouldDisplay: boolean) => {
  showModalEditFolder.value = shouldDisplay
  if (!shouldDisplay) resetSelectedData()
}
const displayModalAddRequest = (shouldDisplay: boolean) => {
  showModalAddRequest.value = shouldDisplay
  if (!shouldDisplay) resetSelectedData()
}
const displayModalEditRequest = (shouldDisplay: boolean) => {
  showModalEditRequest.value = shouldDisplay
  if (!shouldDisplay) resetSelectedData()
}

// callback functions from Graphql Collection
const editCollection = (
  collection: HoppCollection<HoppGQLRequest>,
  collectionIndex: number
) => {
  editingCollection.value = collection
  editingCollectionIndex.value = collectionIndex
  displayModalEdit(true)
}

const addFolder = (payload: { path: string }) => {
  const { path } = payload
  editingFolderPath.value = path
  displayModalAddFolder(true)
}

const editFolder = (payload: {
  folder: HoppCollection<HoppGQLRequest>
  folderPath: string
}) => {
  const { folder, folderPath } = payload
  editingFolder.value = folder
  editingFolderPath.value = folderPath
  displayModalEditFolder(true)
}

const addRequest = (payload: { path: string }) => {
  const { path } = payload
  editingFolderPath.value = path
  displayModalAddRequest(true)
}

const editRequest = (payload: {
  collectionIndex: number
  folderIndex: number
  request: HoppGQLRequest
  requestIndex: number
  folderPath: string
}) => {
  const { collectionIndex, folderIndex, request, requestIndex, folderPath } =
    payload
  editingFolderPath.value = folderPath
  editingCollectionIndex.value = collectionIndex
  editingFolderIndex.value = folderIndex
  editingRequest.value = request
  editingRequestIndex.value = requestIndex
  displayModalEditRequest(true)
}

const duplicateRequest = (payload: {
  folderPath: string
  request: HoppGQLRequest
}) => {
  const { folderPath, request } = payload
  saveGraphqlRequestAs(folderPath, {
    ...cloneDeep(request),
    name: `${request.name} - ${t("action.duplicate")}`,
  })
}

// callback from Add Folder Modal
const onAddFolder = (payload: { name: string; path: string }) => {
  const { name, path } = payload
  addGraphqlFolder(name, path)
  displayModalAddFolder(false)
}

// callback from Add Request Modal
const onAddRequest = (payload: { name: string; path: string }) => {
  const { name, path } = payload
  const newRequest = {
    ...getGQLSession().request,
    name,
  }

  saveGraphqlRequestAs(path, newRequest)
  setGQLSession({
    request: newRequest,
    schema: "",
    response: "",
  })

  displayModalAddRequest(false)
}

const filteredCollections = computed(() => {
  const collectionsClone = clone(collections.value)

  if (!filterText.value) return collectionsClone

  const filterTextValue = filterText.value.toLowerCase()
  const filteredCollections = []

  for (const collection of collectionsClone) {
    const filteredRequests = []
    const filteredFolders = []
    for (const request of collection.requests) {
      if (request.name.toLowerCase().includes(filterTextValue))
        filteredRequests.push(request)
    }
    for (const folder of collection.folders) {
      const filteredFolderRequests = []
      for (const request of folder.requests) {
        if (request.name.toLowerCase().includes(filterTextValue))
          filteredFolderRequests.push(request)
      }
      if (filteredFolderRequests.length > 0) {
        const filteredFolder = Object.assign({}, folder)
        filteredFolder.requests = filteredFolderRequests
        filteredFolders.push(filteredFolder)
      }
    }

    if (filteredRequests.length + filteredFolders.length > 0) {
      const filteredCollection = Object.assign({}, collection)
      filteredCollection.requests = filteredRequests
      filteredCollection.folders = filteredFolders
      filteredCollections.push(filteredCollection)
    }
  }

  return filteredCollections
})
</script>
