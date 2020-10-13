<!--
TODO:
    - probably refactor and pass event arguments to modals directly without unpacking
-->

<template>
  <pw-section class="yellow" :label="$t('collections')" ref="collections">
    <div class="show-on-large-screen">
      <input aria-label="Search" type="search" :placeholder="$t('search')" v-model="filterText" />
      <!-- <button class="icon">
        <i class="material-icons">search</i>
      </button> -->
    </div>
    <add-collection :show="showModalAdd" @hide-modal="displayModalAdd(false)" />
    <edit-collection
      :show="showModalEdit"
      :editingCollection="editingCollection"
      :editingCollectionIndex="editingCollectionIndex"
      @hide-modal="displayModalEdit(false)"
    />
    <add-folder
      :show="showModalAddFolder"
      :collection="editingCollection"
      :collectionIndex="editingCollectionIndex"
      @hide-modal="displayModalAddFolder(false)"
    />
    <edit-folder
      :show="showModalEditFolder"
      :collection="editingCollection"
      :collectionIndex="editingCollectionIndex"
      :folder="editingFolder"
      :folderIndex="editingFolderIndex"
      @hide-modal="displayModalEditFolder(false)"
    />
    <edit-request
      :show="showModalEditRequest"
      :collectionIndex="editingCollectionIndex"
      :folderIndex="editingFolderIndex"
      :request="editingRequest"
      :requestIndex="editingRequestIndex"
      @hide-modal="displayModalEditRequest(false)"
    />
    <import-export-collections
      :show="showModalImportExport"
      @hide-modal="displayModalImportExport(false)"
    />

    <div class="row-wrapper">
      <div>
        <button class="icon" @click="displayModalAdd(true)">
          <i class="material-icons">add</i>
          <span>{{ $t("new") }}</span>
        </button>
      </div>
      <div>
        <button class="icon" @click="displayModalImportExport(true)">
          {{ $t("import_export") }}
        </button>
        <!-- <a
          href="https://github.com/hoppscotch/hoppscotch/wiki/Collections"
          target="_blank"
          rel="noopener"
        >
          <button class="icon" v-tooltip="'Wiki'">
            <i class="material-icons">help_outline</i>
          </button>
        </a> -->
      </div>
    </div>
    <p v-if="collections.length === 0" class="info">
      <i class="material-icons">help_outline</i> {{ $t("create_new_collection") }}
    </p>
    <div class="virtual-list">
      <ul class="flex-col">
        <li v-for="(collection, index) in filteredCollections" :key="collection.name">
          <collection
            :collection-index="index"
            :collection="collection"
            :doc="doc"
            :isFiltered="filterText.length > 0"
            @edit-collection="editCollection(collection, index)"
            @add-folder="addFolder(collection, index)"
            @edit-folder="editFolder($event)"
            @edit-request="editRequest($event)"
            @select-collection="$emit('use-collection', collection)"
          />
        </li>
      </ul>
    </div>
    <ul class="flex-col" v-if="filterText && filteredCollections.length === 0">
      <li>
        <label>{{ $t("nothing_found") }} "{{ filterText }}"</label>
      </li>
    </ul>
  </pw-section>
</template>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 232px);
}
</style>

<script>
import { fb } from "~/helpers/fb"

export default {
  props: {
    doc: Boolean,
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
      editingFolderIndex: undefined,
      editingRequest: undefined,
      editingRequestIndex: undefined,
      filterText: "",
    }
  },
  computed: {
    collections() {
      return fb.currentUser !== null
        ? fb.currentCollections
        : this.$store.state.postwoman.collections
    },
    filteredCollections() {
      const collections =
        fb.currentUser !== null ? fb.currentCollections : this.$store.state.postwoman.collections

      if (!this.filterText) return collections

      const filterText = this.filterText.toLowerCase()
      const filteredCollections = []

      for (let collection of collections) {
        const filteredRequests = []
        const filteredFolders = []
        for (let request of collection.requests) {
          if (request.name.toLowerCase().includes(filterText)) filteredRequests.push(request)
        }
        for (let folder of collection.folders) {
          const filteredFolderRequests = []
          for (let request of folder.requests) {
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
  async mounted() {
    this._keyListener = function (e) {
      if (e.key === "Escape") {
        e.preventDefault()
        this.showModalAdd = this.showModalEdit = this.showModalImportExport = this.showModalAddFolder = this.showModalEditFolder = this.showModalEditRequest = false
      }
    }
    document.addEventListener("keydown", this._keyListener.bind(this))
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
      this.syncCollections()
    },
    addFolder(collection, collectionIndex) {
      this.$data.editingCollection = collection
      this.$data.editingCollectionIndex = collectionIndex
      this.displayModalAddFolder(true)
      this.syncCollections()
    },
    editFolder(payload) {
      const { collection, collectionIndex, folder, folderIndex } = payload
      this.$data.editingCollection = collection
      this.$data.editingCollectionIndex = collectionIndex
      this.$data.editingFolder = folder
      this.$data.editingFolderIndex = folderIndex
      this.displayModalEditFolder(true)
      this.syncCollections()
    },
    editRequest(payload) {
      const { request, collectionIndex, folderIndex, requestIndex } = payload
      this.$data.editingCollectionIndex = collectionIndex
      this.$data.editingFolderIndex = folderIndex
      this.$data.editingRequest = request
      this.$data.editingRequestIndex = requestIndex
      this.displayModalEditRequest(true)
      this.syncCollections()
    },
    resetSelectedData() {
      this.$data.editingCollection = undefined
      this.$data.editingCollectionIndex = undefined
      this.$data.editingFolder = undefined
      this.$data.editingFolderIndex = undefined
      this.$data.editingRequest = undefined
      this.$data.editingRequestIndex = undefined
    },
    syncCollections() {
      if (fb.currentUser !== null) {
        if (fb.currentSettings[0].value) {
          fb.writeCollections(JSON.parse(JSON.stringify(this.$store.state.postwoman.collections)))
        }
      }
    },
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
}
</script>
