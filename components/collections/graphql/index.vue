<template>
  <AppSection
    ref="collections"
    class="yellow"
    :label="$t('collections')"
    no-legend
  >
    <div class="show-on-large-screen">
      <input
        v-model="filterText"
        aria-label="Search"
        type="search"
        :placeholder="$t('search')"
        class="rounded-t-lg"
      />
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
      :folder="editingFolder"
      :folder-path="editingFolderPath"
      @add-folder="onAddFolder($event)"
      @hide-modal="displayModalAddFolder(false)"
    />
    <CollectionsGraphqlEditFolder
      :show="showModalEditFolder"
      :collection-index="editingCollectionIndex"
      :folder="editingFolder"
      :folder-index="editingFolderIndex"
      @hide-modal="displayModalEditFolder(false)"
    />
    <CollectionsGraphqlEditRequest
      :show="showModalEditRequest"
      :collection-index="editingCollectionIndex"
      :folder-index="editingFolderIndex"
      :folder-name="editingFolderName"
      :request="editingRequest"
      :request-index="editingRequestIndex"
      @hide-modal="displayModalEditRequest(false)"
    />
    <CollectionsGraphqlImportExport
      :show="showModalImportExport"
      @hide-modal="displayModalImportExport(false)"
    />
    <div class="border-b row-wrapper border-brdColor">
      <button class="icon" @click="displayModalAdd(true)">
        <i class="material-icons">add</i>
        <span>{{ $t("new") }}</span>
      </button>
      <button class="icon" @click="displayModalImportExport(true)">
        {{ $t("import_export") }}
      </button>
    </div>
    <p v-if="collections.length === 0" class="info">
      <i class="material-icons">help_outline</i>
      {{ $t("create_new_collection") }}
    </p>
    <div class="virtual-list">
      <ul class="flex-col">
        <li
          v-for="(collection, index) in filteredCollections"
          :key="collection.name"
        >
          <CollectionsGraphqlCollection
            :name="collection.name"
            :collection-index="index"
            :collection="collection"
            :doc="doc"
            :is-filtered="filterText.length > 0"
            @edit-collection="editCollection(collection, index)"
            @add-folder="addFolder($event)"
            @edit-folder="editFolder($event)"
            @edit-request="editRequest($event)"
            @select-collection="$emit('use-collection', collection)"
          />
        </li>
      </ul>
    </div>
    <p v-if="filterText && filteredCollections.length === 0" class="info">
      <i class="material-icons">not_interested</i> {{ $t("nothing_found") }} "{{
        filterText
      }}"
    </p>
  </AppSection>
</template>

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
      editingFolderName: undefined,
      editingFolderIndex: undefined,
      editingFolderPath: undefined,
      editingRequest: undefined,
      editingRequestIndex: undefined,
      filterText: "",
    }
  },
  computed: {
    collections() {
      return fb.currentUser !== null
        ? fb.currentGraphqlCollections
        : this.$store.state.postwoman.collectionsGraphql
    },
    filteredCollections() {
      const collections =
        fb.currentUser !== null
          ? fb.currentGraphqlCollections
          : this.$store.state.postwoman.collectionsGraphql

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
  mounted() {
    this._keyListener = function (e) {
      if (e.key === "Escape") {
        e.preventDefault()
        this.showModalAdd =
          this.showModalEdit =
          this.showModalImportExport =
          this.showModalAddFolder =
          this.showModalEditFolder =
          this.showModalEditRequest =
            false
      }
    }
    document.addEventListener("keydown", this._keyListener.bind(this))
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
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
    onAddFolder({ name, path }) {
      const flag = "graphql"
      this.$store.commit("postwoman/addFolder", {
        name,
        path,
        flag,
      })

      this.displayModalAddFolder(false)
      this.syncCollections()
    },
    addFolder(payload) {
      const { folder, path } = payload
      this.$data.editingFolder = folder
      this.$data.editingFolderPath = path
      this.displayModalAddFolder(true)
    },
    editFolder(payload) {
      const { collectionIndex, folder, folderIndex } = payload
      this.$data.editingCollectionIndex = collectionIndex
      this.$data.editingFolder = folder
      this.$data.editingFolderIndex = folderIndex
      this.displayModalEditFolder(true)
      this.syncCollections()
    },
    editRequest(payload) {
      const {
        collectionIndex,
        folderIndex,
        folderName,
        request,
        requestIndex,
      } = payload
      this.$data.editingCollectionIndex = collectionIndex
      this.$data.editingFolderIndex = folderIndex
      this.$data.editingFolderName = folderName
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
      if (fb.currentUser !== null && fb.currentSettings[0]) {
        if (fb.currentSettings[0].value) {
          fb.writeCollections(
            JSON.parse(
              JSON.stringify(this.$store.state.postwoman.collectionsGraphql)
            ),
            "collectionsGraphql"
          )
        }
      }
    },
  },
}
</script>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 270px);
}
</style>
