<template>
  <div :class="{ 'rounded border border-divider': saveRequest }">
    <div
      class="sticky z-10 flex flex-col border-b rounded-t divide-y divide-dividerLight bg-primary border-dividerLight"
      :style="saveRequest ? 'top: calc(-1 * var(--font-size-body))' : 'top: 0'"
    >
      <div v-if="!saveRequest" class="flex flex-col">
        <input
          v-model="filterText"
          type="search"
          autocomplete="off"
          :placeholder="$t('action.search')"
          class="py-2 pl-4 pr-2 bg-transparent"
        />
      </div>
      <CollectionsChooseType
        :collections-type="collectionsType"
        :show="showTeamCollections"
        :doc="doc"
        @update-collection-type="updateCollectionType"
        @update-selected-team="updateSelectedTeam"
      />
      <div class="flex justify-between flex-1">
        <ButtonSecondary
          v-if="
            collectionsType.type == 'team-collections' &&
            (collectionsType.selectedTeam == undefined ||
              collectionsType.selectedTeam.myRole == 'VIEWER')
          "
          v-tippy="{ theme: 'tooltip' }"
          disabled
          class="!rounded-none"
          svg="plus"
          :title="$t('team.no_access')"
          :label="$t('action.new')"
        />
        <ButtonSecondary
          v-else
          svg="plus"
          :label="$t('action.new')"
          class="!rounded-none"
          @click.native="displayModalAdd(true)"
        />
        <span class="flex">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            to="https://docs.hoppscotch.io/features/collections"
            blank
            :title="$t('app.wiki')"
            svg="help-circle"
          />
          <ButtonSecondary
            v-if="!saveRequest"
            v-tippy="{ theme: 'tooltip' }"
            :disabled="
              collectionsType.type == 'team-collections' &&
              collectionsType.selectedTeam == undefined
            "
            svg="archive"
            :title="$t('modal.import_export')"
            @click.native="displayModalImportExport(true)"
          />
        </span>
      </div>
    </div>
    <div class="flex flex-col flex-1">
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
        :loading-collection-i-ds="loadingCollectionIDs"
        @edit-collection="editCollection(collection, index)"
        @add-request="addRequest($event)"
        @add-folder="addFolder($event)"
        @edit-folder="editFolder($event)"
        @edit-request="editRequest($event)"
        @duplicate-request="duplicateRequest($event)"
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
      v-if="loadingCollectionIDs.includes('root')"
      class="flex flex-col items-center justify-center p-4"
    >
      <SmartSpinner class="my-4" />
      <span class="text-secondaryLight">{{ $t("state.loading") }}</span>
    </div>
    <div
      v-else-if="filteredCollections.length === 0 && filterText.length === 0"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <img
        :src="`/images/states/${$colorMode.value}/pack.svg`"
        loading="lazy"
        class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
        :alt="$t('empty.collections')"
      />
      <span class="pb-4 text-center">
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
        class="mb-4"
        filled
      />
      <ButtonSecondary
        v-else
        :label="$t('add.new')"
        filled
        class="mb-4"
        @click.native="displayModalAdd(true)"
      />
    </div>
    <div
      v-if="filterText.length !== 0 && filteredCollections.length === 0"
      class="flex flex-col items-center justify-center p-4 text-secondaryLight"
    >
      <i class="pb-2 opacity-75 material-icons">manage_search</i>
      <span class="my-2 text-center">
        {{ $t("state.nothing_found") }} "{{ filterText }}"
      </span>
    </div>
    <CollectionsAdd
      :show="showModalAdd"
      :loading-state="modalLoadingState"
      @submit="addNewRootCollection"
      @hide-modal="displayModalAdd(false)"
    />
    <CollectionsEdit
      :show="showModalEdit"
      :editing-collection-name="
        editingCollection
          ? editingCollection.name || editingCollection.title
          : ''
      "
      @hide-modal="displayModalEdit(false)"
      @submit="updateEditingCollection"
    />
    <CollectionsAddRequest
      :show="showModalAddRequest"
      :folder="editingFolder"
      :folder-path="editingFolderPath"
      :loading-state="modalLoadingState"
      @add-request="onAddRequest($event)"
      @hide-modal="displayModalAddRequest(false)"
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
      :editing-folder-name="
        editingFolder ? editingFolder.name || editingFolder.title : ''
      "
      @submit="updateEditingFolder"
      @hide-modal="displayModalEditFolder(false)"
    />
    <CollectionsEditRequest
      :show="showModalEditRequest"
      :editing-request-name="editingRequest ? editingRequest.name : ''"
      @submit="updateEditingRequest"
      @hide-modal="displayModalEditRequest(false)"
    />
    <CollectionsImportExport
      :show="showModalImportExport"
      :collections-type="collectionsType"
      @hide-modal="displayModalImportExport(false)"
      @update-team-collections="updateTeamCollections"
    />
  </div>
