<template>
  <div>
    <div class="flex-wrap">
      <div>
        <button class="icon" @click="toggleShowChildren">
          <i class="material-icons" v-show="!showChildren">arrow_right</i>
          <i class="material-icons" v-show="showChildren">arrow_drop_down</i>
          <i class="material-icons">folder</i>
          <span>{{ collection.name }}</span>
        </button>
      </div>
      <v-popover>
        <button class="tooltip-target icon" v-tooltip="'More'">
          <i class="material-icons">more_vert</i>
        </button>
        <template slot="popover">
          <div>
            <button
              class="icon"
              @click="$emit('add-folder')"
              v-tooltip="'New Folder'"
              v-close-popover
            >
              <i class="material-icons">create_new_folder</i>
              <span>New folder</span>
            </button>
          </div>
          <div>
            <button
              class="icon"
              @click="$emit('edit-collection')"
              v-tooltip="'Edit collection'"
              v-close-popover
            >
              <i class="material-icons">create</i>
              <span>Edit</span>
            </button>
          </div>
          <div>
            <button
              class="icon"
              @click="removeCollection"
              v-tooltip="'Delete collection'"
              v-close-popover
            >
              <i class="material-icons">delete</i>
              <span>Delete</span>
            </button>
          </div>
        </template>
      </v-popover>
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
        <li
          v-if="
            collection.folders.length === 0 && collection.requests.length === 0
          "
        >
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
            v-on:edit-request="
              $emit('edit-request', {
                request,
                collectionIndex,
                folderIndex: undefined,
                requestIndex: index
              })
            "
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
export default {
  components: {
    folder: () => import("./folder"),
    request: () => import("./request")
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
