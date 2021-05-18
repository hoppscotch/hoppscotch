<template>
  <div>
    <div
      :class="[
        'row-wrapper transition duration-150 ease-in-out',
        { 'bg-bgDarkColor': dragging },
      ]"
      draggable="true"
      @dragstart="dragStart"
      @dragover.stop
      @dragleave="dragging = false"
      @dragend="dragging = false"
    >
      <div>
        <button
          v-tooltip="!doc ? $t('use_request') : ''"
          class="icon"
          @click="!doc ? selectRequest() : {}"
        >
          <i class="material-icons">description</i>
          <span>{{ request.name }}</span>
        </button>
      </div>
      <v-popover>
        <button v-tooltip="$t('more')" class="tooltip-target icon">
          <i class="material-icons">more_vert</i>
        </button>
        <template slot="popover">
          <div>
            <button
              v-close-popover
              class="icon"
              @click="
                $emit('edit-request', {
                  collectionIndex,
                  folderIndex,
                  folderName,
                  request,
                  requestIndex,
                })
              "
            >
              <i class="material-icons">edit</i>
              <span>{{ $t("edit") }}</span>
            </button>
          </div>
          <div>
            <button v-close-popover class="icon" @click="confirmRemove = true">
              <i class="material-icons">delete</i>
              <span>{{ $t("delete") }}</span>
            </button>
          </div>
        </template>
      </v-popover>
    </div>
    <SmartConfirmModal
      :show="confirmRemove"
      :title="$t('are_you_sure_remove_request')"
      @hide-modal="confirmRemove = false"
      @resolve="removeRequest"
    />
  </div>
</template>

<script>
import { fb } from "~/helpers/fb"

export default {
  props: {
    request: { type: Object, default: () => {} },
    collectionIndex: { type: Number, default: null },
    folderIndex: { type: Number, default: null },
    folderName: { type: String, default: null },
    requestIndex: { type: Number, default: null },
    doc: Boolean,
  },
  data() {
    return {
      dragging: false,
      confirmRemove: false,
    }
  },
  methods: {
    syncCollections() {
      if (fb.currentUser !== null && fb.currentSettings[0]) {
        if (fb.currentSettings[0].value) {
          fb.writeCollections(
            JSON.parse(
              JSON.stringify(this.$store.state.postwoman.collectionsGraphql)
            ),
            "collectionsGraphql"
          )
        }
      }
    },
    selectRequest() {
      this.$store.commit("postwoman/selectGraphqlRequest", {
        request: this.request,
      })
    },
    dragStart({ dataTransfer }) {
      this.dragging = !this.dragging
      dataTransfer.setData("oldCollectionIndex", this.$props.collectionIndex)
      dataTransfer.setData("oldFolderIndex", this.$props.folderIndex)
      dataTransfer.setData("oldFolderName", this.$props.folderName)
      dataTransfer.setData("requestIndex", this.$props.requestIndex)
    },
    removeRequest() {
      this.$store.commit("postwoman/removeRequest", {
        collectionIndex: this.$props.collectionIndex,
        folderName: this.$props.folderName,
        requestIndex: this.$props.requestIndex,
        flag: "graphql",
      })
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
      })
      this.confirmRemove = false
      this.syncCollections()
    },
  },
}
</script>