</template>

<script>
import cloneDeep from "lodash/cloneDeep"
import { defineComponent } from "@nuxtjs/composition-api"
import { makeCollection } from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import CollectionsMyCollection from "./my/Collection.vue"
import CollectionsTeamsCollection from "./teams/Collection.vue"
import { currentUser$ } from "~/helpers/fb/auth"
import TeamCollectionAdapter from "~/helpers/teams/TeamCollectionAdapter"
import {
  restCollections$,
  addRESTCollection,
  editRESTCollection,
  addRESTFolder,
  removeRESTCollection,
  editRESTFolder,
  removeRESTRequest,
  editRESTRequest,
  saveRESTRequestAs,
} from "~/newstore/collections"
import { setRESTRequest, getRESTRequest } from "~/newstore/RESTSession"
import {
  useReadonlyStream,
  useStreamSubscriber,
} from "~/helpers/utils/composables"
import { runMutation } from "~/helpers/backend/GQLClient"
import {
  CreateChildCollectionDocument,
  CreateNewRootCollectionDocument,
  CreateRequestInCollectionDocument,
  DeleteCollectionDocument,
  DeleteRequestDocument,
  RenameCollectionDocument,
  UpdateRequestDocument,
} from "~/helpers/backend/graphql"

export default defineComponent({
  components: {
    CollectionsMyCollection,
    CollectionsTeamsCollection,
  },
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
      showModalAddRequest: false,
      showModalAddFolder: false,
      showModalEditFolder: false,
      showModalEditRequest: false,
      modalLoadingState: false,
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
      loadingCollectionIDs: [],
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
    currentUser(newValue) {
      if (!newValue) this.updateCollectionType("my-collections")
    },
  },
  mounted() {
    this.subscribeTo(this.teamCollectionAdapter.collections$, (colls) => {
      this.teamCollectionsNew = cloneDeep(colls)
    })
    this.subscribeTo(
      this.teamCollectionAdapter.loadingCollections$,
      (collectionsIDs) => {
        this.loadingCollectionIDs = collectionsIDs
      }
    )
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
        addRESTCollection(
          makeCollection({
            name,
            folders: [],
            requests: [],
          })
        )

        this.displayModalAdd(false)
      } else if (
        this.collectionsType.type === "team-collections" &&
        this.collectionsType.selectedTeam.myRole !== "VIEWER"
      ) {
        this.modalLoadingState = true
        runMutation(CreateNewRootCollectionDocument, {
          title: name,
          teamID: this.collectionsType.selectedTeam.id,
        })().then((result) => {
          this.modalLoadingState = false
          if (E.isLeft(result)) {
            if (result.left.error === "team_coll/short_title")
              this.$toast.error(this.$t("collection.name_length_insufficient"))
            else this.$toast.error(this.$t("error.something_went_wrong"))
            console.error(result.left.error)
          } else {
            this.$toast.success(this.$t("collection.created"))
            this.displayModalAdd(false)
          }
        })
      }
    },
    // Intented to be called by CollectionEdit modal submit event
    updateEditingCollection(newName) {
      if (!newName) {
        this.$toast.error(this.$t("collection.invalid_name"))
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
        runMutation(RenameCollectionDocument, {
          collectionID: this.editingCollection.id,
          newTitle: newName,
        })().then((result) => {
          if (E.isLeft(result)) {
            this.$toast.error(this.$t("error.something_went_wrong"))
            console.error(e)
          } else {
            this.$toast.success(this.$t("collection.renamed"))
          }
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
        runMutation(RenameCollectionDocument, {
          collectionID: this.editingFolder.id,
          newTitle: name,
        })().then((result) => {
          if (E.isLeft(result)) {
            this.$toast.error(this.$t("error.something_went_wrong"))
            console.error(e)
          } else {
            this.$toast.success(this.$t("folder.renamed"))
          }
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

        runMutation(UpdateRequestDocument, {
          data: {
            request: JSON.stringify(requestUpdated),
            title: requestName,
          },
          requestID: this.editingRequestIndex,
        })().then((result) => {
          if (E.isLeft(result)) {
            this.$toast.error(this.$t("error.something_went_wrong"))
            console.error(e)
          } else {
            this.$toast.success(this.$t("request.renamed"))
            this.$emit("update-team-collections")
          }
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
    displayModalAddRequest(shouldDisplay) {
      this.showModalAddRequest = shouldDisplay

      if (!shouldDisplay) this.resetSelectedData()
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
          runMutation(CreateChildCollectionDocument, {
            childTitle: name,
            collectionID: folder.id,
          })().then((result) => {
            if (E.isLeft(result)) {
              if (result.left.error === "team_coll/short_title")
                this.$toast.error(this.$t("folder.name_length_insufficient"))
              else this.$toast.error(this.$t("error.something_went_wrong"))
              console.error(result.left.error)
            } else {
              this.$toast.success(this.$t("folder.created"))
              this.$emit("update-team-collections")
            }
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
        this.$toast.success(this.$t("state.deleted"))
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
          runMutation(DeleteCollectionDocument, {
            collectionID,
          })().then((result) => {
            if (E.isLeft(result)) {
              this.$toast.error(this.$t("error.something_went_wrong"))
              console.error(result.left.error)
            } else {
              this.$toast.success(this.$t("state.deleted"))
            }
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
        this.$toast.success(this.$t("state.deleted"))
      } else if (this.collectionsType.type === "team-collections") {
        // Cancel pick if the picked item is being deleted
        if (
          this.picked &&
          this.picked.pickedType === "teams-request" &&
          this.picked.requestID === requestIndex
        ) {
          this.$emit("select", { picked: null })
        }

        runMutation(DeleteRequestDocument, {
          requestID: requestIndex,
        })().then((result) => {
          if (E.isLeft(result)) {
            this.$toast.error(this.$t("error.something_went_wrong"))
            console.error(result.left.error)
          } else {
            this.$toast.success(this.$t("state.deleted"))
          }
        })
      }
    },
    addRequest(payload) {
      // TODO: check if the request being worked on
      // is being overwritten (selected or not)
      const { folder, path } = payload
      this.$data.editingFolder = folder
      this.$data.editingFolderPath = path
      this.displayModalAddRequest(true)
    },
    onAddRequest({ name, folder, path }) {
      const newRequest = {
        ...cloneDeep(getRESTRequest()),
        name,
      }

      if (this.collectionsType.type === "my-collections") {
        const insertionIndex = saveRESTRequestAs(path, newRequest)
        // point to it
        setRESTRequest(newRequest, {
          originLocation: "user-collection",
          folderPath: path,
          requestIndex: insertionIndex,
        })

        this.displayModalAddRequest(false)
      } else if (
        this.collectionsType.type === "team-collections" &&
        this.collectionsType.selectedTeam.myRole !== "VIEWER"
      ) {
        this.modalLoadingState = true
        runMutation(CreateRequestInCollectionDocument, {
          collectionID: folder.id,
          data: {
            request: JSON.stringify(newRequest),
            teamID: this.collectionsType.selectedTeam.id,
            title: name,
          },
        })().then((result) => {
          this.modalLoadingState = false
          if (E.isLeft(result)) {
            this.$toast.error(this.$t("error.something_went_wrong"))
            console.error(result.left.error)
          } else {
            const { createRequestInCollection } = result.right
            // point to it
            setRESTRequest(newRequest, {
              originLocation: "team-collection",
              requestID: createRequestInCollection.id,
              collectionID: createRequestInCollection.collection.id,
              teamID: createRequestInCollection.collection.team.id,
            })
            this.displayModalAddRequest(false)
          }
        })
      }
    },
    duplicateRequest({ folderPath, request, collectionID }) {
      if (this.collectionsType.type === "team-collections") {
        const newReq = {
          ...cloneDeep(request),
          name: `${request.name} - ${this.$t("action.duplicate")}`,
        }

        // Error handling ?
        runMutation(CreateRequestInCollectionDocument, {
          collectionID,
          data: {
            request: JSON.stringify(newReq),
            teamID: this.collectionsType.selectedTeam.id,
            title: `${request.name} - ${this.$t("action.duplicate")}`,
          },
        })()
      } else if (this.collectionsType.type === "my-collections") {
        saveRESTRequestAs(folderPath, {
          ...cloneDeep(request),
          name: `${request.name} - ${this.$t("action.duplicate")}`,
        })
      }
    },
  },
})
</script>
