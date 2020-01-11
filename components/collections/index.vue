<!--
TODO:
    - probably refactor and pass event arguments to modals directly without unpacking
-->

<template>
  <div class="collections-wrapper">
    <addCollection :show="showModalAdd" @hide-modal="displayModalAdd(false)" />
    <editCollection
      :show="showModalEdit"
      :editingCollection="editingCollection"
      :editingCollectionIndex="editingCollectionIndex"
      @hide-modal="displayModalEdit(false)"
    />
    <addFolder
      :show="showModalAddFolder"
      :collection="editingCollection"
      :collectionIndex="editingCollectionIndex"
      @hide-modal="displayModalAddFolder(false)"
    />
    <editFolder
      :show="showModalEditFolder"
      :collection="editingCollection"
      :collectionIndex="editingCollectionIndex"
      :folder="editingFolder"
      :folderIndex="editingFolderIndex"
      @hide-modal="displayModalEditFolder(false)"
    />
    <editRequest
      :show="showModalEditRequest"
      :collectionIndex="editingCollectionIndex"
      :folderIndex="editingFolderIndex"
      :request="editingRequest"
      :requestIndex="editingRequestIndex"
      @hide-modal="displayModalEditRequest(false)"
    />
    <importExportCollections
      :show="showModalImportExport"
      @hide-modal="displayModalImportExport(false)"
    />

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
        <!-- <a
          href="https://github.com/liyasthomas/postwoman/wiki/Collections"
          target="_blank"
          rel="noopener"
        >
          <button class="icon" v-tooltip="'Wiki'">
            <i class="material-icons">help</i>
          </button>
        </a> -->
      </div>
    </div>
    <p v-if="collections.length === 0" class="info">
      Create new collection
    </p>
    <virtual-list
      class="virtual-list"
      :class="{ filled: collections.length }"
      :size="152"
      :remain="Math.min(5, collections.length)"
    >
      <ul>
        <li v-for="(collection, index) in collections" :key="collection.name">
          <collection
            :collection-index="index"
            :collection="collection"
            @edit-collection="editCollection(collection, index)"
            @add-folder="addFolder(collection, index)"
            @edit-folder="editFolder($event)"
            @edit-request="editRequest($event)"
          />
        </li>
        <li v-if="collections.length === 0">
          <label>Collections are empty</label>
        </li>
      </ul>
    </virtual-list>
  </div>
</template>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 232px);
}

ul {
  display: flex;
  flex-direction: column;
}
</style>

<script lang="ts">
import Vue from "vue";
import { Collection } from "../../store/postwoman";

import collection from "./collection.vue";
import addCollection from "./addCollection.vue";
import addFolder from "./addFolder.vue";
import editCollection from "./editCollection.vue";
import editFolder from "./editFolder.vue";
import editRequest from "./editRequest.vue";
import importExportCollections from "./importExportCollections.vue";
import VirtualList from "vue-virtual-scroll-list";

export default Vue.extend({
  components: {
    collection,
    addCollection: addCollection,
    addFolder: addFolder,
    editCollection: editCollection,
    editFolder: editFolder,
    editRequest: editRequest,
    importExportCollections: importExportCollections,
    VirtualList: VirtualList 
  },
  data() {
    return {
      showModalAdd: false,
      showModalEdit: false,
      showModalImportExport: false,
      showModalAddFolder: false,
      showModalEditFolder: false,
      showModalEditRequest: false,
      editingCollection: undefined as Collection | undefined,
      editingCollectionIndex: undefined as number | undefined,
      editingFolder: undefined as any | undefined,
      editingFolderIndex: undefined as number | undefined,
      editingRequest: undefined as any | undefined,
      editingRequestIndex: undefined as number | undefined
    };
  },
  computed: {
    collections(): Collection[] {
      return this.$store.state.postwoman.collections;
    }
  },
  methods: {
    displayModalAdd(shouldDisplay: boolean) {
      this.showModalAdd = shouldDisplay;
    },
    displayModalEdit(shouldDisplay: boolean) {
      this.showModalEdit = shouldDisplay;

      if (!shouldDisplay) this.resetSelectedData();
    },
    displayModalImportExport(shouldDisplay: boolean) {
      this.showModalImportExport = shouldDisplay;
    },
    displayModalAddFolder(shouldDisplay: boolean) {
      this.showModalAddFolder = shouldDisplay;

      if (!shouldDisplay) this.resetSelectedData();
    },
    displayModalEditFolder(shouldDisplay: boolean) {
      this.showModalEditFolder = shouldDisplay;

      if (!shouldDisplay) this.resetSelectedData();
    },
    displayModalEditRequest(shouldDisplay: boolean) {
      this.showModalEditRequest = shouldDisplay;

      if (!shouldDisplay) this.resetSelectedData();
    },
    editCollection(collection: Collection, collectionIndex: number) {
      this.$data.editingCollection = collection;
      this.$data.editingCollectionIndex = collectionIndex;
      this.displayModalEdit(true);
    },
    addFolder(collection: Collection, collectionIndex: number) {
      this.$data.editingCollection = collection;
      this.$data.editingCollectionIndex = collectionIndex;
      this.displayModalAddFolder(true);
    },
    editFolder(payload: { collectionIndex: number, folder: any, folderIndex: number }) {
      const { collectionIndex, folder, folderIndex } = payload;
      this.$data.editingCollection = collection;
      this.$data.editingCollectionIndex = collectionIndex;
      this.$data.editingFolder = folder;
      this.$data.editingFolderIndex = folderIndex;
      this.displayModalEditFolder(true);
    },
    editRequest(payload: { request: any, collectionIndex: number, folderIndex: number, requestIndex: number }) {
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
});
</script>
