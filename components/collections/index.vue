<template>
  <AppSection :label="$t('collections')" ref="collections" no-legend>
    <div class="show-on-large-screen">
      <input
        aria-label="Search"
        type="search"
        :placeholder="$t('search')"
        v-if="!saveRequest"
        v-model="filterText"
        class="rounded-t-lg"
      />
    </div>
    <CollectionsChooseType
      :collectionsType="collectionsType"
      :show="showTeamCollections"
      :doc="doc"
      @update-collection-type="updateCollectionType"
      @update-selected-team="updateSelectedTeam"
    />
    <CollectionsAdd
      :show="showModalAdd"
      @submit="addNewRootCollection"
      @hide-modal="displayModalAdd(false)"
    />
    <CollectionsEdit
      :show="showModalEdit"
      :editing-coll-name="editingCollection ? editingCollection.name : ''"
      @hide-modal="displayModalEdit(false)"
      @submit="updateEditingCollection"
    />
    <CollectionsAddFolder
      :show="showModalAddFolder"
      :folder="editingFolder"
      :folder-path="editingFolderPath"
      @add-folder="onAddFolder($event)"
      @hide-modal="displayModalAddFolder(false)"
    />
    <CollectionsEditFolder
      :show="showModalEditFolder"
      @submit="updateEditingFolder"
      @hide-modal="displayModalEditFolder(false)"
    />
    <CollectionsEditRequest
      :show="showModalEditRequest"
      :placeholder-req-name="editingRequest ? editingRequest.name : ''"
      @submit="updateEditingRequest"
      @hide-modal="displayModalEditRequest(false)"
    />
    <CollectionsImportExport
      :show="showModalImportExport"
      :collectionsType="collectionsType"
      @hide-modal="displayModalImportExport(false)"
      @update-team-collections="updateTeamCollections"
    />
    <div class="border-b row-wrapper border-brdColor">
      <button
        v-if="
          collectionsType.type == 'team-collections' &&
          (collectionsType.selectedTeam == undefined ||
            collectionsType.selectedTeam.myRole == 'VIEWER') &&
          !saveRequest
        "
        class="icon"
        @click="displayModalAdd(true)"
        disabled
      >
        <i class="material-icons">add</i>
        <div v-tooltip.left="$t('disable_new_collection')">
          <span>{{ $t("new") }}</span>
        </div>
      </button>
      <button v-else-if="!saveRequest" class="icon" @click="displayModalAdd(true)">
        <i class="material-icons">add</i>
        <span>{{ $t("new") }}</span>
      </button>
      <button
        v-if="!saveRequest"
        :disabled="
          collectionsType.type == 'team-collections' && collectionsType.selectedTeam == undefined
        "
        class="icon"
        @click="displayModalImportExport(true)"
      >
        {{ $t("import_export") }}
      </button>
    </div>
    <p v-if="collections.length === 0" class="info">
      <i class="material-icons">help_outline</i> {{ $t("create_new_collection") }}
    </p>
    <div class="virtual-list">
      <ul class="flex-col">
        <li v-for="(collection, index) in filteredCollections" :key="collection.name">
          <component
            :is="
              collectionsType.type == 'my-collections'
                ? 'CollectionsMyCollection'
                : 'CollectionsTeamsCollection'
            "
            :name="collection.name"
            :collection-index="index"
            :collection="collection"
            :doc="doc"
            :isFiltered="filterText.length > 0"
            :selected="selected.some((coll) => coll == collection)"
            :saveRequest="saveRequest"
            :collectionsType="collectionsType"
            @edit-collection="editCollection(collection, index)"
            @add-folder="addFolder($event)"
            @edit-folder="editFolder($event)"
            @edit-request="editRequest($event)"
            @update-team-collections="updateTeamCollections"
            @select-collection="$emit('use-collection', collection)"
            @unselect-collection="$emit('remove-collection', collection)"
            @select-folder="
              $emit('select-folder', {
                folderName:
                  (collectionsType.type == 'my-collections' ? collection.name : collection.title) +
                  '/' +
                  $event.name,
                collectionIndex: collectionsType.type == 'my-collections' ? index : $event.id,
                reqIdx: $event.reqIdx,
                collectionsType: collectionsType,
                folderId: $event.id,
              })
              if (collectionsType.type == 'my-collections') {
                if ($event.folderPath) {
                  picked = $event.folderPath
                } else picked = index
              } else {
                picked = $event.id
              }
            "
            @expand-collection="expandCollection"
            @remove-collection="removeCollection"
            @remove-request="removeRequest"
            :picked="picked.toString()"
          />
        </li>
      </ul>
    </div>
    <p v-if="filterText && filteredCollections.length === 0" class="info">
      <i class="material-icons">not_interested</i> {{ $t("nothing_found") }} "{{ filterText }}"
    </p>
  </AppSection>
