<template>
  <div class="collections-wrapper">
    <addCollection
      v-bind:show="showAddModel"
      v-on:new-collection="addNewCollection"
      v-on:hide-model='toggleModal'
      v-bind:editing-collection="selectedCollection"
      v-on:saved-collection="savedCollection"
      >
    </addCollection>

    <importExportCollections :show="showImportExportModal" v-on:hide-model='toggleImportExport'></importExportCollections>

    <div class='flex-wrap'>
      <div>
        <button class="icon" @click="toggleModal">
          <i class="material-icons">add</i>
          <span>New</span>
        </button>
      </div>
      <div>
        <button class="icon" @click="toggleImportExport">
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
          v-on:edit-collection="editCollection"
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
  import importExportCollections from "./importExportCollections";
  import collection from './collection'

  export default {
    components: {
      collection,
      addCollection,
      importExportCollections,
    },
    data() {
      return {
        showAddModel: false,
        showImportExportModal: false,
        selectedCollection: {},
      }
    },
    computed: {
      collections () {
        return this.$store.state.postwoman.collections;
      }
    },
    methods: {
      toggleModal() {
        this.showAddModel = !this.showAddModel;
      },
      toggleImportExport() {
        this.showImportExportModal = !this.showImportExportModal;
      },
      addNewCollection(newCollection) {
        this.$store.commit('postwoman/addCollection', newCollection);
        this.showAddModel = false;
      },
      editCollection(payload) {
        const { collection, collectionIndex } = payload;
        this.selectedCollection = Object.assign({ collectionIndex }, collection);
        this.showAddModel = true;
      },
      savedCollection(savedCollection) {
        this.$store.commit('postwoman/saveCollection', { savedCollection });
        this.showAddModel = false;
        this.selectedCollection = {};
      },
    },
  }

</script>
