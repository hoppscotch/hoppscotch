<template>
  <div class="flex-wrap">
    <div>
      <button v-tooltip="'Use request'" class="icon" @click="selectRequest()">
        <i class="material-icons">insert_drive_file</i>
        <span>{{ request.name }}</span>
      </button>
    </div>
    <v-popover>
      <button v-tooltip="'More'" class="tooltip-target icon">
        <i class="material-icons">more_vert</i>
      </button>
      <template slot="popover">
        <div>
          <button v-close-popover class="icon" @click="$emit('edit-request')">
            <i class="material-icons">edit</i>
            <span>Edit</span>
          </button>
        </div>
        <div>
          <button v-close-popover class="icon" @click="removeRequest">
            <i class="material-icons">delete</i>
            <span>Delete</span>
          </button>
        </div>
      </template>
    </v-popover>
  </div>
</template>

<style scoped>
ul {
  display: flex;
  flex-direction: column;
}

ul li {
  display: flex;
  padding-left: 16px;
  border-left: 1px solid var(--brd-color);
}
</style>

<script>
export default {
  props: {
    request: Object,
    collectionIndex: Number,
    folderIndex: Number,
    requestIndex: Number
  },
  methods: {
    selectRequest() {
      this.$store.commit("postwoman/selectRequest", { request: this.request })
    },
    removeRequest() {
      if (!confirm("Are you sure you want to remove this request?")) return
      this.$store.commit("postwoman/removeRequest", {
        collectionIndex: this.collectionIndex,
        folderIndex: this.folderIndex,
        requestIndex: this.requestIndex
      })
    }
  }
}
</script>
