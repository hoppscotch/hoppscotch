<template>
  <AppSection
    label="collections"
    :class="{ 'rounded border border-divider': saveRequest }"
  >
    <div
      class="
        divide-y divide-dividerLight
        bg-primary
        border-b border-dividerLight
        rounded-t
        flex flex-col
        top-0
        z-10
        sticky
      "
      :class="{ '!top-sidebarPrimaryStickyFold': !saveRequest && !doc }"
    >
      <div v-if="!saveRequest" class="search-wrapper">
        <input
          v-model="filterText"
          type="search"
          :placeholder="$t('action.search')"
          class="bg-primary flex w-full py-2 pr-2 pl-10"
        />
      </div>
      <CollectionsChooseType
        :collections-type="collectionsType"
        :show="showTeamCollections"
        :doc="doc"
        @update-collection-type="updateCollectionType"
        @update-selected-team="updateSelectedTeam"
      />
      <div class="flex flex-1 justify-between">
        <ButtonSecondary
          v-if="
            collectionsType.type == 'team-collections' &&
            (collectionsType.selectedTeam == undefined ||
              collectionsType.selectedTeam.myRole == 'VIEWER')
          "
          v-tippy="{ theme: 'tooltip' }"
          disabled
          class="rounded-none"
          icon="add"
          :title="$t('team.no_access')"
          :label="$t('action.new')"
        />
        <ButtonSecondary
          v-else
          icon="add"
          :label="$t('action.new')"
          class="rounded-none"
          @click.native="displayModalAdd(true)"
        />
        <span class="flex">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            to="https://docs.hoppscotch.io/features/collections"
            blank
            :title="$t('app.wiki')"
            icon="help_outline"
          />
          <ButtonSecondary
            v-if="!saveRequest"
            v-tippy="{ theme: 'tooltip' }"
            :disabled="
              collectionsType.type == 'team-collections' &&
              collectionsType.selectedTeam == undefined
            "
            icon="import_export"
            :title="$t('modal.import_export')"
            @click.native="displayModalImportExport(true)"
          />
        </span>
      </div>
    </div>
    <div class="flex flex-col">
      <component
        :is="
          collectionsType.type == 'my-collections'
            ? 'CollectionsMyCollection'
            : 'CollectionsTeamsCollection'
        "
        v-for="(collection, index) in filteredCollections"
        :key="`collection-${index}`"
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
    </div>
    <div
      v-if="filteredCollections.length === 0 && filterText.length === 0"
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <span class="text-center pb-4">
        {{ $t("empty.collections") }}
      </span>
      <ButtonSecondary
        v-if="
          collectionsType.type == 'team-collections' &&
          (collectionsType.selectedTeam == undefined ||
            collectionsType.selectedTeam.myRole == 'VIEWER')
        "
        v-tippy="{ theme: 'tooltip' }"
        :title="$t('team.no_access')"
        :label="$t('add.new')"
        filled
      />
      <ButtonSecondary
        v-else
        :label="$t('add.new')"
        filled
        @click.native="displayModalAdd(true)"
      />
    </div>
    <div
      v-if="filterText.length !== 0 && filteredCollections.length === 0"
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <i class="opacity-75 pb-2 material-icons">manage_search</i>
      <span class="text-center">
        {{ $t("state.nothing_found") }} "{{ filterText }}"
      </span>
    </div>
    <CollectionsAdd
      :show="showModalAdd"
      @submit="addNewRootCollection"
      @hide-modal="displayModalAdd(false)"
    />
    <CollectionsEdit
      :show="showModalEdit"
      :editing-coll-name="editingCollection ? editingCollection.name : ''"
      :placeholder-coll-name="editingCollection ? editingCollection.name : ''"
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
  </AppSection>
</template>

<script>
import gql from "graphql-tag"
import cloneDeep from "lodash/cloneDeep"
import { defineComponent } from "@nuxtjs/composition-api"
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
import {
  useReadonlyStream,
  useStreamSubscriber,
} from "~/helpers/utils/composables"

export default defineComponent({
  props: {
    doc: Boolean,
    selected: { type: Array, default: () => [] },
    saveRequest: Boolean,
    picked: { type: Object, default: () => {} },
  },
  setup() {
    const { subscribeToStream } = useStreamSubscriber()

    return {
      subscribeTo: subscribeToStream,

      collections: useReadonlyStream(restCollections$, []),
      currentUser: useReadonlyStream(currentUser$, null),
    }
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
    this.subscribeTo(this.teamCollectionAdapter.collections$, (colls) => {
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
            this.$toast.success(this.$t("collection.created"), {
              icon: "done",
            })
          })
          .catch((e) => {
            this.$toast.error(this.$t("error.something_went_wrong"), {
              icon: "error_outline",
            })
            console.error(e)
          })
      }
      this.displayModalAdd(false)
    },
    // Intented to be called by CollectionEdit modal submit event
    updateEditingCollection(newName) {
      if (!newName) {
        this.$toast.error(this.$t("collection.invalid_name"), {
          icon: "error_outline",
        })
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
            this.$toast.success(this.$t("collection.renamed"), {
              icon: "done",
            })
          })
          .catch((e) => {
            this.$toast.error(this.$t("error.something_went_wrong"), {
              icon: "error_outline",
            })
            console.error(e)
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
            this.$toast.success(this.$t("folder.renamed"), {
              icon: "done",
            })
          })
          .catch((e) => {
            this.$toast.error(this.$t("error.something_went_wrong"), {
              icon: "error_outline",
            })
            console.error(e)
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
            this.$toast.success(this.$t("request.renamed"), {
              icon: "done",
            })
            this.$emit("update-team-collections")
          })
          .catch((e) => {
            this.$toast.error(this.$t("error.something_went_wrong"), {
              icon: "error_outline",
            })
            console.error(e)
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
              this.$toast.success(this.$t("folder.created"), {
                icon: "done",
              })
              this.$emit("update-team-collections")
            })
            .catch((e) => {
              this.$toast.error(this.$t("error.something_went_wrong"), {
                icon: "error_outline",
              })
              console.error(e)
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
        this.$toast.success(this.$t("state.deleted"), {
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
              this.$toast.success(this.$t("state.deleted"), {
                icon: "delete",
              })
            })
            .catch((e) => {
              this.$toast.error(this.$t("error.something_went_wrong"), {
                icon: "error_outline",
              })
              console.error(e)
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
        this.$toast.success(this.$t("state.deleted"), {
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
            this.$toast.success(this.$t("state.deleted"), {
              icon: "delete",
            })
          })
          .catch((e) => {
            this.$toast.error(this.$t("error.something_went_wrong"), {
              icon: "error_outline",
            })
            console.error(e)
          })
      }
    },
  },
})
</script>
