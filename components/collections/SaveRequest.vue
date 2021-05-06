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
      <label for="selectLabel">Request path</label>
      <input readonly :value="path" />
      <collections
        @select-folder="changeRequestDetails($event)"
        @update-collection="collectionsType.type = $event"
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
    changeRequestDetails(data) {
      this.$data.requestData.folderName = data.folderName.split("/").slice(-2)[0]
      this.$data.path = data.folderName
      this.$data.requestData.collectionIndex = data.collectionIndex
      this.$data.requestData.requestIndex = data.reqIdx
      if (data.collectionsType.type !== "my-collections") {
        this.$data.collectionsType = data.collectionsType
      }
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
      const userDidntSpecifyCollection = this.$data.requestData.collectionIndex === undefined
      if (userDidntSpecifyCollection) {
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

      if (this.$data.collectionsType.type === "my-collections") {
        this.$store.commit("postwoman/saveRequestAs", {
          request: requestUpdated,
          collectionIndex: this.$data.requestData.collectionIndex,
          folderName: this.$data.requestData.folderName,
          requestIndex: this.$data.requestData.requestIndex,
          flag: "rest",
        })
        this.syncCollections()
      } else {
        if (this.$data.requestData.requestIndex) {
          team_utils.overwriteRequestTeams(
            this.$apollo,
            JSON.stringify(requestUpdated),
            requestUpdated.name,
            this.$data.requestData.requestIndex
          )
        } else {
          team_utils.saveRequestAsTeams(
            this.$apollo,
            JSON.stringify(requestUpdated),
            requestUpdated.name,
            this.$data.collectionsType.selectedTeam.id,
            this.$data.requestData.collectionIndex
          )
        }
      }

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
