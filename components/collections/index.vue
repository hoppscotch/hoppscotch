<template>
  <div class="collections-wrapper">
    <addCollection
      v-bind:show     = "showModalAdd"
      v-on:hide-modal = 'displayModalAdd(false)'
      >
    </addCollection>
    <editCollection
      v-bind:show                   = "showModalEdit"
      v-bind:editingCollection      = "editingCollection"
      v-bind:editingCollectionIndex = "editingCollectionIndex"
      v-on:hide-modal               = 'displayModalEdit(false)'
      >
    </editCollection>
    <addFolder
        v-bind:show            = "showModalAddFolder"
        v-bind:collection      = "editingCollection"
        v-bind:collectionIndex = "editingCollectionIndex"
        v-on:hide-modal        = 'displayModalAddFolder(false)'
    >
    </addFolder>
    <editFolder
        v-bind:show            = "showModalEditFolder"
        v-bind:collection      = "editingCollection"
        v-bind:collectionIndex = "editingCollectionIndex"
        v-bind:folder          = "editingFolder"
        v-bind:folderIndex     = "editingFolderIndex"
        v-on:hide-modal        = 'displayModalEditFolder(false)'
    >
    </editFolder>
    <importExportCollections
        v-bind:show     = "showModalImportExport"
        v-on:hide-modal = 'displayModalImportExport(false)'
        >
    </importExportCollections>

    <div class='flex-wrap'>
      <div>
        <button class="icon" @click="displayModalAdd(true)">
          <i class="material-icons">add</i>
          <span>New</span>
        </button>
      </div>
      <div>
        <button class="icon" @click="displayModalImportExport(true)">
          <i class="material-icons">import_export</i>
          <span>Import / Export</span>
        </button>
      </div>
    </div>

    <ul>
      <li v-for="(collection, index) in collections" :key="collection.name">
        <collection
          v-bind:collection-index = "index"
          v-bind:collection       = "collection"
          v-on:edit-collection    = "editCollection(collection, index)"
          v-on:add-folder         = "addFolder(collection, index)"
          v-on:edit-folder        = "editFolder($event)"
          >
        </collection>
      </li>
      <li v-if="collections.length === 0">
        <label>Collections are empty</label>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
  ul {
    display: flex;
    flex-direction: column;
  }
</style>

<script>
  import addCollection           from "./addCollection";
  import addFolder               from "./addFolder";
  import collection              from './collection'
  import editCollection          from "./editCollection";
  import editFolder              from "./editFolder";
  import importExportCollections from "./importExportCollections";

  export default {
    components: {
      addCollection,
      addFolder,
      collection,
      editCollection,
      editFolder,
      importExportCollections,
    },
    data() {
      return {
        showModalAdd           : false,
        showModalEdit          : false,
        showModalImportExport  : false,
        showModalAddFolder     : false,
        showModalEditFolder    : false,
        editingCollection      : undefined,
        editingCollectionIndex : undefined,
        editingFolder          : undefined,
        editingFolderIndex     : undefined,
      }
    },
    computed: {
      collections () {
        return this.$store.state.postwoman.collections
      }
    },
    methods: {
      displayModalAdd(shouldDisplay) {
        this.showModalAdd = shouldDisplay
      },
      displayModalEdit(shouldDisplay) {
        this.showModalEdit = shouldDisplay

        if (!shouldDisplay)
          this.resetSelectedData()
      },
      displayModalImportExport(shouldDisplay) {
        this.showModalImportExport = shouldDisplay
      },
      displayModalAddFolder(shouldDisplay) {
          this.showModalAddFolder = shouldDisplay

          if (!shouldDisplay)
            this.resetSelectedData()
      },
      displayModalEditFolder(shouldDisplay) {
          this.showModalEditFolder = shouldDisplay

          if (!shouldDisplay)
            this.resetSelectedData()
      },
      editCollection(collection, collectionIndex) {
        this.$data.editingCollection      = collection
        this.$data.editingCollectionIndex = collectionIndex
        this.displayModalEdit(true)
      },
      addFolder(collection, collectionIndex) {
        this.$data.editingCollection      = collection
        this.$data.editingCollectionIndex = collectionIndex
        this.displayModalAddFolder(true)
      },
      editFolder(payload) {
        const { collectionIndex, folder, folderIndex } = payload
        this.$data.editingCollection      = collection
        this.$data.editingCollectionIndex = collectionIndex
        this.$data.editingFolder          = folder
        this.$data.editingFolderIndex     = folderIndex
        this.displayModalEditFolder(true)
      },
      resetSelectedData() {
        this.$data.editingCollection      = undefined
        this.$data.editingCollectionIndex = undefined
        this.$data.editingFolder          = undefined
        this.$data.editingFolderIndex     = undefined
      },
    },
  }

</script>
