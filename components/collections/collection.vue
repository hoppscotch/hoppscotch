<template>
  <div>
    <div class="flex-wrap">
      <div>
        <button class="icon" @click="toggleShowChildren">
          <i class="material-icons" v-show="!showChildren">arrow_right</i>
          <i class="material-icons" v-show="showChildren">arrow_drop_down</i>
          <i class="material-icons">folder</i>
          <span>{{collection.name}}</span>
        </button>
      </div>
      <div>
        <button class="icon" @click="removeCollection" v-tooltip="'Delete collection'">
          <i class="material-icons">delete</i>
        </button>
        <button class="icon" @click="$emit('edit-collection')" v-tooltip="'Edit collection'">
          <i class="material-icons">create</i>
        </button>
        <button class="icon" @click="$emit('add-folder')" v-tooltip="'New Folder'">
          <i class="material-icons">create_new_folder</i>
        </button>
      </div>
    </div>

    <div v-show="showChildren">
      <ul>
        <li v-for="(folder, index) in collection.folders" :key="folder.name">
          <folder
            v-bind:folder="folder"
            v-bind:folderIndex="index"
            v-bind:collection-index="collectionIndex"
            v-on:edit-folder="editFolder(collectionIndex, folder, index)"
            v-on:edit-request="$emit('edit-request', $event)"
          />
        </li>
        <li v-if="(collection.folders.length === 0) && (collection.requests.length === 0)">
          <label>Collection is empty</label>
        </li>
      </ul>

      <ul>
        <li v-for="(request, index) in collection.requests" :key="index">
          <request
            v-bind:request="request"
            v-bind:collection-index="collectionIndex"
            v-bind:folder-index="-1"
            v-bind:request-index="index"
            v-on:edit-request="$emit('edit-request', { request, collectionIndex, folderIndex: undefined, requestIndex: index })"
          ></request>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
  ul {
    display: flex;
    flex-direction: column;
  }

  ul li {
    display: flex;
    margin-left: 32px;
    border-left: 1px solid var(--brd-color);
  }
</style>

<script>
  import folder from "./folder";
  import request from "./request";

  export default {
    components: {
      folder,
      request
    },
    props: {
      collectionIndex: Number,
      collection: Object
    },
    data() {
      return {
        showChildren: false,
        selectedFolder: {}
      };
    },
    methods: {
      toggleShowChildren() {
        this.showChildren = !this.showChildren;
      },
      removeCollection() {
        if (!confirm("Are you sure you want to remove this collection?")) return;
        this.$store.commit("postwoman/removeCollection", {
          collectionIndex: this.collectionIndex
        });
      },
      editFolder(collectionIndex, folder, folderIndex) {
        this.$emit("edit-folder", { collectionIndex, folder, folderIndex });
      }
    }
  };
</script>
