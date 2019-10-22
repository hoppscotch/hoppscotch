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

    <exportCollection :show="showExportModal" v-on:hide-model='toggleExport'></exportCollection>

    <div class='flex-wrap'>
      <h3 class="title">Collections</h3>
      <div>
        <button class="icon" @click="toggleModal">
          <i class="material-icons">add</i>
          <span>New</span>
        </button>
        <button class="icon" @click="toggleExport">
          <i class="material-icons">import_export</i>
          <span>Export</span>
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
  import exportCollection from "./exportCollection";
  import collection from './collection'

  export default {
    components: {
      collection,
      addCollection,
      exportCollection,
    },
    data() {
      return {
        showAddModel: false,
        showExportModal: false,
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
      toggleExport() {
        this.showExportModal = !this.showExportModal;
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
