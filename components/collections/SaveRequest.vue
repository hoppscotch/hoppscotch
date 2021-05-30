<template>
  <SmartModal v-if="show" @close="hideModal">
    <div slot="header">
      <div class="row-wrapper">
        <h3 class="title">{{ $t("save_request_as") }}</h3>
        <div>
          <button class="icon" @click="hideModal">
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
        type="text"
        @keyup.enter="saveRequestAs"
      />
      <label for="selectLabel">Select location</label>
      <!-- <input readonly :value="path" /> -->

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
          <button class="icon" @click="hideModal">
            {{ $t("cancel") }}
          </button>
          <button class="icon primary" @click="saveRequestAs">
            {{ $t("save") }}
          </button>
        </span>
      </div>
    </div>
  </SmartModal>
</template>

<script>
import { getSettingSubject } from "~/newstore/settings"
import * as teamUtils from "~/helpers/teams/utils"
import { saveRESTRequestAs, editRESTRequest, editGraphqlRequest, saveGraphqlRequestAs } from "~/newstore/collections"

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
  subscriptions() {
    return {
      SYNC_COLLECTIONS: getSettingSubject("syncCollections"),
    }
  },
  computed: {
    folders() {
      const collections = this.$store.state.postwoman.collections
      const collectionIndex = this.$data.requestData.collectionIndex
      const userSelectedAnyCollection = collectionIndex !== undefined
      if (!userSelectedAnyCollection) return []

      const noCollectionAvailable = collections[collectionIndex] !== undefined
      if (!noCollectionAvailable) return []

      return getFolderNames(collections[collectionIndex].folders, [])
    },
    requests() {
      const collections = this.$store.state.postwoman.collections
      const collectionIndex = this.$data.requestData.collectionIndex
      const folderName = this.$data.requestData.folderName

      const userSelectedAnyCollection = collectionIndex !== undefined
      if (!userSelectedAnyCollection) {
        return []
      }

      const userSelectedAnyFolder =
        folderName !== undefined && folderName !== ""

      if (userSelectedAnyFolder) {
        const collection = collections[collectionIndex]
        const folder = findFolder(folderName, collection)
        return folder.requests
      } else {
        const collection = collections[collectionIndex]
        const noCollectionAvailable = collection !== undefined

        if (!noCollectionAvailable) {
          return []
        }

        return collection.requests
      }
    },
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
        editGraphqlRequest(this.picked.folderPath, this.picked.requestIndex, requestUpdated)
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
      this.$emit("hide-modal")
    },
  },
}

function getFolderNames(folders, namesList, folderName = "") {
  if (folders.length) {
    folders.forEach((folder) => {
      namesList.push(folderName + folder.name)
      if (folder.folders && folder.folders.length) {
        getFolderNames(folder.folders, namesList, folder.name + "/")
      }
    })
  }
  return namesList
}

function findFolder(folderName, currentFolder) {
  let selectedFolder
  let result

  if (folderName === currentFolder.name) {
    return currentFolder
  }

  for (let i = 0; i < currentFolder.folders.length; i++) {
    selectedFolder = currentFolder.folders[i]

    result = findFolder(folderName, selectedFolder)

    if (result !== false) {
      return result
    }
  }
  return false
}
</script>
