<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="heading">{{ $t("save_request_as") }}</h3>
        <div>
          <button class="icon button" @click="hideModal">
            <i class="material-icons">close</i>
          </button>
        </div>
      </div>
    </div>
    <div slot="body" class="flex flex-col">
      <label for="selectLabel">{{ $t("token_req_name") }}</label>
      <input
        id="selectLabel"
        v-model="requestData.name"
        class="input"
        type="text"
        @keyup.enter="saveRequestAs"
      />
      <label for="selectLabel">Select location</label>
      <!-- <input class="input" readonly :value="path" /> -->

      <CollectionsGraphql
        v-if="mode === 'graphql'"
        :doc="false"
        :show-coll-actions="false"
        :picked="picked"
        :saving-mode="true"
        @select="onSelect"
      />

      <Collections
        v-else
        :picked="picked"
        :save-request="true"
        @select="onSelect"
        @update-collection="collectionsType.type = $event"
        @update-coll-type="onUpdateCollType"
      />
    </div>
    <div slot="footer">
      <div class="row-wrapper">
        <span></span>
        <span>
          <button class="icon button" @click="hideModal">
            {{ $t("cancel") }}
          </button>
          <button class="icon button primary" @click="saveRequestAs">
            {{ $t("save") }}
          </button>
        </span>
      </div>
    </div>
  </SmartModal>
</template>

<script>
import * as teamUtils from "~/helpers/teams/utils"
import {
  saveRESTRequestAs,
  editRESTRequest,
  editGraphqlRequest,
  saveGraphqlRequestAs,
} from "~/newstore/collections"

export default {
  props: {
    // mode can be either "graphql" or "rest"
    mode: { type: String, default: "rest" },
    show: Boolean,
    editingRequest: { type: Object, default: () => {} },
  },
  data() {
    return {
      defaultRequestName: "Untitled Request",
      path: "Path will appear here",
      requestData: {
        name: undefined,
        collectionIndex: undefined,
        folderName: undefined,
        requestIndex: undefined,
      },
      collectionsType: {
        type: "my-collections",
        selectedTeam: undefined,
      },
      picked: null,
    }
  },
  watch: {
    "requestData.collectionIndex": function resetFolderAndRequestIndex() {
      // if user has chosen some folder, than selected other collection, which doesn't have any folders
      // than `requestUpdateData.folderName` won't be reseted
      this.$data.requestData.folderName = undefined
      this.$data.requestData.requestIndex = undefined
    },
    "requestData.folderName": function resetRequestIndex() {
      this.$data.requestData.requestIndex = undefined
    },
    editingRequest({ name }) {
      this.$data.requestData.name = name || this.$data.defaultRequestName
    },
  },
  methods: {
    onUpdateCollType(newCollType) {
      this.collectionsType = newCollType
    },
    onSelect({ picked }) {
      this.picked = picked
    },
    saveRequestAs() {
      if (this.picked == null) {
        this.$toast.error(this.$t("select_collection"), {
          icon: "error",
        })
        return
      }
      if (this.$data.requestData.name.length === 0) {
        this.$toast.error(this.$t("empty_req_name"), {
          icon: "error",
        })
        return
      }

      const requestUpdated = {
        ...this.$props.editingRequest,
        name: this.$data.requestData.name,
      }

      // Filter out all REST file inputs
      if (this.mode === "rest" && requestUpdated.bodyParams) {
        requestUpdated.bodyParams = requestUpdated.bodyParams.map((param) =>
          param?.value?.[0] instanceof File ? { ...param, value: "" } : param
        )
      }

      if (this.picked.pickedType === "my-request") {
        editRESTRequest(
          this.picked.folderPath,
          this.picked.requestIndex,
          requestUpdated
        )
      } else if (this.picked.pickedType === "my-folder") {
        saveRESTRequestAs(this.picked.folderPath, requestUpdated)
      } else if (this.picked.pickedType === "my-collection") {
        saveRESTRequestAs(`${this.picked.collectionIndex}`, requestUpdated)
      } else if (this.picked.pickedType === "teams-request") {
        teamUtils.overwriteRequestTeams(
          this.$apollo,
          JSON.stringify(requestUpdated),
          requestUpdated.name,
          this.picked.requestID
        )
      } else if (this.picked.pickedType === "teams-folder") {
        teamUtils.saveRequestAsTeams(
          this.$apollo,
          JSON.stringify(requestUpdated),
          requestUpdated.name,
          this.collectionsType.selectedTeam.id,
          this.picked.folderID
        )
      } else if (this.picked.pickedType === "teams-collection") {
        teamUtils.saveRequestAsTeams(
          this.$apollo,
          JSON.stringify(requestUpdated),
          requestUpdated.name,
          this.collectionsType.selectedTeam.id,
          this.picked.collectionID
        )
      } else if (this.picked.pickedType === "gql-my-request") {
        editGraphqlRequest(
          this.picked.folderPath,
          this.picked.requestIndex,
          requestUpdated
        )
      } else if (this.picked.pickedType === "gql-my-folder") {
        saveGraphqlRequestAs(this.picked.folderPath, requestUpdated)
      } else if (this.picked.pickedType === "gql-my-collection") {
        saveGraphqlRequestAs(`${this.picked.collectionIndex}`, requestUpdated)
      }
      this.$toast.success("Requested added", {
        icon: "done",
      })
      this.hideModal()
    },
    hideModal() {
      this.picked = null
      this.$emit("hide-modal")
    },
  },
}
</script>
