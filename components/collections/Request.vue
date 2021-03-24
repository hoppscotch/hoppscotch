<template>
  <div>
    <div
      :class="['row-wrapper transition duration-150 ease-in-out', { 'bg-bgDarkColor': dragging }]"
      draggable="true"
      @dragstart="dragStart"
      @dragover.stop
      @dragleave="dragging = false"
      @dragend="dragging = false"
    >
      <div>
        <button
          class="icon"
          @click="!doc ? selectRequest() : {}"
          v-tooltip="!doc ? $t('use_request') : ''"
        >
          <span :class="getRequestLabelColor(request.method)">{{ request.method }}</span>
          <span>{{ request.name }}</span>
        </button>
      </div>
      <v-popover>
        <button class="tooltip-target icon" v-tooltip="$t('more')">
          <i class="material-icons">more_vert</i>
        </button>
        <template slot="popover">
          <div>
            <button
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
              v-close-popover
            >
              <i class="material-icons">edit</i>
              <span>{{ $t("edit") }}</span>
            </button>
          </div>
          <div>
            <button class="icon" @click="confirmRemove = true" v-close-popover>
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
import { getSettingSubject } from "~/newstore/settings"

export default {
  props: {
    request: Object,
    collectionIndex: Number,
    folderIndex: Number,
    folderName: String,
    requestIndex: Number,
    doc: Boolean,
  },
  data() {
    return {
      dragging: false,
      requestMethodLabels: {
        get: "text-green-400",
        post: "text-yellow-400",
        put: "text-blue-400",
        delete: "text-red-400",
        default: "text-gray-400",
      },
      confirmRemove: false,
    }
  },
  subscriptions() {
    return {
      SYNC_COLLECTIONS: getSettingSubject("syncCollections"),
    }
  },
  methods: {
    syncCollections() {
      if (fb.currentUser !== null && this.SYNC_COLLECTIONS) {
        fb.writeCollections(
          JSON.parse(JSON.stringify(this.$store.state.postwoman.collections)),
          "collections"
        )
      }
    },
    selectRequest() {
      this.$store.commit("postwoman/selectRequest", { request: this.request })
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
        flag: "rest",
      })
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
      })
      this.confirmRemove = false
      this.syncCollections()
    },
    getRequestLabelColor(method) {
      return this.requestMethodLabels[method.toLowerCase()] || this.requestMethodLabels.default
    },
  },
}
</script>
