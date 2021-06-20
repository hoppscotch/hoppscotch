<template>
  <AppSection ref="collections" :label="$t('collections')">
    <div class="show-on-large-screen">
      <input
        v-if="!saveRequest"
        v-model="filterText"
        aria-label="Search"
        type="search"
        :placeholder="$t('search')"
        class="rounded-t-lg"
      />
    </div>
    <CollectionsChooseType
      :collections-type="collectionsType"
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
      :collections-type="collectionsType"
      @hide-modal="displayModalImportExport(false)"
      @update-team-collections="updateTeamCollections"
    />
    <div class="border-b row-wrapper border-divider">
      <button
        v-if="
          collectionsType.type == 'team-collections' &&
          (collectionsType.selectedTeam == undefined ||
            collectionsType.selectedTeam.myRole == 'VIEWER')
        "
        class="icon"
        disabled
        @click="displayModalAdd(true)"
      >
        <i class="material-icons">add</i>
        <div v-tooltip.left="$t('disable_new_collection')">
          <span>{{ $t("new") }}</span>
        </div>
      </button>
      <button v-else class="icon" @click="displayModalAdd(true)">
        <i class="material-icons">add</i>
        <span>{{ $t("new") }}</span>
      </button>
      <button
        v-if="!saveRequest"
        :disabled="
          collectionsType.type == 'team-collections' &&
          collectionsType.selectedTeam == undefined
        "
        class="icon"
        @click="displayModalImportExport(true)"
      >
        {{ $t("import_export") }}
      </button>
    </div>
    <p v-if="collections.length === 0" class="info">
      <i class="material-icons">help_outline</i>
      {{ $t("create_new_collection") }}
    </p>
    <div class="virtual-list">
      <ul class="flex-col">
        <li
          v-for="(collection, index) in filteredCollections"
          :key="collection.name"
        >
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
            :is-filtered="filterText.length > 0"
            :selected="selected.some((coll) => coll == collection)"
            :save-request="saveRequest"
            :collections-type="collectionsType"
            :picked="picked"
            @edit-collection="editCollection(collection, index)"
            @add-folder="addFolder($event)"
            @edit-folder="editFolder($event)"
            @edit-request="editRequest($event)"
            @update-team-collections="updateTeamCollections"
            @select-collection="$emit('use-collection', collection)"
            @unselect-collection="$emit('remove-collection', collection)"
            @select="$emit('select', $event)"
            @expand-collection="expandCollection"
            @remove-collection="removeCollection"
            @remove-request="removeRequest"
          />
        </li>
      </ul>
    </div>
    <p v-if="filterText && filteredCollections.length === 0" class="info">
      <i class="material-icons">not_interested</i> {{ $t("nothing_found") }} "{{
        filterText
      }}"
    </p>
  </AppSection>
</template>

<script>
import gql from "graphql-tag"
import cloneDeep from "lodash/cloneDeep"
import { currentUser$ } from "~/helpers/fb/auth"
import TeamCollectionAdapter from "~/helpers/teams/TeamCollectionAdapter"
import * as teamUtils from "~/helpers/teams/utils"
import {
  restCollections$,
  addRESTCollection,
  editRESTCollection,
  addRESTFolder,
  removeRESTCollection,
  editRESTFolder,
  removeRESTRequest,
  editRESTRequest,
} from "~/newstore/collections"

