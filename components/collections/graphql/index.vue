<template>
  <AppSection
    label="collections"
    class=""
    :class="{ 'rounded-lg border-2 border-divider': savingMode }"
  >
    <div
      class="flex flex-col sticky top-10 z-10"
      :class="{ 'bg-primary': !savingMode }"
    >
      <input
        v-if="showCollActions"
        v-model="filterText"
        type="search"
        :placeholder="$t('search')"
        class="
          px-4
          py-3
          text-xs
          border-b border-dividerLight
          flex flex-1
          font-medium
          bg-primaryLight
          focus:outline-none
        "
      />
      <div class="border-b flex justify-between flex-1 border-dividerLight">
        <ButtonSecondary
          icon="add"
          :label="$t('new')"
          @click.native="displayModalAdd(true)"
        />
        <ButtonSecondary
          v-if="showCollActions"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('import_export')"
          icon="import_export"
          @click.native="displayModalImportExport(true)"
        />
      </div>
    </div>
    <div class="flex-col">
      <CollectionsGraphqlCollection
        v-for="(collection, index) in filteredCollections"
        :key="collection.name"
        :picked="picked"
        :name="collection.name"
        :collection-index="index"
        :collection="collection"
        :doc="doc"
        :is-filtered="filterText.length > 0"
        :saving-mode="savingMode"
        @edit-collection="editCollection(collection, index)"
        @add-folder="addFolder($event)"
        @edit-folder="editFolder($event)"
        @edit-request="editRequest($event)"
        @select-collection="$emit('use-collection', collection)"
        @select="$emit('select', $event)"
      />
    </div>
    <div
      v-if="collections.length === 0"
      class="flex items-center text-secondaryLight flex-col p-4 justify-center"
    >
      <i class="material-icons opacity-50 pb-2">create_new_folder</i>
      <span class="text-xs">
        {{ $t("create_new_collection") }}
      </span>
    </div>
    <div
      v-if="!(filteredCollections.length !== 0 || collections.length === 0)"
      class="flex items-center text-secondaryLight flex-col p-4 justify-center"
    >
      <i class="material-icons opacity-50 pb-2">manage_search</i>
      <span class="text-xs">
        {{ $t("nothing_found") }} "{{ filterText }}"
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
      @hide-modal="displayModalEdit(false)"
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
      @hide-modal="displayModalEditFolder(false)"
    />
    <CollectionsGraphqlEditRequest
      :show="showModalEditRequest"
      :folder-path="editingFolderPath"
      :request="editingRequest"
      :request-index="editingRequestIndex"
      @hide-modal="displayModalEditRequest(false)"
    />
    <CollectionsGraphqlImportExport
      :show="showModalImportExport"
      @hide-modal="displayModalImportExport(false)"
    />
  </AppSection>
</template>

<script>
import { graphqlCollections$, addGraphqlFolder } from "~/newstore/collections"

export default {
  props: {
    // Whether to activate the ability to pick items (activates 'select' events)
    savingMode: { type: Boolean, default: false },
    doc: { type: Boolean, default: false },
    picked: { type: Object, default: null },
    // Whether to show the 'New' and 'Import/Export' actions
    showCollActions: { type: Boolean, default: true },
  },
  data() {
    return {
      showModalAdd: false,
      showModalEdit: false,
      showModalImportExport: false,
      showModalAddFolder: false,
      showModalEditFolder: false,
      showModalEditRequest: false,
      editingCollection: undefined,
      editingCollectionIndex: undefined,
      editingFolder: undefined,
      editingFolderName: undefined,
      editingFolderIndex: undefined,
      editingFolderPath: undefined,
      editingRequest: undefined,
      editingRequestIndex: undefined,
      filterText: "",
    }
  },
  subscriptions() {
    return {
      collections: graphqlCollections$,
    }
  },
  computed: {
    filteredCollections() {
      const collections = this.collections

      if (!this.filterText) return collections

      const filterText = this.filterText.toLowerCase()
      const filteredCollections = []

      for (const collection of collections) {
        const filteredRequests = []
        const filteredFolders = []
        for (const request of collection.requests) {
          if (request.name.toLowerCase().includes(filterText))
            filteredRequests.push(request)
        }
        for (const folder of collection.folders) {
          const filteredFolderRequests = []
          for (const request of folder.requests) {
            if (request.name.toLowerCase().includes(filterText))
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
    },
  },
  methods: {
    displayModalAdd(shouldDisplay) {
      this.showModalAdd = shouldDisplay
    },
    displayModalEdit(shouldDisplay) {
      this.showModalEdit = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    displayModalImportExport(shouldDisplay) {
      this.showModalImportExport = shouldDisplay
    },
    displayModalAddFolder(shouldDisplay) {
      this.showModalAddFolder = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    displayModalEditFolder(shouldDisplay) {
      this.showModalEditFolder = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    displayModalEditRequest(shouldDisplay) {
      this.showModalEditRequest = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    editCollection(collection, collectionIndex) {
      this.$data.editingCollection = collection
      this.$data.editingCollectionIndex = collectionIndex
      this.displayModalEdit(true)
    },
    onAddFolder({ name, path }) {
      addGraphqlFolder(name, path)
      this.displayModalAddFolder(false)
    },
    addFolder(payload) {
      const { path } = payload
      this.$data.editingFolderPath = path
      this.displayModalAddFolder(true)
    },
    editFolder(payload) {
      const { folder, folderPath } = payload
      this.editingFolder = folder
      this.editingFolderPath = folderPath
      this.displayModalEditFolder(true)
    },
    editRequest(payload) {
      const {
        collectionIndex,
        folderIndex,
        folderName,
        request,
        requestIndex,
        folderPath,
      } = payload
      this.$data.editingFolderPath = folderPath
      this.$data.editingCollectionIndex = collectionIndex
      this.$data.editingFolderIndex = folderIndex
      this.$data.editingFolderName = folderName
      this.$data.editingRequest = request
      this.$data.editingRequestIndex = requestIndex
      this.displayModalEditRequest(true)
    },
    resetSelectedData() {
      this.$data.editingCollection = undefined
      this.$data.editingCollectionIndex = undefined
      this.$data.editingFolder = undefined
      this.$data.editingFolderIndex = undefined
      this.$data.editingRequest = undefined
      this.$data.editingRequestIndex = undefined
    },
  },
}
</script>
