<template>
  <div class="flex-wrap">
    <div>
      <button
        class="icon"
        @click="!doc ? selectRequest() : {}"
        v-tooltip="!doc ? $t('use_request') : ''"
      >
        <i class="material-icons">insert_drive_file</i>
        <span>{{ request.name }}</span>
      </button>
    </div>
    <v-popover>
      <button class="tooltip-target icon" v-tooltip="$t('more')">
        <i class="material-icons">more_vert</i>
      </button>
      <template slot="popover">
        <div>
          <button class="icon" @click="$emit('edit-request')" v-close-popover>
            <i class="material-icons">edit</i>
            <span>{{ $t("edit") }}</span>
          </button>
        </div>
        <div>
          <button class="icon" @click="removeRequest" v-close-popover>
            <deleteIcon class="material-icons" />
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
import deleteIcon from "~/static/icons/delete-24px.svg?inline"

export default {
  components: { deleteIcon },
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
      if (!confirm(this.$t("are_you_sure_remove_request"))) return
      this.$store.commit("postwoman/removeRequest", {
        collectionIndex: this.collectionIndex,
        folderIndex: this.folderIndex,
        requestIndex: this.requestIndex,
      })
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
      })
      this.syncCollections()
    },
  },
}
</script>
