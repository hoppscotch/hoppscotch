<template>
  <pw-section class="yellow" :label="$t('collections')" ref="collections" no-legend>
    <choose-collection-type 
      :collectionsType="collectionsType" 
      @update-team-collections="updateTeamCollections" 
      :show="showTeamCollections" />
    <div class="show-on-large-screen">
      <input
        aria-label="Search"
        type="search"
        :placeholder="$t('search')"
        v-model="filterText"
        class="rounded-t-lg"
      />
    </div>
    <add-collection 
      :collectionsType="collectionsType" 
      :show="showModalAdd" 
      @update-team-collections="updateTeamCollections"
      @hide-modal="displayModalAdd(false)" />
    <edit-collection
      :show="showModalEdit"
      :editing-collection="editingCollection"
      :editing-collection-index="editingCollectionIndex"
      :collectionsType="collectionsType"
      @hide-modal="displayModalEdit(false)"
    />
    <add-folder
      :show="showModalAddFolder"
      :folder="editingFolder"
      :folder-path="editingFolderPath"
      @add-folder="onAddFolder($event)"
      @hide-modal="displayModalAddFolder(false)"
    />
    <edit-folder
      :show="showModalEditFolder"
      :collection-index="editingCollectionIndex"
      :folder="editingFolder"
      :folder-index="editingFolderIndex"
      @hide-modal="displayModalEditFolder(false)"
    />
    <edit-request
      :show="showModalEditRequest"
      :collection-index="editingCollectionIndex"
      :folder-index="editingFolderIndex"
      :folder-name="editingFolderName"
      :request="editingRequest"
      :request-index="editingRequestIndex"
      @hide-modal="displayModalEditRequest(false)"
    />
    <import-export-collections
      :show="showModalImportExport"
      @hide-modal="displayModalImportExport(false)"
    />
    <div class="border-b row-wrapper border-brdColor">
      <button v-if="collectionsType.type=='team-collections' && collectionsType.selectedTeam.myRole == 'VIEWER'" class="icon" @click="displayModalAdd(true)" disabled>
        <i class="material-icons">add</i>
        <div  v-tooltip.left="$t('disable_new_collection')">
          <span>{{ $t("new") }}</span>
        </div>
      </button>
      <button v-else class="icon" @click="displayModalAdd(true)">
        <i class="material-icons">add</i>
        <span>{{ $t("new") }}</span>
      </button>
      <button class="icon" @click="displayModalImportExport(true)">
        {{ $t("import_export") }}
      </button>
    </div>
    <p v-if="collections.length === 0" class="info">
      <i class="material-icons">help_outline</i> {{ $t("create_new_collection") }}
    </p>
    <div class="virtual-list">
      <ul class="flex-col">
        <li v-for="(collection, index) in filteredCollections" :key="collection.name">
          <collection
            :name="collection.name"
            :collection-index="index"
            :collection="collection"
            :doc="doc"
            :isFiltered="filterText.length > 0"
            :collectionsType="collectionsType"
            @edit-collection="editCollection(collection, index)"
            @add-folder="addFolder($event)"
            @edit-folder="editFolder($event)"
            @edit-request="editRequest($event)"
            @update-team-collections="updateTeamCollections"
            @select-collection="$emit('use-collection', collection)"
          />
        </li>
      </ul>
    </div>
    <p v-if="filterText && filteredCollections.length === 0" class="info">
      <i class="material-icons">not_interested</i> {{ $t("nothing_found") }} "{{ filterText }}"
    </p>
  </pw-section>
</template>

<style scoped lang="scss">
.virtual-list {
  max-height: calc(100vh - 232px);
}
</style>

<script>
import { fb } from "~/helpers/fb"
import gql from "graphql-tag"

export default {
  props: {
    doc: Boolean,
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
        type: 'my-collections',
        selectedTeam: undefined
      },
      teamCollections: {}
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
    }
  },
  computed: {
    showTeamCollections() {
      if(fb.currentUser == null) {
        this.collectionsType.type = 'my-collections'
      }
      return fb.currentUser !== null;
    },
    collections() {
      return fb.currentUser !== null
        ? fb.currentCollections
        : this.$store.state.postwoman.collections
    },
    filteredCollections() {
      let collections = null;
      if(this.collectionsType.type == 'my-collections') {
        collections = fb.currentUser !== null
          ? fb.currentCollections
          : this.$store.state.postwoman.collections;
      } else {
        if(this.collectionsType.selectedTeam && this.collectionsType.selectedTeam.id in this.teamCollections){
          collections = this.teamCollections[this.collectionsType.selectedTeam.id];
        } else {
          collections = []
        }
      }
      if (!this.filterText) {
        return collections
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

        if (filteredRequests.length + filteredFolders.length > 0) {
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
    async updateTeamCollections() {
      if(this.collectionsType.selectedTeam == undefined) return;
      this.$apollo.query({
        query: gql`
        query rootCollectionsOfTeam($teamID: String!) {
          rootCollectionsOfTeam(teamID: $teamID) {
            id
            title
          }
        }`,
        variables: {
          teamID: this.collectionsType.selectedTeam ? this.collectionsType.selectedTeam.id: "",
        },
        fetchPolicy: 'no-cache'       
      }).then((response) => {
        this.$set(this.teamCollections, this.collectionsType.selectedTeam.id, response.data.rootCollectionsOfTeam);
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
    onAddFolder({ name, path }) {
      this.$store.commit("postwoman/addFolder", {
        name,
        path,
      })

      this.displayModalAddFolder(false)
      this.syncCollections()
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
      if (fb.currentUser !== null) {
        if (fb.currentSettings[0].value) {
          fb.writeCollections(JSON.parse(JSON.stringify(this.$store.state.postwoman.collections)))
        }
      }
    },
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
}
</script>
