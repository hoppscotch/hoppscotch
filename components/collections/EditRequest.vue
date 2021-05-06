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
        type="text"
        id="selectLabel"
        v-model="requestUpdateData.name"
        @keyup.enter="saveRequest"
        :placeholder="request.name"
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
import { getSettingSubject } from "~/newstore/settings"
import * as team_utils from "~/helpers/teams/utils"

export default {
  props: {
    show: Boolean,
    collectionIndex: Number,
    folderIndex: Number,
    folderName: String,
    request: Object,
    requestIndex: [String, Number],
    collectionsType: Object,
  },
  data() {
    return {
      requestUpdateData: {
        name: undefined,
      },
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
    saveRequest() {
      const requestUpdated = {
        ...this.$props.request,
        name: this.$data.requestUpdateData.name || this.$props.request.name,
      }

      if (this.$props.collectionsType.type == "my-collections") {
        this.$store.commit("postwoman/editRequest", {
          requestCollectionIndex: this.$props.collectionIndex,
          requestFolderName: this.$props.folderName,
          requestFolderIndex: this.$props.folderIndex,
          requestNew: requestUpdated,
          requestIndex: this.$props.requestIndex,
          flag: "rest",
        })
        this.syncCollections()
      } else if (this.$props.collectionsType.type == "team-collections") {
        if (this.collectionsType.selectedTeam.myRole != "VIEWER") {
          let requestName = this.$data.requestUpdateData.name || this.$props.request.name
          team_utils
            .updateRequest(this.$apollo, requestUpdated, requestName, this.$props.requestIndex)
            .then((data) => {
              // Result
              this.$toast.success("Request Renamed", {
                icon: "done",
              })
              this.$emit("update-team-collections")
            })
            .catch((error) => {
              // Error
              this.$toast.error(this.$t("error_occurred"), {
                icon: "done",
              })
              console.error(error)
            })
        }
      }

      this.hideModal()
    },
    hideModal() {
      this.$emit("hide-modal")
    },
  },
}
</script>