export default {
  props: {
    doc: Boolean,
    selected: { type: Array, default: () => [] },
    saveRequest: Boolean,
    picked: { type: Object, default: () => {} },
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
    }
  },
  subscriptions() {
    return {
      collections: restCollections$,
      currentUser: currentUser$,
    }
  },
  computed: {
    showTeamCollections() {
      if (this.currentUser == null) {
        return false
      }
      return true
    },
    filteredCollections() {
      const collections =
        this.collectionsType.type === "my-collections"
          ? this.collections
          : this.teamCollectionsNew

      if (!this.filterText) {
        return collections
      }

      if (this.collectionsType.type === "team-collections") {
        return []
      }

      const filterText = this.filterText.toLowerCase()
      const filteredCollections = []

      for (const collection of collections) {
        const filteredRequests = []
        const filteredFolders = []
        for (const request of collection.requests) {
          if (request.name.toLowerCase().includes(filterText))
            filteredRequests.push(request)
        }
        for (const folder of this.collectionsType.type === "team-collections"
          ? collection.children
          : collection.folders) {
          const filteredFolderRequests = []
          for (const request of folder.requests) {
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
  watch: {
    "collectionsType.type": function emitstuff() {
      this.$emit("update-collection", this.$data.collectionsType.type)
    },
    "collectionsType.selectedTeam"(value) {
      if (value?.id) this.teamCollectionAdapter.changeTeamID(value.id)
    },
  },
  mounted() {
    this.$subscribeTo(this.teamCollectionAdapter.collections$, (colls) => {
      this.teamCollectionsNew = cloneDeep(colls)
    })
  },
  methods: {
    updateTeamCollections() {
      // TODO: Remove this at some point
    },
    updateSelectedTeam(newSelectedTeam) {
      this.collectionsType.selectedTeam = newSelectedTeam
      this.$emit("update-coll-type", this.collectionsType)
    },
    updateCollectionType(newCollectionType) {
      this.collectionsType.type = newCollectionType
      this.$emit("update-coll-type", this.collectionsType)
    },
    // Intented to be called by the CollectionAdd modal submit event
    addNewRootCollection(name) {
      if (!name) {
        this.$toast.info(this.$t("invalid_collection_name"))
        return
      }
      if (this.collectionsType.type === "my-collections") {
        addRESTCollection({
          name,
          folders: [],
          requests: [],
        })
      } else if (
        this.collectionsType.type === "team-collections" &&
        this.collectionsType.selectedTeam.myRole !== "VIEWER"
      ) {
        teamUtils
          .createNewRootCollection(
            this.$apollo,
            name,
            this.collectionsType.selectedTeam.id
          )
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

        editRESTCollection(this.editingCollectionIndex, collectionUpdated)
      } else if (
        this.collectionsType.type === "team-collections" &&
        this.collectionsType.selectedTeam.myRole !== "VIEWER"
      ) {
        teamUtils
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
      if (this.collectionsType.type === "my-collections") {
        editRESTFolder(this.editingFolderPath, { ...this.editingFolder, name })
      } else if (
        this.collectionsType.type === "team-collections" &&
        this.collectionsType.selectedTeam.myRole !== "VIEWER"
      ) {
        teamUtils
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

      if (this.collectionsType.type === "my-collections") {
        editRESTRequest(
          this.editingFolderPath,
          this.editingRequestIndex,
          requestUpdated
        )
      } else if (
        this.collectionsType.type === "team-collections" &&
        this.collectionsType.selectedTeam.myRole !== "VIEWER"
      ) {
        const requestName = requestUpdateData.name || this.editingRequest.name
        teamUtils
          .updateRequest(
            this.$apollo,
            requestUpdated,
            requestName,
            this.editingRequestIndex
          )
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
    },
    onAddFolder({ name, folder, path }) {
      if (this.collectionsType.type === "my-collections") {
        addRESTFolder(name, path)
      } else if (this.collectionsType.type === "team-collections") {
        if (this.collectionsType.selectedTeam.myRole !== "VIEWER") {
          this.$apollo
            .mutate({
              mutation: gql`
                mutation CreateChildCollection(
                  $childTitle: String!
                  $collectionID: String!
                ) {
                  createChildCollection(
                    childTitle: $childTitle
                    collectionID: $collectionID
                  ) {
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
      const { collectionIndex, folder, folderIndex, folderPath } = payload
      this.$data.editingCollectionIndex = collectionIndex
      this.$data.editingFolder = folder
      this.$data.editingFolderIndex = folderIndex
      this.$data.editingFolderPath = folderPath
      this.$data.collectionsType = this.collectionsType
      this.displayModalEditFolder(true)
    },
    editRequest(payload) {
      const {
        collectionIndex,
        folderIndex,
        folderName,
        request,
        requestIndex,
        folderPath,
      } = payload
      this.$data.editingCollectionIndex = collectionIndex
      this.$data.editingFolderIndex = folderIndex
      this.$data.editingFolderName = folderName
      this.$data.editingRequest = request
      this.$data.editingRequestIndex = requestIndex
      this.editingFolderPath = folderPath
      this.$emit("select-request", requestIndex)
      this.displayModalEditRequest(true)
    },
    resetSelectedData() {
      this.$data.editingCollection = undefined
      this.$data.editingCollectionIndex = undefined
      this.$data.editingFolder = undefined
      this.$data.editingFolderIndex = undefined
      this.$data.editingRequest = undefined
      this.$data.editingRequestIndex = undefined
    },
    expandCollection(collectionID) {
      this.teamCollectionAdapter.expandCollection(collectionID)
    },
    removeCollection({ collectionsType, collectionIndex, collectionID }) {
      if (collectionsType.type === "my-collections") {
        // Cancel pick if picked collection is deleted
        if (
          this.picked &&
          this.picked.pickedType === "my-collection" &&
          this.picked.collectionIndex === collectionIndex
        ) {
          this.$emit("select", { picked: null })
        }

        removeRESTCollection(collectionIndex)

        this.$toast.error(this.$t("deleted"), {
          icon: "delete",
        })
      } else if (collectionsType.type === "team-collections") {
        // Cancel pick if picked collection is deleted
        if (
          this.picked &&
          this.picked.pickedType === "teams-collection" &&
          this.picked.collectionID === collectionID
        ) {
          this.$emit("select", { picked: null })
        }

        if (collectionsType.selectedTeam.myRole !== "VIEWER") {
          this.$apollo
            .mutate({
              // Query
              mutation: gql`
                mutation ($collectionID: String!) {
                  deleteCollection(collectionID: $collectionID)
                }
              `,
              // Parameters
              variables: {
                collectionID,
              },
            })
            .then(() => {
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
      }
    },
    removeRequest({ requestIndex, folderPath }) {
      if (this.collectionsType.type === "my-collections") {
        // Cancel pick if the picked item is being deleted
        if (
          this.picked &&
          this.picked.pickedType === "my-request" &&
          this.picked.folderPath === folderPath &&
          this.picked.requestIndex === requestIndex
        ) {
          this.$emit("select", { picked: null })
        }
        removeRESTRequest(folderPath, requestIndex)

        this.$toast.error(this.$t("deleted"), {
          icon: "delete",
        })
      } else if (this.collectionsType.type === "team-collections") {
        // Cancel pick if the picked item is being deleted
        if (
          this.picked &&
          this.picked.pickedType === "teams-request" &&
          this.picked.requestID === requestIndex
        ) {
          this.$emit("select", { picked: null })
        }

        teamUtils
          .deleteRequest(this.$apollo, requestIndex)
          .then(() => {
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
}
</script>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 270px);
}
</style>
