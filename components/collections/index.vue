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

    <div class='header'>
      <Label>Collections</label>
      <button class="collection-button" @click="toggleModal">+</button>
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

  .header {
    display: flex;
    align-items: center;
  }

  .collection-button {
    padding: 0;
    width: 20px;
    margin: 0;
    height: 20px;
    border-radius: 50%;
  }
</style>

<script>
  import addCollection from "./addCollection";
  import collection from './collection'

  export default {
    components: {
      collection,
      addCollection,
    },
    data() {
      return {
        showAddModel: false,
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