</template>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 270px);
}
</style>

<script>
import { fb } from "~/helpers/fb"
import { getSettingSubject } from "~/newstore/settings"
import gql from "graphql-tag"
import TeamCollectionAdapter from "~/helpers/teams/TeamCollectionAdapter"
import * as team_utils from "~/helpers/teams/utils"
import cloneDeep from "lodash/cloneDeep"

export default {
  props: {
    doc: Boolean,
    selected: { type: Array, default: () => [] },
    saveRequest: Boolean,
  },
  data() {
    return {
      showModalAdd: false,
      showModalEdit: false,
      showModalImportExport: false,
      showModalAddFolder: false,
      showModalEditFolder: false,
      showModalEditRequest: false,
      editingCollection: undefined,
      editingCollectionIndex: undefined,
      editingFolder: undefined,
      editingFolderName: undefined,
      editingFolderIndex: undefined,
      editingFolderPath: undefined,
      editingRequest: undefined,
      editingRequestIndex: undefined,
      filterText: "",
      collectionsType: {
        type: "my-collections",
        selectedTeam: undefined,
      },
      teamCollectionAdapter: new TeamCollectionAdapter(null),
      teamCollectionsNew: [],
      picked: "",
    }
  },
  subscriptions() {
    return {
      SYNC_COLLECTIONS: getSettingSubject("syncCollections"),
    }
  },
  watch: {
    "collectionsType.type": function emitstuff() {
      this.$emit("update-collection", this.$data.collectionsType.type)
    },
    "collectionsType.selectedTeam": function (value) {
      if (value?.id) this.teamCollectionAdapter.changeTeamID(value.id)
    },
  },
  computed: {
    showTeamCollections() {
      if (fb.currentUser == null) {
        this.collectionsType.type = "my-collections"
      }
      return fb.currentUser !== null
    },
    collections() {
      return fb.currentUser !== null
        ? fb.currentCollections
        : this.$store.state.postwoman.collections
    },
    filteredCollections() {
      let collections = null
      if (this.collectionsType.type == "my-collections") {
        collections =
          fb.currentUser !== null ? fb.currentCollections : this.$store.state.postwoman.collections
      } else {
        collections = this.teamCollectionsNew
      }

      if (!this.filterText) {
        return collections
      }

      if (this.collectionsType.type == "team-collections") {
        return []
      }

      const filterText = this.filterText.toLowerCase()
      const filteredCollections = []

      for (let collection of collections) {
        const filteredRequests = []
        const filteredFolders = []
        for (let request of collection.requests) {
          if (request.name.toLowerCase().includes(filterText)) filteredRequests.push(request)
        }
        for (let folder of this.collectionsType.type === "team-collections"
          ? collection.children
          : collection.folders) {
          const filteredFolderRequests = []
          for (let request of folder.requests) {
            if (request.name.toLowerCase().includes(filterText))
              filteredFolderRequests.push(request)
          }
          if (filteredFolderRequests.length > 0) {
            const filteredFolder = Object.assign({}, folder)
            filteredFolder.requests = filteredFolderRequests
            filteredFolders.push(filteredFolder)
          }
        }

        if (
          filteredRequests.length + filteredFolders.length > 0 ||
          collection.name.toLowerCase().includes(filterText)
        ) {
          const filteredCollection = Object.assign({}, collection)
          filteredCollection.requests = filteredRequests
          filteredCollection.folders = filteredFolders
          filteredCollections.push(filteredCollection)
        }
      }

      return filteredCollections
    },
  },
  async mounted() {
    this._keyListener = function (e) {
      if (e.key === "Escape") {
        e.preventDefault()
        this.showModalAdd = this.showModalEdit = this.showModalImportExport = this.showModalAddFolder = this.showModalEditFolder = this.showModalEditRequest = false
      }
    }
    document.addEventListener("keydown", this._keyListener.bind(this))

    this.$subscribeTo(this.teamCollectionAdapter.collections$, (colls) => {
      console.log("new tree!")
      console.log(colls)

      this.teamCollectionsNew = cloneDeep(colls)
    })
  },
  methods: {
    updateTeamCollections() {
      // TODO: Remove this at some point
    },
    updateSelectedTeam(newSelectedTeam) {
      this.collectionsType.selectedTeam = newSelectedTeam
    },
    updateCollectionType(newCollectionType) {
      this.collectionsType.type = newCollectionType
    },
    // Intented to be called by the CollectionAdd modal submit event
    addNewRootCollection(name) {
      if (!name) {
        this.$toast.info(this.$t("invalid_collection_name"))
        return
      }
      if (this.collectionsType.type === "my-collections") {
        this.$store.commit("postwoman/addNewCollection", {
          name,
          flag: "rest",
        })

        this.syncCollections()
      } else if (
        this.collectionsType.type === "team-collections" &&
        this.collectionsType.selectedTeam.myRole !== "VIEWER"
      ) {
        team_utils
          .createNewRootCollection(this.$apollo, name, this.collectionsType.selectedTeam.id)
          .then(() => {
            this.$toast.success(this.$t("collection_added"), {
              icon: "done",
            })
          })
          .catch((error) => {
            this.$toast.error(this.$t("error_occurred"), {
              icon: "done",
            })
            console.error(error)
          })
      }
      this.displayModalAdd(false)
    },
    // Intented to be called by CollectionEdit modal submit event
    updateEditingCollection(newName) {
      if (!newName) {
        this.$toast.info(this.$t("invalid_collection_name"))
        return
      }
      if (this.collectionsType.type === "my-collections") {
        const collectionUpdated = {
          ...this.editingCollection,
          name: newName,
        }
        this.$store.commit("postwoman/editCollection", {
          collection: collectionUpdated,
          collectionIndex: this.editingCollectionIndex,
          flag: "rest",
        })
        this.syncCollections()
      } else if (
        this.collectionsType.type === "team-collections" &&
        this.collectionsType.selectedTeam.myRole !== "VIEWER"
      ) {
        team_utils
          .renameCollection(this.$apollo, newName, this.editingCollection.id)
          .then(() => {
            // TODO: $t translations ?
            this.$toast.success("Collection Renamed", {
              icon: "done",
            })
          })
          .catch((error) => {
            this.$toast.error(this.$t("error_occurred"), {
              icon: "done",
            })
            console.error(error)
          })
      }
      this.displayModalEdit(false)
    },
    // Intended to be called by CollectionEditFolder modal submit event
    updateEditingFolder(name) {
      if (this.collectionsType.type == "my-collections") {
        this.$store.commit("postwoman/editFolder", {
          collectionIndex: this.editingCollectionIndex,
          folder: { ...this.editingFolder, name: name },
          folderIndex: this.editingFolderIndex,
          folderName: this.editingFolder.name,
          flag: "rest",
        })
        this.syncCollections()
      } else if (
        this.collectionsType.type == "team-collections" &&
        this.collectionsType.selectedTeam.myRole !== "VIEWER"
      ) {
        team_utils
          .renameCollection(this.$apollo, name, this.editingFolder.id)
          .then(() => {
            // Result
            this.$toast.success(this.$t("folder_renamed"), {
              icon: "done",
            })
          })
          .catch((error) => {
            // Error
            this.$toast.error(this.$t("error_occurred"), {
              icon: "done",
            })
            console.error(error)
          })
      }

      this.displayModalEditFolder(false)
    },
    // Intented to by called by CollectionsEditRequest modal submit event
    updateEditingRequest(requestUpdateData) {
      const requestUpdated = {
        ...this.editingRequest,
        name: requestUpdateData.name || this.editingRequest.name,
      }

      if (this.collectionsType.type == "my-collections") {
        this.$store.commit("postwoman/editRequest", {
          requestCollectionIndex: this.editingCollectionIndex,
          requestFolderName: this.editingFolderName,
          requestFolderIndex: this.editingFolderIndex,
          requestNew: requestUpdated,
          requestIndex: this.editingRequestIndex,
          flag: "rest",
        })
        this.syncCollections()
      } else if (
        this.collectionsType.type === "team-collections" &&
        this.collectionsType.selectedTeam.myRole !== "VIEWER"
      ) {
        let requestName = requestUpdateData.name || this.editingRequest.name
        team_utils
          .updateRequest(this.$apollo, requestUpdated, requestName, this.editingRequestIndex)
          .then(() => {
            this.$toast.success("Request Renamed", {
              icon: "done",
            })
            this.$emit("update-team-collections")
          })
          .catch((error) => {
            this.$toast.error(this.$t("error_occurred"), {
              icon: "done",
            })
            console.error(error)
          })
      }

      this.displayModalEditRequest(false)
    },
    displayModalAdd(shouldDisplay) {
      this.showModalAdd = shouldDisplay
    },
    displayModalEdit(shouldDisplay) {
      this.showModalEdit = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    displayModalImportExport(shouldDisplay) {
      this.showModalImportExport = shouldDisplay
    },
    displayModalAddFolder(shouldDisplay) {
      this.showModalAddFolder = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    displayModalEditFolder(shouldDisplay) {
      this.showModalEditFolder = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    displayModalEditRequest(shouldDisplay) {
      this.showModalEditRequest = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
    },
    editCollection(collection, collectionIndex) {
      this.$data.editingCollection = collection
      this.$data.editingCollectionIndex = collectionIndex
      this.displayModalEdit(true)
      this.syncCollections()
    },
    onAddFolder({ name, folder, path }) {
      const flag = "rest"
      if (this.collectionsType.type === "my-collections") {
        this.$store.commit("postwoman/addFolder", {
          name,
          path,
          flag,
        })
        this.syncCollections()
      } else if (this.collectionsType.type === "team-collections") {
        if (this.collectionsType.selectedTeam.myRole != "VIEWER") {
          this.$apollo
            .mutate({
              mutation: gql`
                mutation CreateChildCollection($childTitle: String!, $collectionID: String!) {
                  createChildCollection(childTitle: $childTitle, collectionID: $collectionID) {
                    id
                  }
                }
              `,
              // Parameters
              variables: {
                childTitle: name,
                collectionID: folder.id,
              },
            })
            .then(() => {
              // Result
              this.$toast.success(this.$t("folder_added"), {
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

      this.displayModalAddFolder(false)
    },
    addFolder(payload) {
      const { folder, path } = payload
      this.$data.editingFolder = folder
      this.$data.editingFolderPath = path
      this.displayModalAddFolder(true)
    },
    editFolder(payload) {
      const { collectionIndex, folder, folderIndex } = payload
      this.$data.editingCollectionIndex = collectionIndex
      this.$data.editingFolder = folder
      this.$data.editingFolderIndex = folderIndex
      this.$data.collectionsType = this.collectionsType
      this.displayModalEditFolder(true)
      this.syncCollections()
    },
    editRequest(payload) {
      const { collectionIndex, folderIndex, folderName, request, requestIndex } = payload
      this.$data.editingCollectionIndex = collectionIndex
      this.$data.editingFolderIndex = folderIndex
      this.$data.editingFolderName = folderName
      this.$data.editingRequest = request
      this.$data.editingRequestIndex = requestIndex
      this.$emit("select-request", requestIndex)
      this.displayModalEditRequest(true)
      this.syncCollections()
    },
    resetSelectedData() {
      this.$data.editingCollection = undefined
      this.$data.editingCollectionIndex = undefined
      this.$data.editingFolder = undefined
      this.$data.editingFolderIndex = undefined
      this.$data.editingRequest = undefined
      this.$data.editingRequestIndex = undefined
    },
    syncCollections() {
      if (fb.currentUser !== null && this.SYNC_COLLECTIONS) {
        fb.writeCollections(
          JSON.parse(JSON.stringify(this.$store.state.postwoman.collections)),
          "collections"
        )
      }
    },
    expandCollection(collectionID) {
      console.log(collectionID)
      this.teamCollectionAdapter.expandCollection(collectionID)
    },
    removeCollection({ collectionsType, collectionIndex, collectionID }) {
      if (collectionsType.type == "my-collections") {
        this.$store.commit("postwoman/removeCollection", {
          collectionIndex: collectionIndex,
          flag: "rest",
        })
        this.$toast.error(this.$t("deleted"), {
          icon: "delete",
        })
        this.syncCollections()
      } else if (collectionsType.type == "team-collections") {
        if (collectionsType.selectedTeam.myRole != "VIEWER") {
          this.$apollo
            .mutate({
              // Query
              mutation: gql`
                mutation($collectionID: String!) {
                  deleteCollection(collectionID: $collectionID)
                }
              `,
              // Parameters
              variables: {
                collectionID: collectionID,
              },
            })
            .then((data) => {
              // Result
              this.$toast.success(this.$t("deleted"), {
                icon: "delete",
              })
              console.log(data)
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
    },
    removeRequest({ collectionIndex, folderName, requestIndex }) {
      if (this.collectionsType.type == "my-collections") {
        this.$store.commit("postwoman/removeRequest", {
          collectionIndex: collectionIndex,
          folderName: folderName,
          requestIndex: requestIndex,
          flag: "rest",
        })
        this.$toast.error(this.$t("deleted"), {
          icon: "delete",
        })
        this.syncCollections()
      } else if (this.collectionsType.type == "team-collections") {
        team_utils
          .deleteRequest(this.$apollo, requestIndex)
          .then((data) => {
            // Result
            this.$toast.success(this.$t("deleted"), {
              icon: "delete",
            })
          })
          .catch((error) => {
            // Error
            this.$toast.error(this.$t("error_occurred"), {
              icon: "done",
            })
            console.error(error)
          })
      }
    },
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
}
</script>
