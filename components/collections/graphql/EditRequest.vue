<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="title">{{ $t("edit_request") }}</h3>
        <div>
          <button class="icon" @click="hideModal">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
    <div slot="body" class="flex flex-col">
      <label for="selectLabel">{{ $t("label") }}</label>
      <input
        id="selectLabel"
        v-model="requestUpdateData.name"
        type="text"
        :placeholder="request.name"
        @keyup.enter="saveRequest"
      />
    </div>
    <div slot="footer">
      <div class="row-wrapper">
        <span></span>
        <span>
          <button class="icon" @click="hideModal">
            {{ $t("cancel") }}
          </button>
          <button class="icon primary" @click="saveRequest">
            {{ $t("save") }}
          </button>
        </span>
      </div>
    </div>
  </SmartModal>
</template>

<script>
import { fb } from "~/helpers/fb"

export default {
  props: {
    show: Boolean,
    collectionIndex: { type: Number, default: null },
    folderIndex: { type: Number, default: null },
    folderName: { type: String, default: null },
    request: { type: Object, default: () => {} },
    requestIndex: { type: Number, default: null },
  },
  data() {
    return {
      requestUpdateData: {
        name: undefined,
      },
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
    saveRequest() {
      const requestUpdated = {
        ...this.$props.request,
        name: this.$data.requestUpdateData.name || this.$props.request.name,
      }

      this.$store.commit("postwoman/editRequest", {
        requestCollectionIndex: this.$props.collectionIndex,
        requestFolderName: this.$props.folderName,
        requestFolderIndex: this.$props.folderIndex,
        requestNew: requestUpdated,
        requestIndex: this.$props.requestIndex,
        flag: "graphql",
      })

      this.hideModal()
      this.syncCollections()
    },
    hideModal() {
      this.$emit("hide-modal")
    },
  },
}
</script>
