<template>
  <div class="flex-wrap">
    <div>
      <button
        class="icon"
        @click="!doc ? selectRequest() : {}"
        v-tooltip="!doc ? $t('use_request') : ''"
      >
        <icon :icon="'insert_drive_file'" />
        <span>{{ request.name }}</span>
      </button>
    </div>
    <v-popover>
      <button class="tooltip-target icon" v-tooltip="$t('more')">
        <icon :icon="'more_vert'" />
      </button>
      <template slot="popover">
        <div>
          <button class="icon" @click="$emit('edit-request')" v-close-popover>
            <icon :icon="'edit'" />
            <span>{{ $t("edit") }}</span>
          </button>
        </div>
        <div>
          <button class="icon" @click="removeRequest" v-close-popover>
            <icon :icon="'delete'" />
            <span>{{ $t("delete") }}</span>
          </button>
        </div>
      </template>
    </v-popover>
  </div>
</template>

<style scoped lang="scss">
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
import { fb } from "~/helpers/fb"

export default {
  props: {
    request: Object,
    collectionIndex: Number,
    folderIndex: Number,
    requestIndex: Number,
    doc: Boolean,
  },
  methods: {
    syncCollections() {
      if (fb.currentUser !== null) {
        if (fb.currentSettings[0].value) {
          fb.writeCollections(JSON.parse(JSON.stringify(this.$store.state.postwoman.collections)))
        }
      }
    },
    selectRequest() {
      this.$store.commit("postwoman/selectRequest", { request: this.request })
    },
    removeRequest() {
      if (!confirm("Are you sure you want to remove this request?")) return
      this.$store.commit("postwoman/removeRequest", {
        collectionIndex: this.collectionIndex,
        folderIndex: this.folderIndex,
        requestIndex: this.requestIndex,
      })
      this.syncCollections()
    },
  },
}
</script>
