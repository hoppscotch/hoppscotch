<template>
  <div>
    <div class="flex-wrap">
      <div>
        <button class="icon" @click="toggleShowChildren">
          <i v-show="!showChildren" class="material-icons">arrow_right</i>
          <i v-show="showChildren" class="material-icons">arrow_drop_down</i>
          <i class="material-icons">folder_open</i>
          <span>{{ folder.name }}</span>
        </button>
      </div>
      <v-popover>
        <button v-tooltip="'More'" class="tooltip-target icon">
          <i class="material-icons">more_vert</i>
        </button>
        <template slot="popover">
          <div>
            <button v-close-popover class="icon" @click="editFolder">
              <i class="material-icons">edit</i>
              <span>Edit</span>
            </button>
          </div>
          <div>
            <button v-close-popover class="icon" @click="removeFolder">
              <i class="material-icons">delete</i>
              <span>Delete</span>
            </button>
          </div>
        </template>
      </v-popover>
    </div>

    <div v-show="showChildren">
      <ul>
        <li v-for="(request, index) in folder.requests" :key="index">
          <request
            :request="request"
            :collection-index="collectionIndex"
            :folder-index="folderIndex"
            :request-index="index"
            @edit-request="
              $emit('edit-request', {
                request,
                collectionIndex,
                folderIndex,
                requestIndex: index
              })
            "
          />
        </li>
        <li v-if="folder.requests.length === 0">
          <label>Folder is empty</label>
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
    request: () => import("./request")
  },
  props: {
    folder: Object,
    collectionIndex: Number,
    folderIndex: Number
  },
  data() {
    return {
      showChildren: false
    }
  },
  methods: {
    toggleShowChildren() {
      this.showChildren = !this.showChildren
    },
    selectRequest(request) {
      this.$store.commit("postwoman/selectRequest", { request })
    },
    removeFolder() {
      if (!confirm("Are you sure you want to remove this folder?")) return
      this.$store.commit("postwoman/removeFolder", {
        collectionIndex: this.collectionIndex,
        folderIndex: this.folderIndex
      })
    },
    editFolder() {
      this.$emit("edit-folder")
    }
  }
}
</script>
