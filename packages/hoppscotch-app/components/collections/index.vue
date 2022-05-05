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
        :collections-type="collectionsObject"
        :show="showTeamCollections"
        :doc="doc"
        @update-collection-type="updateCollectionType"
        @update-selected-team="updateSelectedTeam"
      />
      <div class="flex justify-between flex-1">
        <ButtonSecondary
          v-if="
            collectionsObject.type === 'team-collections' &&
            (collectionsObject.selectedTeam === undefined ||
              collectionsObject.selectedTeam.myRole === 'VIEWER')
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
              collectionsObject.type == 'team-collections' &&
              collectionsObject.selectedTeam == undefined
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
          collectionsObject.type === 'my-collections'
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
        :collections-type="collectionsObject"
        :picked="picked"
        :loading-collection-i-ds="loadingCollectionIDs"
        @edit-collection="editCollection(collection, index)"
        @add-request="addRequest($event)"
        @add-folder="addFolder($event)"
        @edit-folder="editFolder($event)"
        @edit-request="editRequest($event)"
        @duplicate-request="duplicateRequest($event)"
        @select-collection="$emit('use-collection', collection)"
        @unselect-collection="$emit('remove-collection', collection)"
        @select="$emit('select', $event)"
        @expand-collection="expandCollection"
        @remove-collection="removeCollection"
        @remove-request="removeRequest"
        @remove-folder="removeFolder"
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
          collectionsObject.type === 'team-collections' &&
          (collectionsObject.selectedTeam === undefined ||
            collectionsObject.selectedTeam.myRole === 'VIEWER')
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
      :loading-state="modalLoadingState"
      @hide-modal="displayModalEdit(false)"
      @submit="updateEditingCollection"
    />
    <CollectionsAddFolder
      :show="showModalAddFolder"
      :folder="editingFolder"
      :folder-path="editingFolderPath"
      :loading-state="modalLoadingState"
      @add-folder="onAddFolder($event)"
      @hide-modal="displayModalAddFolder(false)"
    />
    <CollectionsEditFolder
      :show="showModalEditFolder"
      :editing-folder-name="
        editingFolder ? editingFolder.name || editingFolder.title : ''
      "
      :loading-state="modalLoadingState"
      @submit="updateEditingFolder"
      @hide-modal="displayModalEditFolder(false)"
    />
    <CollectionsAddRequest
      :show="showModalAddRequest"
      :folder="editingFolder"
      :folder-path="editingFolderPath"
      :loading-state="modalLoadingState"
      @add-request="onAddRequest($event)"
      @hide-modal="displayModalAddRequest(false)"
    />
    <CollectionsEditRequest
      :show="showModalEditRequest"
      :editing-request-name="editingRequest?.name || ''"
      :loading-state="modalLoadingState"
      @submit="updateEditingRequest"
      @hide-modal="displayModalEditRequest(false)"
    />
    <CollectionsImportExport
      :show="showModalImportExport"
      :collections-type="collectionsObject"
      @hide-modal="displayModalImportExport(false)"
    />
    <SmartConfirmModal
      :show="showConfirmModal"
      :title="confirmModalTitle"
      :loading-state="modalLoadingState"
      @hide-modal="showConfirmModal = false"
      @resolve="resolveConfirmModal"
    />
  </div>
</template>

<script setup lang="ts">
import cloneDeep from "lodash/cloneDeep"
import { ref, watchEffect, computed, watch, Ref } from "@nuxtjs/composition-api"
import {
  HoppCollection,
  HoppRESTRequest,
  makeCollection,
} from "@hoppscotch/data"
import * as E from "fp-ts/Either"
import { currentUser$ } from "~/helpers/fb/auth"
import TeamCollectionAdapter from "~/helpers/teams/TeamCollectionAdapter"
import {
  restCollections$,
  addRESTCollection,
  editRESTCollection,
  addRESTFolder,
  removeRESTCollection,
  removeRESTFolder,
  editRESTFolder,
  removeRESTRequest,
  editRESTRequest,
  saveRESTRequestAs,
} from "~/newstore/collections"
import { setRESTRequest, getRESTRequest } from "~/newstore/RESTSession"
import {
  useReadonlyStream,
  useStreamSubscriber,
  useToast,
  useI18n,
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
  Team,
} from "~/helpers/backend/graphql"
import { TeamCollection } from "~/helpers/teams/TeamCollection"

