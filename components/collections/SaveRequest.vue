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
      <input type="text" id="selectLabel" v-model="requestData.name" @keyup.enter="saveRequestAs" />
      <label for="selectLabel">Select location</label>
      <!-- <input readonly :value="path" /> -->
      <Collections
        @select="onSelect"
        @update-collection="collectionsType.type = $event"
        @update-coll-type="onUpdateCollType"
        :picked="picked"
        :saveRequest="true"
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
import { fb } from "~/helpers/fb"
import { getSettingSubject } from "~/newstore/settings"
import * as team_utils from "~/helpers/teams/utils"

export default {
  props: {
    show: Boolean,
    editingRequest: Object,
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

      const userSelectedAnyFolder = folderName !== undefined && folderName !== ""

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
  methods: {
    onUpdateCollType(newCollType) {
      this.collectionsType = newCollType
    },
    onSelect({ picked }) {
      this.picked = picked
    },
    syncCollections() {
      if (fb.currentUser !== null && this.SYNC_COLLECTIONS) {
        fb.writeCollections(
          JSON.parse(JSON.stringify(this.$store.state.postwoman.collections)),
          "collections"
        )
      }
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
        collection: this.$data.requestData.collectionIndex,
      }

      if (this.picked.pickedType === "my-request") {
        this.$store.commit("postwoman/saveRequestAs", {
          request: requestUpdated,
          collectionIndex: this.picked.collectionIndex,
          folderName: this.picked.folderName,
          requestIndex: this.picked.requestIndex,
          flag: "rest",
        })

        this.syncCollections()
      } else if (this.picked.pickedType === "my-folder") {
        this.$store.commit("postwoman/saveRequestAs", {
          request: requestUpdated,
          collectionIndex: this.picked.collectionIndex,
          folderName: this.picked.folderName,
          flag: "rest",
        })

        this.syncCollections()
      } else if (this.picked.pickedType === "my-collection") {
        this.$store.commit("postwoman/saveRequestAs", {
          request: requestUpdated,
          collectionIndex: this.picked.collectionIndex,
          flag: "rest",
        })

        this.syncCollections()
      } else if (this.picked.pickedType === "teams-request") {
        team_utils.overwriteRequestTeams(
          this.$apollo,
          JSON.stringify(requestUpdated),
          requestUpdated.name,
          this.picked.requestID
        )
      } else if (this.picked.pickedType === "teams-folder") {
        team_utils.saveRequestAsTeams(
          this.$apollo,
          JSON.stringify(requestUpdated),
          requestUpdated.name,
          this.collectionsType.selectedTeam.id,
          this.picked.folderID
        )
      } else if (this.picked.pickedType === "teams-collection") {
        team_utils.saveRequestAsTeams(
          this.$apollo,
          JSON.stringify(requestUpdated),
          requestUpdated.name,
          this.collectionsType.selectedTeam.id,
          this.picked.collectionID
        )
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
