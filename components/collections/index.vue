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
      @update-team-collections="updateTeamCollections"
      :show="showTeamCollections"
    />
    <CollectionsAdd
      :collectionsType="collectionsType"
      :show="showModalAdd"
      @update-team-collections="updateTeamCollections"
      @hide-modal="displayModalAdd(false)"
    />
    <CollectionsEdit
      :show="showModalEdit"
      :editing-collection="editingCollection"
      :editing-collection-index="editingCollectionIndex"
      :collectionsType="collectionsType"
      @hide-modal="displayModalEdit(false)"
      @update-team-collections="updateTeamCollections"
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
      :collection-index="editingCollectionIndex"
      :folder="editingFolder"
      :folder-index="editingFolderIndex"
      :collectionsType="collectionsType"
      @hide-modal="displayModalEditFolder(false)"
    />
    <CollectionsEditRequest
      :show="showModalEditRequest"
      :collection-index="editingCollectionIndex"
      :folder-index="editingFolderIndex"
      :folder-name="editingFolderName"
      :request="editingRequest"
      :request-index="editingRequestIndex"
      :collectionsType="collectionsType"
      @hide-modal="displayModalEditRequest(false)"
      @update-team-collections="updateTeamCollections"
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
          <CollectionsCollection
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
            @select-collection="$emit('use-collection', index)"
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
            "
            @unselect-collection="$emit('remove-collection', collection)"
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
import * as team_utils from "~/helpers/teams/utils"
import TeamCollectionAdapter from "~/helpers/teams/TeamCollectionAdapter"

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
      teamCollections: {},
      teamCollectionAdapter: new TeamCollectionAdapter(null),
    }
  },
  subscriptions() {
    return {
      SYNC_COLLECTIONS: getSettingSubject("syncCollections"),
      teamCollectionsNew: this.teamCollectionAdapter.collections$,
    }
  },
  apollo: {
    myTeams: {
      query: gql`
        query GetMyTeams {
          myTeams {
            id
            name
            myRole
          }
        }
      `,
      pollInterval: 10000,
    },

    $subscribe: {
      teamsCollectionAdded: {
        query: gql`
          subscription teamCollectionAdded($teamID: String!) {
            teamCollectionAdded(teamID: $teamID) {
              id
              title
              parent {
                id
                title
              }
            }
          }
        `,
        variables() {
          return {
            teamID: this.collectionsType.selectedTeam.id,
          }
        },
        skip() {
          return this.collectionsType.selectedTeam == undefined
        },
        result({ data }) {
          console.log(data)

          if (data.teamCollectionAdded.parent == null) {
            debugger

            this.teamCollections[this.collectionsType.selectedTeam.id].push({
              id: data.teamCollectionAdded.id,
              title: data.teamCollectionAdded.title,
              __typename: data.teamCollectionAdded.__typename,
            })
          }
        },
      },
      teamsCollectionUpdated: {
        query: gql`
          subscription teamCollectionUpdated($teamID: String!) {
            teamCollectionUpdated(teamID: $teamID) {
              id
              title
              parent {
                id
                title
              }
            }
          }
        `,
        variables() {
          return {
            teamID: this.collectionsType.selectedTeam.id,
          }
        },
        skip() {
          return this.collectionsType.selectedTeam == undefined
        },
        result({ data }) {
          const current = this.teamCollections[this.collectionsType.selectedTeam.id]
          const index = current.findIndex((x) => x.id === data.teamCollectionUpdated.id)
          if (index >= 0) {
            current[index].title = data.teamCollectionUpdated.title
          }
          this.teamCollections[this.collectionsType.selectedTeam.id] = current
        },
      },
      teamsCollectionRemoved: {
        query: gql`
          subscription teamCollectionRemoved($teamID: String!) {
            teamCollectionRemoved(teamID: $teamID)
          }
        `,
        variables() {
          return {
            teamID: this.collectionsType.selectedTeam.id,
          }
        },
        skip() {
          return this.collectionsType.selectedTeam == undefined
        },
        result({ data }) {
          this.teamCollections[this.collectionsType.selectedTeam.id] = this.teamCollections[
            this.collectionsType.selectedTeam.id
          ].filter((x) => x.id !== data.teamCollectionRemoved)
        },
      },
    },
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
        if (
          this.collectionsType.selectedTeam &&
          this.collectionsType.selectedTeam.id in this.teamCollections
        ) {
          collections = this.teamCollectionsNew
        } else {
          collections = []
        }
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
        for (let folder of collection.folders) {
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
  },
  methods: {
    updateTeamCollections() {
      this.$emit("select-collection-type")
      if (this.collectionsType.selectedTeam == undefined) return
      team_utils
        .rootCollectionsOfTeam(this.$apollo, this.collectionsType.selectedTeam.id)
        .then((collections) => {
          this.$set(this.teamCollections, this.collectionsType.selectedTeam.id, collections)
        })
        .catch((error) => {
          console.log(error)
        })
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
                mutation($childTitle: String!, $collectionID: String!) {
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
            .then((data) => {
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
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
}
</script>