// TODO: check if all ref params are accessed using .value

/*
 * Types
 */
type HoppRESTCollection = HoppCollection<HoppRESTRequest>
type CollectionType = "my-collections" | "team-collections"
export type CollectionObject =
  | {
      type: "my-collections"
    }
  | {
      type: "team-collections"
      selectedTeam: Team
    }
export type Picked =
  | {
      pickedType: "my-request"
      folderPath: string
      requestIndex: number
    }
  | {
      pickedType: "my-folder"
      folderPath: string
    }
  | {
      pickedType: "my-collection"
      collectionIndex: number
    }
  | {
      pickedType: "teams-request"
      requestID: string
    }
  | {
      pickedType: "teams-folder"
      folderID: string
    }
  | {
      pickedType: "teams-collection"
      collectionID: string
    }
  | {
      pickedType: "gql-my-request"
      folderPath: string
      requestIndex: number
    }
  | {
      pickedType: "gql-my-folder"
      folderPath: string
    }
  | {
      pickedType: "gql-my-collection"
      collectionIndex: number
    }
  | null

/*
 * User message utils
 */
const toast = useToast()
const t = useI18n()

/*
 * Props
 */
const props = defineProps<{
  docProp?: boolean
  selectedProp?: Array<HoppRESTCollection>
  saveRequestProp?: boolean
  pickedProp?: Picked
}>()

/*
 * Computed properties
 */

const doc = computed(() => (props.docProp ? props.docProp : false))
const selected = computed(() => (props.selectedProp ? props.selectedProp : []))
const saveRequest = computed(() =>
  props.saveRequestProp ? props.saveRequestProp : false
)
const picked = computed(() =>
  props.pickedProp !== undefined ? props.pickedProp : null
)

