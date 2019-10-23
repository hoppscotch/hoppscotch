<template>
  <div class="collections-wrapper">
    <addCollection
      v-bind:show="showModalAdd"
      v-on:hide-modal='displayModalAdd(false)'
      >
    </addCollection>
    <editCollection
      v-bind:show="showModalEdit"
      v-bind:editingCollection="editingCollection"
      v-bind:editingCollectionIndex="editingCollectionIndex"
      v-on:hide-modal='displayModalEdit(false)'
      >
    </editCollection>

    <importExportCollections :show="showModalImportExport" v-on:hide-modal='displayImportExport(false)'></importExportCollections>

    <div class='flex-wrap'>
      <div>
        <button class="icon" @click="displayModalAdd(true)">
          <i class="material-icons">add</i>
          <span>New</span>
        </button>
      </div>
      <div>
        <button class="icon" @click="displayImportExport(true)">
          <i class="material-icons">import_export</i>
          <span>Import / Export</span>
        </button>
      </div>
    </div>

    <ul>
      <li v-for="(collection, index) in collections" :key="collection.name">
        <collection
          :collection-index="index"
          :collection="collection"
          v-on:edit-collection="editCollection(collection, index)"
          ></collection>
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
  import addCollection from "./addCollection";
  import editCollection from "./editCollection";
  import importExportCollections from "./importExportCollections";
  import collection from './collection'

  export default {
    components: {
      collection,
      addCollection,
      editCollection,
      importExportCollections,
    },
    data() {
      return {
        showModalAdd: false,
        showModalEdit: false,
        showModalImportExport: false,
        editingCollection: undefined,
        editingCollectionIndex: undefined,
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

        if (!shouldDisplay) {
          this.$data.editingCollection = undefined
          this.$data.editingCollectionIndex = undefined
        }
      },
      displayImportExport(shouldDisplay) {
        this.showModalImportExport = shouldDisplay
      },
      editCollection(collection, collectionIndex) {
        this.$data.editingCollection = collection
        this.$data.editingCollectionIndex = collectionIndex
        this.displayModalEdit(true)
      },
    },
  }

</script>
