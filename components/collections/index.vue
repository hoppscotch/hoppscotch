<!--
TODO:
    - probably refactor and pass event arguments to modals directly without unpacking
-->

<template>
  <div class="collections-wrapper">
    <addCollection
      v-bind:show="showModalAdd"
      v-on:hide-modal="displayModalAdd(false)"
    ></addCollection>
    <editCollection
      v-bind:show="showModalEdit"
      v-bind:editingCollection="editingCollection"
      v-bind:editingCollectionIndex="editingCollectionIndex"
      v-on:hide-modal="displayModalEdit(false)"
    ></editCollection>
    <addFolder
      v-bind:show="showModalAddFolder"
      v-bind:collection="editingCollection"
      v-bind:collectionIndex="editingCollectionIndex"
      v-on:hide-modal="displayModalAddFolder(false)"
    ></addFolder>
    <editFolder
      v-bind:show="showModalEditFolder"
      v-bind:collection="editingCollection"
      v-bind:collectionIndex="editingCollectionIndex"
      v-bind:folder="editingFolder"
      v-bind:folderIndex="editingFolderIndex"
      v-on:hide-modal="displayModalEditFolder(false)"
    ></editFolder>
    <editRequest
      v-bind:show="showModalEditRequest"
      v-bind:collectionIndex="editingCollectionIndex"
      v-bind:folderIndex="editingFolderIndex"
      v-bind:request="editingRequest"
      v-bind:requestIndex="editingRequestIndex"
      v-on:hide-modal="displayModalEditRequest(false)"
    ></editRequest>
    <importExportCollections
      v-bind:show="showModalImportExport"
      v-on:hide-modal="displayModalImportExport(false)"
    ></importExportCollections>

    <div class="flex-wrap">
      <div>
        <button class="icon" @click="displayModalAdd(true)">
          <i class="material-icons">add</i>
          <span>New</span>
        </button>
      </div>
      <div>
        <button
          class="icon"
          @click="displayModalImportExport(true)"
          v-tooltip="'Import / Export'"
        >
          <i class="material-icons">import_export</i>
        </button>
        <a
          href="https://github.com/liyasthomas/postwoman/wiki/Collections"
          target="_blank"
          rel="noopener"
        >
          <button class="icon" v-tooltip="'Wiki'">
            <i class="material-icons">help</i>
          </button>
        </a>
      </div>
    </div>

    <virtual-list
      class="virtual-list"
      :class="{ filled: collections.length }"
      :size="152"
      :remain="Math.min(5, collections.length)"
    >
      <ul>
        <li v-for="(collection, index) in collections" :key="collection.name">
          <collection
            v-bind:collection-index="index"
            v-bind:collection="collection"
            v-on:edit-collection="editCollection(collection, index)"
            v-on:add-folder="addFolder(collection, index)"
            v-on:edit-folder="editFolder($event)"
            v-on:edit-request="editRequest($event)"
          ></collection>
        </li>
        <li v-if="collections.length === 0">
          <label>Collections are empty</label>
        </li>
      </ul>
    </virtual-list>
  </div>
</template>

<style lang="scss" scoped>
.virtual-list {
  max-height: calc(100vh - 220px);
}

ul {
  display: flex;
  flex-direction: column;
}
</style>

<script>
import collection from "./collection";

export default {
  components: {
    collection,
    addCollection: () => import("./addCollection"),
    addFolder: () => import("./addFolder"),
    editCollection: () => import("./editCollection"),
    editFolder: () => import("./editFolder"),
    editRequest: () => import("./editRequest"),
    importExportCollections: () => import("./importExportCollections"),
    VirtualList: () => import("vue-virtual-scroll-list")
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
      editingRequestIndex: undefined
    };
  },
  computed: {
    collections() {
      return this.$store.state.postwoman.collections;
    }
  },
  methods: {
    displayModalAdd(shouldDisplay) {
      this.showModalAdd = shouldDisplay;
    },
    displayModalEdit(shouldDisplay) {
      this.showModalEdit = shouldDisplay;

      if (!shouldDisplay) this.resetSelectedData();
    },
    displayModalImportExport(shouldDisplay) {
      this.showModalImportExport = shouldDisplay;
    },
    displayModalAddFolder(shouldDisplay) {
      this.showModalAddFolder = shouldDisplay;

      if (!shouldDisplay) this.resetSelectedData();
    },
    displayModalEditFolder(shouldDisplay) {
      this.showModalEditFolder = shouldDisplay;

      if (!shouldDisplay) this.resetSelectedData();
    },
    displayModalEditRequest(shouldDisplay) {
      this.showModalEditRequest = shouldDisplay;

      if (!shouldDisplay) this.resetSelectedData();
    },
    editCollection(collection, collectionIndex) {
      this.$data.editingCollection = collection;
      this.$data.editingCollectionIndex = collectionIndex;
      this.displayModalEdit(true);
    },
    addFolder(collection, collectionIndex) {
      this.$data.editingCollection = collection;
      this.$data.editingCollectionIndex = collectionIndex;
      this.displayModalAddFolder(true);
    },
    editFolder(payload) {
      const { collectionIndex, folder, folderIndex } = payload;
      this.$data.editingCollection = collection;
      this.$data.editingCollectionIndex = collectionIndex;
      this.$data.editingFolder = folder;
      this.$data.editingFolderIndex = folderIndex;
      this.displayModalEditFolder(true);
    },
    editRequest(payload) {
      const { request, collectionIndex, folderIndex, requestIndex } = payload;
      this.$data.editingCollectionIndex = collectionIndex;
      this.$data.editingFolderIndex = folderIndex;
      this.$data.editingRequest = request;
      this.$data.editingRequestIndex = requestIndex;
      this.displayModalEditRequest(true);
    },
    resetSelectedData() {
      this.$data.editingCollection = undefined;
      this.$data.editingCollectionIndex = undefined;
      this.$data.editingFolder = undefined;
      this.$data.editingFolderIndex = undefined;
      this.$data.editingRequest = undefined;
      this.$data.editingRequestIndex = undefined;
    }
  }
};
</script>