const showTeamCollections = computed(() => !!currentUser.value)
// TODO: requires some investigation
const filteredCollections = computed(() => {
  const collectionsValue =
    collectionsObject.value.type === "my-collections"
      ? collections.value
      : teamCollectionsNew.value

  if (!filterText.value) return collectionsValue
  if (collectionsObject.value.type === "team-collections") return []

  const filterTextValue = filterText.value.toLowerCase()
  const filteredCollections = []

  for (const collection of collectionsValue) {
    const filteredRequests = []
    const filteredFolders = []
    // @ts-ignore
    for (const request of collection.requests) {
      // @ts-ignore
      if (request.name.toLowerCase().includes(filterTextValue))
        filteredRequests.push(request)
    }
    // FIXME
    // @ts-ignore
    for (const folder of collectionsObject.value.type === "team-collections"
      ? // FIXME
        (collection as any).children
      : // @ts-ignore
        collection.folders) {
      const filteredFolderRequests = []
      for (const request of folder.requests) {
        if (request.name.toLowerCase().includes(filterText.value))
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
      // @ts-ignore
      collection.name.toLowerCase().includes(filterText.value)
    ) {
      const filteredCollection = Object.assign({}, collection)
      // @ts-ignore
      filteredCollection.requests = filteredRequests
      // @ts-ignore
      filteredCollection.folders = filteredFolders
      filteredCollections.push(filteredCollection)
    }
  }

  return filteredCollections
})

/*
 * Emit declarations
 */
const emit = defineEmits<{
  (e: "update-collections", collectionType: CollectionType): void
  (e: "update-coll-type", collectionsObject: Ref<CollectionObject>): void
  (e: "select-request", requestIndex: number): void
  (e: "select", pickedObj: { picked: Picked }): void
}>()

/*
 * Modal props
 */
const editingCollection: Ref<HoppRESTCollection | undefined> = ref(undefined)
const editingCollectionIndex: Ref<number> = ref(-1)
const editingCollectionID: Ref<string> = ref("")
const editingFolder: Ref<HoppRESTCollection | undefined> = ref(undefined)
const editingFolderName: Ref<string> = ref("")
const editingFolderIndex: Ref<number> = ref(-1)
const editingFolderPath: Ref<string> = ref("")
const editingRequest: Ref<HoppRESTRequest | undefined> = ref(undefined)
const editingRequestIndex: Ref<number> = ref(-1)

// TODO: a more apt description
/*
 * Global Variables
 */
const filterText = ref("")
const collectionsObject = ref<CollectionObject>({
  type: "my-collections",
})

const teamCollectionAdapter = new TeamCollectionAdapter(null)
const teamCollectionsNew: Ref<TeamCollection[]> = ref([])
const loadingCollectionIDs: Ref<string[]> = ref([])

/*
 * Subsciptions
 */
const { subscribeToStream } = useStreamSubscriber()
const collections = useReadonlyStream(restCollections$, [])
const currentUser = useReadonlyStream(currentUser$, null)

subscribeToStream(teamCollectionAdapter.collections$, (colls) => {
  teamCollectionsNew.value = cloneDeep(colls)
})
subscribeToStream(
  teamCollectionAdapter.loadingCollections$,
  (collectionsIDs) => {
    loadingCollectionIDs.value = collectionsIDs
  }
)

/*
 * Watchers
 */
watch(
  () => collectionsObject.value.type,
  (type) => {
    if (type) emit("update-collections", type)
  }
)
watchEffect(() => {
  if (
    collectionsObject.value.type === "team-collections" &&
    collectionsObject.value.selectedTeam.id
  )
    teamCollectionAdapter.changeTeamID(collectionsObject.value.selectedTeam.id)
})
// TODO: verify this werks
watchEffect(() => {
  if (currentUser.value) {
    updateCollectionType("team-collections")
  }
})

/*
 * Methods =====================================================================
 */

/*
 * Reset Modal Prop Data
 */
const resetSelectedData = () => {
  editingCollection.value = undefined
  editingCollectionIndex.value = 1
  editingCollectionID.value = ""
  editingFolder.value = undefined
  editingFolderName.value = ""
  editingFolderIndex.value = -1
  editingFolderPath.value = ""
  editingRequest.value = undefined
  editingRequestIndex.value = -1
  confirmModalTitle.value = ""
}

/*
 * Modal Loading State
 */
const modalLoadingState = ref(false)
const setModalLoadingState = (loading: boolean) => {
  modalLoadingState.value = loading
}

/*
 * Import Export Modal
 */
const showModalImportExport = ref(false)
const displayModalImportExport = (shouldDisplay: boolean) => {
  showModalImportExport.value = shouldDisplay
}

/**
 * Sets the selected team locally and emits the update event
 * @param newSelectedTeam
 */
const updateSelectedTeam = (newSelectedTeam: Team) => {
  if (collectionsObject.value.type === "team-collections") {
    collectionsObject.value.selectedTeam = newSelectedTeam
    emit("update-coll-type", collectionsObject)
  }
}

/**
 * Updates the local collection type and emits the event
 * @param newCollectionType
 */
const updateCollectionType = (newCollectionType: CollectionType) => {
  collectionsObject.value.type = newCollectionType
  emit("update-coll-type", collectionsObject)
}

/*
 * Add Collection Modal
 */

const showModalAdd = ref(false)
const displayModalAdd = (shouldDisplay: boolean) => {
  showModalAdd.value = shouldDisplay
}

// Intented to be called by the CollectionAdd modal submit event
const addNewRootCollection = (name: string) => {
  if (collectionsObject.value.type === "my-collections") {
    addRESTCollection(
      makeCollection({
        name,
        folders: [],
        requests: [],
      })
    )

    displayModalAdd(false)
  } else if (
    collectionsObject.value.type === "team-collections" &&
    collectionsObject.value.selectedTeam.myRole !== "VIEWER"
  ) {
    setModalLoadingState(true)

    runMutation(CreateNewRootCollectionDocument, {
      title: name,
      teamID: collectionsObject.value.selectedTeam.id,
    })().then((result) => {
      setModalLoadingState(false)

      if (E.isLeft(result)) {
        if (result.left.error === "team_coll/short_title")
          toast.error(t("collection.name_length_insufficient"))
        else toast.error(t("error.something_went_wrong"))
        console.error(result.left.error)
      } else {
        toast.success(t("collection.created"))
        displayModalAdd(false)
      }
    })
  }
}

/*
 * Edit Collection Modal
 */

const showModalEdit = ref(false)
const displayModalEdit = (shouldDisplay: boolean) => {
  showModalEdit.value = shouldDisplay
  if (!shouldDisplay) resetSelectedData()
}

const editCollection = (
  collection: HoppRESTCollection,
  collectionIndex: number
) => {
  editingCollection.value = collection
  editingCollectionIndex.value = collectionIndex
  displayModalEdit(true)
}

// Intented to be called by CollectionEdit modal submit event
const updateEditingCollection = (newName: string) => {
  if (!newName) {
    toast.error(t("collection.invalid_name"))
    return
  }
  if (!editingCollection.value?.id) {
    toast.error(t("error.something_went_wrong"))
    console.error("Editing Collection ID is undefined")
    return
  }

  if (collectionsObject.value.type === "my-collections") {
    const collectionUpdated = {
      ...editingCollection.value,
      name: newName,
    }

    editRESTCollection(editingCollectionIndex.value, collectionUpdated)
    displayModalEdit(false)
  } else if (
    collectionsObject.value.type === "team-collections" &&
    collectionsObject.value.selectedTeam.myRole !== "VIEWER"
  ) {
    setModalLoadingState(true)

    runMutation(RenameCollectionDocument, {
      collectionID: editingCollection.value.id,
      newTitle: newName,
    })().then((result) => {
      setModalLoadingState(false)

      if (E.isLeft(result)) {
        toast.error(t("error.something_went_wrong"))
        console.error(result.left.error)
      } else {
        toast.success(t("collection.renamed"))
        displayModalEdit(false)
      }
    })
  }
}

/*
 * Remove Collection Modal
 */

const removeCollection = (payload: {
  collectionIndex: number
  collectionID: string
}) => {
  const { collectionIndex, collectionID } = payload

  editingCollectionIndex.value = collectionIndex
  editingCollectionID.value = collectionID
  confirmModalTitle.value = `${t("confirm.remove_collection")}`

  displayConfirmModal(true)
}
const onRemoveCollection = () => {
  const collectionIndex = editingCollectionIndex.value
  const collectionID = editingCollectionID.value

  if (collectionsObject.value.type === "my-collections") {
    // Cancel pick if picked collection is deleted
    if (
      picked.value &&
      picked.value.pickedType === "my-collection" &&
      picked.value.collectionIndex === collectionIndex
    ) {
      emit("select", { picked: null })
    }

    removeRESTCollection(collectionIndex)

    toast.success(t("state.deleted"))
    displayConfirmModal(false)
  } else if (collectionsObject.value.type === "team-collections") {
    setModalLoadingState(true)

    // Cancel pick if picked collection is deleted
    if (
      picked.value &&
      picked.value.pickedType === "teams-collection" &&
      picked.value.collectionID === collectionID
    ) {
      emit("select", { picked: null })
    }

    if (collectionsObject.value.selectedTeam.myRole !== "VIEWER") {
      runMutation(DeleteCollectionDocument, {
        collectionID,
      })().then((result) => {
        setModalLoadingState(false)

        if (E.isLeft(result)) {
          toast.error(t("error.something_went_wrong"))
          console.error(result.left.error)
        } else {
          toast.success(t("state.deleted"))
          displayConfirmModal(false)
        }
      })
    }
  }
}

/*
 * Expand Collection
 */

const expandCollection = (collectionID: string) => {
  teamCollectionAdapter.expandCollection(collectionID)
}

/*
 * Add Folder Modal
 */

const showModalAddFolder = ref(false)
const displayModalAddFolder = (shouldDisplay: boolean) => {
  showModalAddFolder.value = shouldDisplay
  if (!shouldDisplay) resetSelectedData()
}

const addFolder = (payload: { folder: HoppRESTCollection; path: string }) => {
  const { folder, path } = payload
  editingFolder.value = folder
  editingFolderPath.value = path
  displayModalAddFolder(true)
}

const onAddFolder = (payload: {
  name: string
  folder: HoppRESTCollection
  path: string
}) => {
  const { name, folder, path } = payload
  if (collectionsObject.value.type === "my-collections") {
    addRESTFolder(name, path)
    displayModalAddFolder(false)
  } else if (
    collectionsObject.value.type === "team-collections" &&
    collectionsObject.value.selectedTeam.myRole !== "VIEWER"
  ) {
    if (!folder.id) {
      toast.error(t("error.something_went_wrong"))
      console.error("Folder ID is undefined")
      return
    }

    setModalLoadingState(true)

    runMutation(CreateChildCollectionDocument, {
      childTitle: name,
      collectionID: folder.id,
    })().then((result) => {
      setModalLoadingState(false)

      if (E.isLeft(result)) {
        if (result.left.error === "team_coll/short_title")
          toast.error(t("folder.name_length_insufficient"))
        else toast.error(t("error.something_went_wrong"))
        console.error(result.left.error)
      } else {
        toast.success(t("folder.created"))
        displayModalAddFolder(false)
      }
    })
  }
}

/*
 * Edit Folder Modal
 */

const showModalEditFolder = ref(false)
const displayModalEditFolder = (shouldDisplay: boolean) => {
  showModalEditFolder.value = shouldDisplay
  if (!shouldDisplay) resetSelectedData()
}

const editFolder = (payload: {
  collectionIndex: number
  folder: HoppRESTCollection
  folderIndex: number
  folderPath: string
}) => {
  const { collectionIndex, folder, folderIndex, folderPath } = payload
  editingCollectionIndex.value = collectionIndex
  editingFolder.value = folder
  editingFolderIndex.value = folderIndex
  editingFolderPath.value = folderPath
  displayModalEditFolder(true)
}

// Intended to be called by CollectionEditFolder modal submit event
const updateEditingFolder = (name: string) => {
  if (!editingFolder.value?.id) {
    toast.error(t("error.something_went_wrong"))
    console.error("Editing Folder ID is undefined")
    return
  }

  if (collectionsObject.value.type === "my-collections") {
    editRESTFolder(editingFolderPath.value, { ...editingFolder.value, name })
    displayModalEditFolder(false)
  } else if (
    collectionsObject.value.type === "team-collections" &&
    collectionsObject.value.selectedTeam.myRole !== "VIEWER"
  ) {
    setModalLoadingState(true)

    runMutation(RenameCollectionDocument, {
      collectionID: editingFolder.value.id,
      newTitle: name,
    })().then((result) => {
      setModalLoadingState(false)

      if (E.isLeft(result)) {
        if (result.left.error === "team_coll/short_title")
          toast.error(t("folder.name_length_insufficient"))
        else toast.error(t("error.something_went_wrong"))
        console.error(result.left.error)
      } else {
        toast.success(t("folder.renamed"))
        displayModalEditFolder(false)
      }
    })
  }
}

/*
 * Remove Folder Modal
 */

const removeFolder = (payload: {
  folder: HoppRESTCollection
  folderPath: string
}) => {
  const { folder, folderPath } = payload

  editingFolder.value = folder
  editingFolderPath.value = folderPath
  confirmModalTitle.value = `${t("confirm.remove_folder")}`

  displayConfirmModal(true)
}

const onRemoveFolder = () => {
  const folder = editingFolder.value
  const folderPath = editingFolderPath.value

  if (collectionsObject.value.type === "my-collections") {
    // Cancel pick if picked folder was deleted
    if (
      picked.value &&
      picked.value.pickedType === "my-folder" &&
      picked.value.folderPath === folderPath
    ) {
      emit("select", { picked: null })
    }
    removeRESTFolder(folderPath)

    toast.success(t("state.deleted"))
    displayConfirmModal(false)
  } else if (collectionsObject.value.type === "team-collections") {
    if (!folder?.id) {
      toast.error(t("error.something_went_wrong"))
      console.error("Folder ID is undefined")
      return
    }

    setModalLoadingState(true)

    // Cancel pick if picked collection folder was deleted
    if (
      picked.value &&
      picked.value.pickedType === "teams-folder" &&
      picked.value.folderID === folder.id
    ) {
      emit("select", { picked: null })
    }

    if (collectionsObject.value.selectedTeam.myRole !== "VIEWER") {
      runMutation(DeleteCollectionDocument, {
        collectionID: folder.id,
      })().then((result) => {
        setModalLoadingState(false)

        if (E.isLeft(result)) {
          toast.error(`${t("error.something_went_wrong")}`)
          console.error(result.left.error)
        } else {
          toast.success(`${t("state.deleted")}`)
          displayConfirmModal(false)
        }
      })
    }
  }
}

/*
 * Add Request Modal
 */

const showModalAddRequest = ref(false)
const displayModalAddRequest = (shouldDisplay: boolean) => {
  showModalAddRequest.value = shouldDisplay
  if (!shouldDisplay) resetSelectedData()
}

const addRequest = (payload: { folder: HoppRESTCollection; path: string }) => {
  // TODO: check if the request being worked on
  // is being overwritten (selected or not)
  const { folder, path } = payload
  editingFolder.value = folder
  editingFolderPath.value = path
  displayModalAddRequest(true)
}

const onAddRequest = (payload: {
  name: string
  folder: HoppRESTCollection
  path: string
}) => {
  const { name, folder, path } = payload

  const newRequest = {
    ...cloneDeep(getRESTRequest()),
    name,
  }

  if (collectionsObject.value.type === "my-collections") {
    const insertionIndex = saveRESTRequestAs(path, newRequest)
    // point to it
    setRESTRequest(newRequest, {
      originLocation: "user-collection",
      folderPath: path,
      requestIndex: insertionIndex,
    })

    displayModalAddRequest(false)
  } else if (
    collectionsObject.value.type === "team-collections" &&
    collectionsObject.value.selectedTeam.myRole !== "VIEWER"
  ) {
    if (!folder?.id) {
      toast.error(t("error.something_went_wrong"))
      console.error("Folder ID is undefined")
      return
    }

    setModalLoadingState(true)

    runMutation(CreateRequestInCollectionDocument, {
      collectionID: folder.id,
      data: {
        request: JSON.stringify(newRequest),
        teamID: collectionsObject.value.selectedTeam.id,
        title: name,
      },
    })().then((result) => {
      setModalLoadingState(false)

      if (E.isLeft(result)) {
        toast.error(t("error.something_went_wrong"))
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

        displayModalAddRequest(false)
      }
    })
  }
}

/*
 * Edit Request Modal
 */

const showModalEditRequest = ref(false)
const displayModalEditRequest = (shouldDisplay: boolean) => {
  showModalEditRequest.value = shouldDisplay
  if (!shouldDisplay) resetSelectedData()
}

const editRequest = (payload: {
  collectionIndex: number
  folderIndex: number
  folderName: string
  request: HoppRESTRequest
  requestIndex: number
  folderPath: string
}) => {
  const {
    collectionIndex,
    folderIndex,
    folderName,
    request,
    requestIndex,
    folderPath,
  } = payload
  editingCollectionIndex.value = collectionIndex
  editingFolderIndex.value = folderIndex
  editingFolderName.value = folderName
  editingRequest.value = request
  editingRequestIndex.value = requestIndex
  editingFolderPath.value = folderPath
  emit("select-request", requestIndex)
  displayModalEditRequest(true)
}

// Intented to by called by CollectionsEditRequest modal submit event
const updateEditingRequest = (requestName: string) => {
  if (!editingRequest.value) {
    toast.error(t("error.something_went_wrong"))
    console.error("No editing request")
    return
  }

  const requestUpdated = {
    ...editingRequest.value,
    name: requestName,
  }

  if (collectionsObject.value.type === "my-collections") {
    editRESTRequest(
      editingFolderPath.value,
      editingRequestIndex.value,
      requestUpdated
    )

    displayModalEditRequest(false)
  } else if (
    collectionsObject.value.type === "team-collections" &&
    collectionsObject.value.selectedTeam.myRole !== "VIEWER"
  ) {
    setModalLoadingState(true)

    runMutation(UpdateRequestDocument, {
      data: {
        request: JSON.stringify(requestUpdated),
        title: requestName || editingRequest.value?.name || "Untitled Request",
      },
      requestID: `${editingRequestIndex.value}`,
    })().then((result) => {
      setModalLoadingState(false)

      if (E.isLeft(result)) {
        toast.error(t("error.something_went_wrong"))
        console.error(result.left.error)
      } else {
        toast.success(t("request.renamed"))
        displayModalEditRequest(false)
      }
    })
  }
}

/*
 * Remove Request Modal
 */

const removeRequest = (payload: {
  requestIndex: number
  folderPath: string
}) => {
  const { requestIndex, folderPath } = payload
  editingRequestIndex.value = requestIndex
  editingFolderPath.value = folderPath
  confirmModalTitle.value = `${t("confirm.remove_request")}`

  displayConfirmModal(true)
}

const onRemoveRequest = () => {
  const requestIndex = editingRequestIndex.value
  const folderPath = editingFolderPath.value

  if (collectionsObject.value.type === "my-collections") {
    // Cancel pick if the picked item is being deleted
    if (
      picked.value &&
      picked.value.pickedType === "my-request" &&
      picked.value.folderPath === folderPath &&
      picked.value.requestIndex === requestIndex
    ) {
      emit("select", { picked: null })
    }
    removeRESTRequest(folderPath, requestIndex)

    toast.success(t("state.deleted"))
    displayConfirmModal(false)
  } else if (collectionsObject.value.type === "team-collections") {
    setModalLoadingState(true)

    // Cancel pick if the picked item is being deleted
    if (
      picked.value &&
      picked.value.pickedType === "teams-request" &&
      picked.value.requestID === `${requestIndex}`
    ) {
      emit("select", { picked: null })
    }

    runMutation(DeleteRequestDocument, {
      requestID: `${requestIndex}`,
    })().then((result) => {
      setModalLoadingState(false)

      if (E.isLeft(result)) {
        toast.error(t("error.something_went_wrong"))
        console.error(result.left.error)
      } else {
        toast.success(t("state.deleted"))
        displayConfirmModal(false)
      }
    })
  }
}

/*
 * Duplicate Request
 */
const duplicateRequest = (payload: {
  folderPath: string
  request: HoppRESTRequest
  collectionID: string
}) => {
  const { folderPath, request, collectionID } = payload

  if (collectionsObject.value.type === "team-collections") {
    const newReq = {
      ...cloneDeep(request),
      name: `${request.name} - ${t("action.duplicate")}`,
    }

    runMutation(CreateRequestInCollectionDocument, {
      collectionID,
      data: {
        request: JSON.stringify(newReq),
        teamID: collectionsObject.value.selectedTeam.id,
        title: `${request.name} - ${t("action.duplicate")}`,
      },
    })().then((result) => {
      if (E.isLeft(result)) {
        toast.error(t("error.something_went_wrong"))
        console.error(result.left.error)
      } else {
        toast.success(t("state.duplicated"))
      }
    })
  } else if (collectionsObject.value.type === "my-collections") {
    saveRESTRequestAs(folderPath, {
      ...cloneDeep(request),
      name: `${request.name} - ${t("action.duplicate")}`,
    })
  }
}

/*
 * Confirm Modal
 */

const showConfirmModal = ref(false)
const confirmModalTitle: Ref<string> = ref("")

const displayConfirmModal = (shouldDisplay: boolean) => {
  showConfirmModal.value = shouldDisplay
  if (!shouldDisplay) resetSelectedData()
}

const resolveConfirmModal = (title: string) => {
  switch (title) {
    case `${t("confirm.remove_folder")}`:
      onRemoveFolder()
      break
    case `${t("confirm.remove_request")}`:
      onRemoveRequest()
      break
    case `${t("confirm.remove_collection")}`:
      onRemoveCollection()
      break
    default:
      console.error(
        `Confirm modal title "${title}" is not handled by the component`
      )
      toast.error(t("error.something_went_wrong"))
      displayConfirmModal(false)
  }
}
</script>
