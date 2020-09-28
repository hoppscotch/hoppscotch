<!--
TODO:
    - probably refactor and pass event arguments to modals directly without unpacking
-->

<template>
  <pw-section class="yellow" :label="$t('collections')" ref="collections">
    <add-collection :show="showModalAdd" @hide-modal="displayModalAdd(false)" />
    <edit-collection
      :show="showModalEdit"
      :editing-collection="editingCollection"
      :editing-collection-index="editingCollectionIndex"
      @hide-modal="displayModalEdit(false)"
    />
    <add-folder
      :show="showModalAddFolder"
      :folder="editingFolder"
      @hide-modal="displayModalAddFolder(false)"
    />
    <edit-folder
      :show="showModalEditFolder"
      :collection-index="editingCollectionIndex"
      :folder="editingFolder"
      :folder-index="editingFolderIndex"
      @hide-modal="displayModalEditFolder(false)"
    />
    <edit-request
      :show="showModalEditRequest"
      :collection-index="editingCollectionIndex"
      :folder-index="editingFolderIndex"
      :folder-name="editingFolderName"
      :request="editingRequest"
      :request-index="editingRequestIndex"
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
        <li v-for="(collection, index) in collections" :key="collection.name">
          <collection
            :name="collection.name"
            :collection-index="index"
            :collection="collection"
            :doc="doc"
            @edit-collection="editCollection(collection, index)"
            @add-folder="addFolder($event)"
            @edit-folder="editFolder($event)"
            @edit-request="editRequest($event)"
            @select-collection="$emit('use-collection', collection)"
          />
        </li>
      </ul>
    </div>
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
      editingFolderName:undefined,
      editingFolderIndex: undefined,
      editingRequest: undefined,
      editingRequestIndex: undefined,
    }
  },
  computed: {
    collections() {
      return fb.currentUser !== null
        ? fb.currentCollections
        : this.$store.state.postwoman.collections
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
    addFolder(payload) {
      const { folder } = payload
      this.$data.editingFolder = folder
      this.displayModalAddFolder(true)
      this.syncCollections()
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
      const { collectionIndex, folderIndex, folderName, request, requestIndex } = payload
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
