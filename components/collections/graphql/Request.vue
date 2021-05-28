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
                  request,
                  requestIndex,
                  folderPath,
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

<script lang="ts">
import Vue from "vue"
import { removeGraphqlRequest } from "~/newstore/collections"

export default Vue.extend({
  props: {
    request: { type: Object, default: () => {} },
    folderPath: { type: String, default: null },
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
    selectRequest() {
      this.$store.commit("postwoman/selectGraphqlRequest", {
        request: this.request,
      })
    },
    dragStart({ dataTransfer }: any) {
      this.dragging = !this.dragging
      // TODO: Discuss
      dataTransfer.setData("oldCollectionIndex", this.$props.collectionIndex)
      dataTransfer.setData("oldFolderIndex", this.$props.folderIndex)
      dataTransfer.setData("oldFolderName", this.$props.folderName)
      dataTransfer.setData("requestIndex", this.$props.requestIndex)
    },
    removeRequest() {
      removeGraphqlRequest(this.folderPath, this.requestIndex)
      this.$toast.error(this.$t("deleted").toString(), {
        icon: "delete",
      })
      this.confirmRemove = false
    },
  },
})
</script>
