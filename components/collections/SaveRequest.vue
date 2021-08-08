<template>
  <SmartModal v-if="show" :title="$t('collection.save_as')" @close="hideModal">
    <template #body>
      <div class="flex flex-col px-2">
        <div class="flex relative">
          <input
            id="selectLabelSaveReq"
            v-model="requestName"
            class="input floating-input"
            placeholder=" "
            type="text"
          />
          <label for="selectLabelSaveReq">
            {{ $t("request.name") }}
          </label>
        </div>
        <label class="font-semibold px-4 pt-4 pb-4">
          {{ $t("collection.select_location") }}
        </label>
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
    </template>
    <template #footer>
      <span>
        <ButtonPrimary :label="$t('save')" @click.native="saveRequestAs" />
        <ButtonSecondary :label="$t('cancel')" @click.native="hideModal" />
      </span>
    </template>
  </SmartModal>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import * as teamUtils from "~/helpers/teams/utils"
import {
  saveRESTRequestAs,
  editRESTRequest,
  editGraphqlRequest,
  saveGraphqlRequestAs,
} from "~/newstore/collections"
import { getRESTRequest, useRESTRequestName } from "~/newstore/RESTSession"

export default defineComponent({
  props: {
    // mode can be either "graphql" or "rest"
    mode: { type: String, default: "rest" },
    show: Boolean,
  },
  setup() {
    return {
      requestName: useRESTRequestName(),
    }
  },
  data() {
    return {
      requestData: {
        name: this.requestName,
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
      if (!this.requestName) {
        this.$toast.error(this.$t("empty_req_name"), {
          icon: "error",
        })
        return
      }
      if (this.picked == null) {
        this.$toast.error(this.$t("collection.select"), {
          icon: "error",
        })
        return
      }

      const requestUpdated = getRESTRequest()

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
})
</script>
