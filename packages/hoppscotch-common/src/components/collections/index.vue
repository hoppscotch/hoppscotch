<template>
  <div
    :class="{
      'rounded border border-divider': saveRequest,
      'bg-primaryDark': draggingToRoot,
    }"
    class="flex-1"
    @drop.prevent="dropToRoot"
    @dragover.prevent="draggingToRoot = true"
    @dragend="draggingToRoot = false"
  >
    <div
      class="sticky z-10 flex flex-col flex-shrink-0 overflow-x-auto border-b bg-primary border-dividerLight"
      :class="{ 'rounded-t': saveRequest }"
      :style="
        saveRequest ? 'top: calc(-1 * var(--line-height-body))' : 'top: 0'
      "
    >
      <WorkspaceCurrent :section="t('tab.collections')" />
      <input
        v-model="filterTexts"
        type="search"
        autocomplete="off"
        :placeholder="t('action.search')"
        class="py-2 pl-4 pr-2 bg-transparent"
        :disabled="collectionsType.type === 'team-collections'"
      />
    </div>
    <CollectionsMyCollections
      v-if="collectionsType.type === 'my-collections'"
      :collections-type="collectionsType"
      :filtered-collections="filteredCollections"
      :filter-text="filterTexts"
      :save-request="saveRequest"
      :picked="picked"
      @add-folder="addFolder"
      @add-request="addRequest"
      @edit-collection="editCollection"
      @edit-folder="editFolder"
      @export-data="exportData"
      @remove-collection="removeCollection"
      @remove-folder="removeFolder"
      @drop-collection="dropCollection"
      @update-request-order="updateRequestOrder"
      @update-collection-order="updateCollectionOrder"
      @edit-request="editRequest"
      @duplicate-request="duplicateRequest"
      @remove-request="removeRequest"
      @select-request="selectRequest"
      @select="selectPicked"
      @drop-request="dropRequest"
      @display-modal-add="displayModalAdd(true)"
      @display-modal-import-export="displayModalImportExport(true)"
    />
    <CollectionsTeamCollections
      v-else
      :collections-type="collectionsType"
      :team-collection-list="teamCollectionList"
      :team-loading-collections="teamLoadingCollections"
      :export-loading="exportLoading"
      :duplicate-loading="duplicateLoading"
      :save-request="saveRequest"
      :picked="picked"
      :collection-move-loading="collectionMoveLoading"
      :request-move-loading="requestMoveLoading"
      @add-request="addRequest"
      @add-folder="addFolder"
      @edit-collection="editCollection"
      @edit-folder="editFolder"
      @export-data="exportData"
      @remove-collection="removeCollection"
      @remove-folder="removeFolder"
      @edit-request="editRequest"
      @duplicate-request="duplicateRequest"
      @remove-request="removeRequest"
      @select-request="selectRequest"
      @select="selectPicked"
      @drop-request="dropRequest"
      @drop-collection="dropCollection"
      @update-request-order="updateRequestOrder"
      @update-collection-order="updateCollectionOrder"
      @expand-team-collection="expandTeamCollection"
      @display-modal-add="displayModalAdd(true)"
      @display-modal-import-export="displayModalImportExport(true)"
    />
    <div
      class="hidden bg-primaryDark flex-col flex-1 items-center py-15 justify-center px-4 text-secondaryLight"
      :class="{ '!flex': draggingToRoot }"
    >
      <component :is="IconListEnd" class="svg-icons !w-8 !h-8" />
    </div>
    <CollectionsAdd
      :show="showModalAdd"
      :loading-state="modalLoadingState"
      @submit="addNewRootCollection"
      @hide-modal="displayModalAdd(false)"
    />
    <CollectionsAddRequest
      :show="showModalAddRequest"
      :loading-state="modalLoadingState"
      @add-request="onAddRequest"
      @hide-modal="displayModalAddRequest(false)"
    />
    <CollectionsAddFolder
      :show="showModalAddFolder"
      :loading-state="modalLoadingState"
      @add-folder="onAddFolder"
      @hide-modal="displayModalAddFolder(false)"
    />
    <CollectionsEdit
      :show="showModalEditCollection"
      :editing-collection-name="editingCollectionName ?? ''"
      :loading-state="modalLoadingState"
      @hide-modal="displayModalEditCollection(false)"
      @submit="updateEditingCollection"
    />
    <CollectionsEditFolder
      :show="showModalEditFolder"
      :editing-folder-name="editingFolderName ?? ''"
      :loading-state="modalLoadingState"
      @submit="updateEditingFolder"
      @hide-modal="displayModalEditFolder(false)"
    />
    <CollectionsEditRequest
      :show="showModalEditRequest"
      :editing-request-name="editingRequest ? editingRequest.name : ''"
      :loading-state="modalLoadingState"
      @submit="updateEditingRequest"
      @hide-modal="displayModalEditRequest(false)"
    />
    <HoppSmartConfirmModal
      :show="showConfirmModal"
      :title="confirmModalTitle"
      :loading-state="modalLoadingState"
      @hide-modal="showConfirmModal = false"
      @resolve="resolveConfirmModal"
    />
    <CollectionsImportExport
      :show="showModalImportExport"
      :collections-type="collectionsType.type"
      :exporting-team-collections="exportingTeamCollections"
      :creating-gist-collection="creatingGistCollection"
      :importing-my-collections="importingMyCollections"
      @export-json-collection="exportJSONCollection"
      @create-collection-gist="createCollectionGist"
      @import-to-teams="importToTeams"
      @hide-modal="displayModalImportExport(false)"
    />
    <HttpReqChangeConfirmModal
      :show="confirmChangeToRequest"
      :loading="modalLoadingState"
      @hide-modal="confirmChangeToRequest = false"
      @save-change="saveRequestChange"
      @discard-change="discardRequestChange"
    />
    <CollectionsSaveRequest
      mode="rest"
      :show="showSaveRequestModal"
      @hide-modal="showSaveRequestModal = false"
    />
    <TeamsAdd
      :show="showTeamModalAdd"
      @hide-modal="displayTeamModalAdd(false)"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, PropType, reactive, ref, watch } from "vue"
import { useToast } from "@composables/toast"
import { useI18n } from "@composables/i18n"
import { Picked } from "~/helpers/types/HoppPicked"
import TeamListAdapter from "~/helpers/teams/TeamListAdapter"
import { useReadonlyStream } from "~/composables/stream"
import { useLocalState } from "~/newstore/localstate"
import { onLoggedIn } from "~/composables/auth"
import { GetMyTeamsQuery } from "~/helpers/backend/graphql"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import {
  addRESTCollection,
  addRESTFolder,
  editRESTCollection,
  editRESTFolder,
  editRESTRequest,
  moveRESTFolder,
  moveRESTRequest,
  removeRESTCollection,
  removeRESTFolder,
  removeRESTRequest,
  restCollections$,
  saveRESTRequestAs,
  updateRESTRequestOrder,
  updateRESTCollectionOrder,
} from "~/newstore/collections"
import TeamCollectionAdapter from "~/helpers/teams/TeamCollectionAdapter"
import {
  HoppCollection,
  HoppRESTRequest,
  isEqualHoppRESTRequest,
  makeCollection,
  safelyExtractRESTRequest,
  translateToNewRequest,
} from "@hoppscotch/data"
import {
  getDefaultRESTRequest,
  getRESTRequest,
  getRESTSaveContext,
  setRESTRequest,
  setRESTSaveContext,
} from "~/newstore/RESTSession"
import { cloneDeep } from "lodash-es"
import { GQLError } from "~/helpers/backend/GQLClient"
import {
  createNewRootCollection,
  createChildCollection,
  renameCollection,
  deleteCollection,
  importJSONToTeam,
  moveRESTTeamCollection,
  updateOrderRESTTeamCollection,
} from "~/helpers/backend/mutations/TeamCollection"
import {
  updateTeamRequest,
  createRequestInCollection,
  deleteTeamRequest,
  moveRESTTeamRequest,
  updateOrderRESTTeamRequest,
} from "~/helpers/backend/mutations/TeamRequest"
import { TeamCollection } from "~/helpers/teams/TeamCollection"
import { Collection as NodeCollection } from "./MyCollections.vue"
import {
  getCompleteCollectionTree,
  getTeamCollectionJSON,
  teamCollToHoppRESTColl,
} from "~/helpers/backend/helpers"
import { HoppRequestSaveContext } from "~/helpers/types/HoppRequestSaveContext"
import * as E from "fp-ts/Either"
import { platform } from "~/platform"
import { createCollectionGists } from "~/helpers/gist"
import { workspaceStatus$ } from "~/newstore/workspace"
import IconListEnd from "~icons/lucide/list-end"

const t = useI18n()
const toast = useToast()

const props = defineProps({
  saveRequest: {
    type: Boolean,
    default: false,
    required: false,
  },
  picked: {
    type: Object as PropType<Picked | null>,
    default: null,
    required: false,
  },
})

const emit = defineEmits<{
  (event: "select", payload: Picked | null): void
  (event: "update-team", team: SelectedTeam): void
  (event: "update-collection-type", type: CollectionType["type"]): void
}>()

type SelectedTeam = GetMyTeamsQuery["myTeams"][number] | undefined

type CollectionType =
  | {
      type: "team-collections"
      selectedTeam: SelectedTeam
    }
  | { type: "my-collections"; selectedTeam: undefined }

const collectionsType = ref<CollectionType>({
  type: "my-collections",
  selectedTeam: undefined,
})

// Collection Data
const editingCollection = ref<
  HoppCollection<HoppRESTRequest> | TeamCollection | null
>(null)
const editingCollectionName = ref<string | null>(null)
const editingCollectionIndex = ref<number | null>(null)
const editingCollectionID = ref<string | null>(null)
const editingFolder = ref<
  HoppCollection<HoppRESTRequest> | TeamCollection | null
>(null)
const editingFolderName = ref<string | null>(null)
const editingFolderPath = ref<string | null>(null)
const editingRequest = ref<HoppRESTRequest | null>(null)
const editingRequestIndex = ref<number | null>(null)
const editingRequestID = ref<string | null>(null)

const confirmModalTitle = ref<string | null>(null)

const filterTexts = ref("")

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)
const myCollections = useReadonlyStream(restCollections$, [], "deep")

// Draging
const draggingToRoot = ref(false)
const collectionMoveLoading = ref<string[]>([])
const requestMoveLoading = ref<string[]>([])

// Export - Import refs
const collectionJSON = ref("")
const exportingTeamCollections = ref(false)
const creatingGistCollection = ref(false)
const importingMyCollections = ref(false)

// Confirm Change to request modal
const confirmChangeToRequest = ref(false)
const showSaveRequestModal = ref(false)
const clickedRequest = reactive({
  folderPath: "" as string | undefined,
  requestIndex: null as string | null,
  request: null as HoppRESTRequest | null,
})

// TeamList-Adapter
const teamListAdapter = new TeamListAdapter(true)
const myTeams = useReadonlyStream(teamListAdapter.teamList$, null)
const REMEMBERED_TEAM_ID = useLocalState("REMEMBERED_TEAM_ID")
const teamListFetched = ref(false)

// Team Collection Adapter
const teamCollectionAdapter = new TeamCollectionAdapter(null)
const teamCollectionList = useReadonlyStream(
  teamCollectionAdapter.collections$,
  []
)
const teamLoadingCollections = useReadonlyStream(
  teamCollectionAdapter.loadingCollections$,
  []
)

watch(
  () => myTeams.value,
  (newTeams) => {
    if (newTeams && !teamListFetched.value) {
      teamListFetched.value = true
      if (REMEMBERED_TEAM_ID.value && currentUser.value) {
        const team = newTeams.find((t) => t.id === REMEMBERED_TEAM_ID.value)
        if (team) updateSelectedTeam(team)
      }
    }
  }
)

watch(
  () => collectionsType.value.selectedTeam,
  (newTeam) => {
    if (newTeam) {
      teamCollectionAdapter.changeTeamID(newTeam.id)
    }
  }
)

const switchToMyCollections = () => {
  collectionsType.value.type = "my-collections"
  collectionsType.value.selectedTeam = undefined
  teamCollectionAdapter.changeTeamID(null)
}

const expandTeamCollection = (collectionID: string) => {
  teamCollectionAdapter.expandCollection(collectionID)
}

const updateSelectedTeam = (team: SelectedTeam) => {
  if (team) {
    collectionsType.value.type = "team-collections"
    collectionsType.value.selectedTeam = team
    REMEMBERED_TEAM_ID.value = team.id
    emit("update-team", team)
    emit("update-collection-type", "team-collections")
  }
}

onLoggedIn(() => {
  !teamListAdapter.isInitialized && teamListAdapter.initialize()
})

const workspace = useReadonlyStream(workspaceStatus$, { type: "personal" })

// Used to switch collection type and team when user switch workspace in the global workspace switcher
// Check if there is a teamID in the workspace, if yes, switch to team collection and select the team
// If there is no teamID, switch to my environment
watch(
  () => workspace.value.teamID,
  (teamID) => {
    if (!teamID) {
      switchToMyCollections()
    } else if (teamID) {
      const team = myTeams.value?.find((t) => t.id === teamID)
      if (team) updateSelectedTeam(team)
    }
  }
)

// Switch to my-collections and reset the team collection when user logout
watch(
  () => currentUser.value,
  (user) => {
    if (!user) {
      switchToMyCollections()
    }
  }
)

const hasTeamWriteAccess = computed(() => {
  if (!collectionsType.value.selectedTeam) return false

  if (
    collectionsType.value.type === "team-collections" &&
    collectionsType.value.selectedTeam.myRole !== "VIEWER"
  )
    return true
  else return false
})

const filteredCollections = computed(() => {
  const collections =
    collectionsType.value.type === "my-collections" ? myCollections.value : []

  if (filterTexts.value === "") return collections

  if (collectionsType.value.type === "team-collections") return []

  const filterText = filterTexts.value.toLowerCase()
  const filteredCollections = []

  const isMatch = (text: string) => text.toLowerCase().includes(filterText)

  for (const collection of collections) {
    const filteredRequests = []
    const filteredFolders = []
    for (const request of collection.requests) {
      if (isMatch(request.name)) filteredRequests.push(request)
    }
    for (const folder of collection.folders) {
      if (isMatch(folder.name)) filteredFolders.push(folder)
      const filteredFolderRequests = []
      for (const request of folder.requests) {
        if (isMatch(request.name)) filteredFolderRequests.push(request)
      }
      if (filteredFolderRequests.length > 0) {
        const filteredFolder = Object.assign({}, folder)
        filteredFolder.requests = filteredFolderRequests
        filteredFolders.push(filteredFolder)
      }
    }

    if (
      filteredRequests.length + filteredFolders.length > 0 ||
      isMatch(collection.name)
    ) {
      const filteredCollection = Object.assign({}, collection)
      filteredCollection.requests = filteredRequests
      filteredCollection.folders = filteredFolders
      filteredCollections.push(filteredCollection)
    }
  }

  return filteredCollections
})

const isSelected = computed(() => {
  return ({
    collectionIndex,
    folderPath,
    requestIndex,
    collectionID,
    folderID,
    requestID,
  }: {
    collectionIndex?: number | undefined
    folderPath?: string | undefined
    requestIndex?: number | undefined
    collectionID?: string | undefined
    folderID?: string | undefined
    requestID?: string | undefined
  }) => {
    if (collectionIndex !== undefined) {
      return (
        props.picked &&
        props.picked.pickedType === "my-collection" &&
        props.picked.collectionIndex === collectionIndex
      )
    } else if (requestIndex !== undefined && folderPath !== undefined) {
      return (
        props.picked &&
        props.picked.pickedType === "my-request" &&
        props.picked.folderPath === folderPath &&
        props.picked.requestIndex === requestIndex
      )
    } else if (folderPath !== undefined) {
      return (
        props.picked &&
        props.picked.pickedType === "my-folder" &&
        props.picked.folderPath === folderPath
      )
    } else if (collectionID !== undefined) {
      return (
        props.picked &&
        props.picked.pickedType === "teams-collection" &&
        props.picked.collectionID === collectionID
      )
    } else if (requestID !== undefined) {
      return (
        props.picked &&
        props.picked.pickedType === "teams-request" &&
        props.picked.requestID === requestID
      )
    } else if (folderID !== undefined) {
      return (
        props.picked &&
        props.picked.pickedType === "teams-folder" &&
        props.picked.folderID === folderID
      )
    }
  }
})

const modalLoadingState = ref(false)
const exportLoading = ref(false)
const duplicateLoading = ref(false)

const showModalAdd = ref(false)
const showModalAddRequest = ref(false)
const showModalAddFolder = ref(false)
const showModalEditCollection = ref(false)
const showModalEditFolder = ref(false)
const showModalEditRequest = ref(false)
const showModalImportExport = ref(false)
const showConfirmModal = ref(false)
const showTeamModalAdd = ref(false)

const displayModalAdd = (show: boolean) => {
  showModalAdd.value = show

  if (!show) resetSelectedData()
}

const displayModalAddRequest = (show: boolean) => {
  showModalAddRequest.value = show

  if (!show) resetSelectedData()
}

const displayModalAddFolder = (show: boolean) => {
  showModalAddFolder.value = show

  if (!show) resetSelectedData()
}

const displayModalEditCollection = (show: boolean) => {
  showModalEditCollection.value = show

  if (!show) resetSelectedData()
}

const displayModalEditFolder = (show: boolean) => {
  showModalEditFolder.value = show

  if (!show) resetSelectedData()
}

const displayModalEditRequest = (show: boolean) => {
  showModalEditRequest.value = show

  if (!show) resetSelectedData()
}

const displayModalImportExport = (show: boolean) => {
  showModalImportExport.value = show

  if (!show) resetSelectedData()
}

const displayConfirmModal = (show: boolean) => {
  showConfirmModal.value = show

  if (!show) resetSelectedData()
}

const displayTeamModalAdd = (show: boolean) => {
  showTeamModalAdd.value = show

  teamListAdapter.fetchList()
}

const addNewRootCollection = (name: string) => {
  if (collectionsType.value.type === "my-collections") {
    addRESTCollection(
      makeCollection({
        name,
        folders: [],
        requests: [],
      })
    )

    displayModalAdd(false)
  } else if (hasTeamWriteAccess.value) {
    if (!collectionsType.value.selectedTeam) return
    modalLoadingState.value = true

    pipe(
      createNewRootCollection(name, collectionsType.value.selectedTeam.id),
      TE.match(
        (err: GQLError<string>) => {
          toast.error(`${getErrorMessage(err)}`)
          modalLoadingState.value = false
        },
        () => {
          modalLoadingState.value = false
          toast.success(t("collection.created"))
          displayModalAdd(false)
        }
      )
    )()
  }
}

const addRequest = (payload: {
  path: string
  folder: HoppCollection<HoppRESTRequest> | TeamCollection
}) => {
  const { path, folder } = payload
  editingFolder.value = folder
  editingFolderPath.value = path
  displayModalAddRequest(true)
}

const onAddRequest = (requestName: string) => {
  const newRequest = {
    ...cloneDeep(getRESTRequest()),
    name: requestName,
  }

  if (collectionsType.value.type === "my-collections") {
    const path = editingFolderPath.value
    if (!path) return
    const insertionIndex = saveRESTRequestAs(path, newRequest)

    setRESTRequest(newRequest, {
      originLocation: "user-collection",
      folderPath: path,
      requestIndex: insertionIndex,
    })

    displayModalAddRequest(false)
  } else if (hasTeamWriteAccess.value) {
    const folder = editingFolder.value

    if (!folder || !collectionsType.value.selectedTeam) return
    if (!folder.id) return

    modalLoadingState.value = true

    const data = {
      request: JSON.stringify(newRequest),
      teamID: collectionsType.value.selectedTeam.id,
      title: requestName,
    }

    pipe(
      createRequestInCollection(folder.id, data),
      TE.match(
        (err: GQLError<string>) => {
          toast.error(`${getErrorMessage(err)}`)
          modalLoadingState.value = false
        },
        (result) => {
          const { createRequestInCollection } = result

          setRESTRequest(newRequest, {
            originLocation: "team-collection",
            requestID: createRequestInCollection.id,
            collectionID: createRequestInCollection.collection.id,
            teamID: createRequestInCollection.collection.team.id,
          })
          modalLoadingState.value = false
          displayModalAddRequest(false)
        }
      )
    )()
  }
}

const addFolder = (payload: {
  path: string
  folder: HoppCollection<HoppRESTRequest> | TeamCollection
}) => {
  const { path, folder } = payload
  editingFolder.value = folder
  editingFolderPath.value = path
  displayModalAddFolder(true)
}

const onAddFolder = (folderName: string) => {
  const path = editingFolderPath.value

  if (collectionsType.value.type === "my-collections") {
    if (!path) return
    addRESTFolder(folderName, path)
    displayModalAddFolder(false)
  } else if (hasTeamWriteAccess.value) {
    const folder = editingFolder.value
    if (!folder || !folder.id) return

    modalLoadingState.value = true

    pipe(
      createChildCollection(folderName, folder.id),
      TE.match(
        (err: GQLError<string>) => {
          if (err.error === "team_coll/short_title") {
            toast.error(t("folder.name_length_insufficient"))
          } else {
            toast.error(`${getErrorMessage(err)}`)
          }
          modalLoadingState.value = false
        },
        () => {
          toast.success(t("folder.created"))
          modalLoadingState.value = false
          displayModalAddFolder(false)
        }
      )
    )()
  }
}

const editCollection = (payload: {
  collectionIndex: string
  collection: HoppCollection<HoppRESTRequest> | TeamCollection
}) => {
  const { collectionIndex, collection } = payload
  editingCollection.value = collection
  if (collectionsType.value.type === "my-collections") {
    editingCollectionIndex.value = parseInt(collectionIndex)
    editingCollectionName.value = (
      collection as HoppCollection<HoppRESTRequest>
    ).name
  } else {
    editingCollectionName.value = (collection as TeamCollection).title
  }

  displayModalEditCollection(true)
}

const updateEditingCollection = (newName: string) => {
  if (!editingCollection.value) return

  if (!newName) {
    toast.error(t("collection.invalid_name"))
    return
  }

  if (collectionsType.value.type === "my-collections") {
    const collectionIndex = editingCollectionIndex.value
    if (collectionIndex === null) return

    const collectionUpdated = {
      ...editingCollection.value,
      name: newName,
    }

    editRESTCollection(
      collectionIndex,
      collectionUpdated as NodeCollection["data"]["data"]
    )
    displayModalEditCollection(false)
  } else if (hasTeamWriteAccess.value) {
    if (!editingCollection.value.id) return
    modalLoadingState.value = true

    pipe(
      renameCollection(editingCollection.value.id, newName),
      TE.match(
        (err: GQLError<string>) => {
          toast.error(`${getErrorMessage(err)}`)
          modalLoadingState.value = false
        },
        () => {
          modalLoadingState.value = false
          toast.success(t("collection.renamed"))
          displayModalEditCollection(false)
        }
      )
    )()
  }
}

const editFolder = (payload: {
  folderPath: string | undefined
  folder: HoppCollection<HoppRESTRequest> | TeamCollection
}) => {
  const { folderPath, folder } = payload
  editingFolder.value = folder
  if (collectionsType.value.type === "my-collections" && folderPath) {
    editingFolderPath.value = folderPath
    editingFolderName.value = (folder as HoppCollection<HoppRESTRequest>).name
  } else {
    editingFolderName.value = (folder as TeamCollection).title
  }
  displayModalEditFolder(true)
}

const updateEditingFolder = (newName: string) => {
  if (!editingFolder.value) return

  if (collectionsType.value.type === "my-collections") {
    if (!editingFolderPath.value) return

    editRESTFolder(editingFolderPath.value, {
      ...(editingFolder.value as HoppCollection<HoppRESTRequest>),
      name: newName,
    })
    displayModalEditFolder(false)
  } else if (hasTeamWriteAccess.value) {
    if (!editingFolder.value.id) return
    modalLoadingState.value = true

    /* renameCollection can be used to rename both collections and folders
     since folder is treated as collection in the BE. */
    pipe(
      renameCollection(editingFolder.value.id, newName),
      TE.match(
        (err: GQLError<string>) => {
          if (err.error === "team_coll/short_title") {
            toast.error(t("folder.name_length_insufficient"))
          } else {
            toast.error(`${getErrorMessage(err)}`)
          }
          modalLoadingState.value = false
        },
        () => {
          modalLoadingState.value = false
          toast.success(t("folder.renamed"))
          displayModalEditFolder(false)
        }
      )
    )()
  }
}

const editRequest = (payload: {
  folderPath: string | undefined
  requestIndex: string
  request: HoppRESTRequest
}) => {
  const { folderPath, requestIndex, request } = payload
  editingRequest.value = request
  if (collectionsType.value.type === "my-collections" && folderPath) {
    editingFolderPath.value = folderPath
    editingRequestIndex.value = parseInt(requestIndex)
  } else {
    editingRequestID.value = requestIndex
  }
  displayModalEditRequest(true)
}

const updateEditingRequest = (newName: string) => {
  const request = editingRequest.value
  if (!request) return

  const requestUpdated = {
    ...request,
    name: newName || request.name,
  }

  const saveCtx = getRESTSaveContext()

  if (collectionsType.value.type === "my-collections") {
    const folderPath = editingFolderPath.value
    const requestIndex = editingRequestIndex.value

    if (folderPath === null || requestIndex === null) return

    editRESTRequest(folderPath, requestIndex, requestUpdated)

    if (
      saveCtx &&
      saveCtx.originLocation === "user-collection" &&
      saveCtx.requestIndex === editingRequestIndex.value &&
      saveCtx.folderPath === editingFolderPath.value
    ) {
      setRESTRequest({
        ...getRESTRequest(),
        name: requestUpdated.name,
      })
    }

    displayModalEditRequest(false)
  } else if (hasTeamWriteAccess.value) {
    modalLoadingState.value = true

    const requestID = editingRequestID.value
    const requestName = newName || request.name

    if (!requestID) return

    const data = {
      request: JSON.stringify(requestUpdated),
      title: requestName,
    }

    pipe(
      updateTeamRequest(requestID, data),
      TE.match(
        (err: GQLError<string>) => {
          toast.error(`${getErrorMessage(err)}`)
          modalLoadingState.value = false
        },
        () => {
          modalLoadingState.value = false
          toast.success(t("request.renamed"))
          displayModalEditRequest(false)
        }
      )
    )()

    if (
      saveCtx &&
      saveCtx.originLocation === "team-collection" &&
      saveCtx.requestID === editingRequestID.value
    ) {
      setRESTRequest({
        ...getRESTRequest(),
        name: requestName,
      })
    }
  }
}

const duplicateRequest = (payload: {
  folderPath: string
  request: HoppRESTRequest
}) => {
  const { folderPath, request } = payload
  if (!folderPath) return

  const newRequest = {
    ...cloneDeep(request),
    name: `${request.name} - ${t("action.duplicate")}`,
  }

  if (collectionsType.value.type === "my-collections") {
    saveRESTRequestAs(folderPath, newRequest)
    toast.success(t("request.duplicated"))
  } else if (hasTeamWriteAccess.value) {
    duplicateLoading.value = true

    if (!collectionsType.value.selectedTeam) return

    const data = {
      request: JSON.stringify(newRequest),
      teamID: collectionsType.value.selectedTeam.id,
      title: `${request.name} - ${t("action.duplicate")}`,
    }

    pipe(
      createRequestInCollection(folderPath, data),
      TE.match(
        (err: GQLError<string>) => {
          toast.error(`${getErrorMessage(err)}`)
          duplicateLoading.value = false
        },
        () => {
          duplicateLoading.value = false
          toast.success(t("request.duplicated"))
          displayModalAddRequest(false)
        }
      )
    )()
  }
}

const removeCollection = (id: string) => {
  if (collectionsType.value.type === "my-collections")
    editingCollectionIndex.value = parseInt(id)
  else editingCollectionID.value = id

  confirmModalTitle.value = `${t("confirm.remove_collection")}`
  displayConfirmModal(true)
}

/**
 * Used to delete both collections and folders
 * since folder is treated as collection in the BE.
 * @param collectionID - ID of the collection or folder to be deleted.
 */
const removeTeamCollectionOrFolder = (collectionID: string) => {
  modalLoadingState.value = true

  pipe(
    deleteCollection(collectionID),
    TE.match(
      (err: GQLError<string>) => {
        toast.error(`${getErrorMessage(err)}`)
        modalLoadingState.value = false
      },
      () => {
        modalLoadingState.value = false
        toast.success(t("state.deleted"))
        displayConfirmModal(false)
      }
    )
  )()
}

const onRemoveCollection = () => {
  if (collectionsType.value.type === "my-collections") {
    const collectionIndex = editingCollectionIndex.value

    if (collectionIndex === null) return

    if (
      isSelected.value({
        collectionIndex,
      })
    ) {
      emit("select", null)
    }

    removeRESTCollection(collectionIndex)

    toast.success(t("state.deleted"))
    displayConfirmModal(false)
  } else if (hasTeamWriteAccess.value) {
    const collectionID = editingCollectionID.value

    if (!collectionID) return

    if (
      isSelected.value({
        collectionID,
      })
    ) {
      emit("select", null)
    }

    removeTeamCollectionOrFolder(collectionID)
  }
}

const removeFolder = (id: string) => {
  if (collectionsType.value.type === "my-collections")
    editingFolderPath.value = id
  else editingCollectionID.value = id

  confirmModalTitle.value = `${t("confirm.remove_folder")}`
  displayConfirmModal(true)
}

const onRemoveFolder = () => {
  if (collectionsType.value.type === "my-collections") {
    const folderPath = editingFolderPath.value

    if (!folderPath) return

    if (
      isSelected.value({
        folderPath,
      })
    ) {
      emit("select", null)
    }

    removeRESTFolder(folderPath)

    toast.success(t("state.deleted"))
    displayConfirmModal(false)
  } else if (hasTeamWriteAccess.value) {
    const collectionID = editingCollectionID.value

    if (!collectionID) return

    if (
      isSelected.value({
        collectionID,
      })
    ) {
      emit("select", null)
    }

    removeTeamCollectionOrFolder(collectionID)
  }
}

const removeRequest = (payload: {
  folderPath: string | null
  requestIndex: string
}) => {
  const { folderPath, requestIndex } = payload
  if (collectionsType.value.type === "my-collections" && folderPath) {
    editingFolderPath.value = folderPath
    editingRequestIndex.value = parseInt(requestIndex)
  } else {
    editingRequestID.value = requestIndex
  }
  confirmModalTitle.value = `${t("confirm.remove_request")}`
  displayConfirmModal(true)
}

const onRemoveRequest = () => {
  if (collectionsType.value.type === "my-collections") {
    const folderPath = editingFolderPath.value
    const requestIndex = editingRequestIndex.value

    if (folderPath === null || requestIndex === null) return

    if (
      isSelected.value({
        folderPath,
        requestIndex,
      })
    ) {
      emit("select", null)
    }

    removeRESTRequest(folderPath, requestIndex)

    toast.success(t("state.deleted"))
    displayConfirmModal(false)
  } else if (hasTeamWriteAccess.value) {
    const requestID = editingRequestID.value

    if (!requestID) return

    if (
      isSelected.value({
        requestID,
      })
    ) {
      emit("select", null)
    }

    modalLoadingState.value = true

    pipe(
      deleteTeamRequest(requestID),
      TE.match(
        (err: GQLError<string>) => {
          toast.error(`${getErrorMessage(err)}`)
          modalLoadingState.value = false
        },
        () => {
          modalLoadingState.value = false
          toast.success(t("state.deleted"))
          displayConfirmModal(false)
        }
      )
    )()
  }
}

// The request is picked in the save request as modal
const selectPicked = (payload: Picked | null) => {
  emit("select", payload)
}

// select request change modal functions
const noChangeSetRESTRequest = () => {
  const folderPath = clickedRequest.folderPath
  const requestIndex = clickedRequest.requestIndex
  const request = clickedRequest.request

  let newContext: HoppRequestSaveContext | null = null
  if (collectionsType.value.type === "my-collections") {
    if (!folderPath || !requestIndex || !request) return

    newContext = {
      originLocation: "user-collection",
      requestIndex: parseInt(requestIndex),
      folderPath,
      req: cloneDeep(request),
    }
  } else if (collectionsType.value.type === "team-collections") {
    if (!requestIndex || !request) return
    newContext = {
      originLocation: "team-collection",
      requestID: requestIndex,
      req: cloneDeep(request),
    }
  }
  setRESTRequest(
    cloneDeep(
      safelyExtractRESTRequest(
        translateToNewRequest(request),
        getDefaultRESTRequest()
      )
    ),
    newContext
  )
}

/**
 * This function is called when the user clicks on a request
 * @param selectedRequest The request that the user clicked on emited from the collection tree
 */
const selectRequest = (selectedRequest: {
  request: HoppRESTRequest
  folderPath: string | undefined
  requestIndex: string
  isActive: boolean
}) => {
  const { request, folderPath, requestIndex, isActive } = selectedRequest
  // If the request is already active, then we reset the save context
  if (isActive) {
    setRESTSaveContext(null)
    return
  }

  const currentRESTRequest = getRESTRequest()

  const currentRESTSaveContext = getRESTSaveContext()

  clickedRequest.folderPath = folderPath
  clickedRequest.requestIndex = requestIndex
  clickedRequest.request = request

  // If there is no active context,
  if (!currentRESTSaveContext) {
    // Check if the use is clicking on the same request
    if (isEqualHoppRESTRequest(currentRESTRequest, request)) {
      noChangeSetRESTRequest()
    } else {
      // can show the save change modal here since there is change in the request
      // and the user is clicking on the different request
      // and currently we dont have any active context

      confirmChangeToRequest.value = true
    }
  } else {
    if (isEqualHoppRESTRequest(currentRESTRequest, request)) {
      noChangeSetRESTRequest()
    } else {
      const currentReqWithNoChange = currentRESTSaveContext.req
      // now we compare the current request
      // with the request inside the active context
      if (
        currentReqWithNoChange &&
        isEqualHoppRESTRequest(currentReqWithNoChange, currentRESTRequest)
      ) {
        noChangeSetRESTRequest()
      } else {
        // there is change in the request
        // so we can show the save change modal here
        confirmChangeToRequest.value = true
      }
    }
  }
}

/**
 * This function is called when the user clicks on the save button in the confirm change modal
 * There are two cases
 * 1. There is no active context
 * 2. There is active context
 * In the first case, we can show the save request as modal and user can select the location to save the request
 * In the second case, we can save the request in the same location and update the request
 */
const saveRequestChange = () => {
  const currentRESTSaveContext = getRESTSaveContext()

  if (!currentRESTSaveContext) {
    showSaveRequestModal.value = true
    confirmChangeToRequest.value = false
    return
  }

  const currentRESTRequest = getRESTRequest()

  if (currentRESTSaveContext.originLocation === "user-collection") {
    const folderPath = currentRESTSaveContext.folderPath
    const requestIndex = currentRESTSaveContext.requestIndex

    editRESTRequest(folderPath, requestIndex, currentRESTRequest)

    // after saving the request, we need to change the context
    // to the new request (clicked request)
    noChangeSetRESTRequest()

    toast.success(`${t("request.saved")}`)
    confirmChangeToRequest.value = false
  } else {
    modalLoadingState.value = true

    const requestID = currentRESTSaveContext.requestID

    const data = {
      request: JSON.stringify(currentRESTRequest),
      title: currentRESTRequest.name,
    }

    pipe(
      updateTeamRequest(requestID, data),
      TE.match(
        (err: GQLError<string>) => {
          toast.error(`${getErrorMessage(err)}`)
          confirmChangeToRequest.value = false
          showSaveRequestModal.value = true
          modalLoadingState.value = false
        },
        () => {
          toast.success(`${t("request.saved")}`)
          modalLoadingState.value = false
          confirmChangeToRequest.value = false

          const clickedRequestID = clickedRequest.requestIndex

          if (!clickedRequestID) return

          noChangeSetRESTRequest()
        }
      )
    )()
  }
}

/**
 * This function is called when the user clicks on the
 * don't save button in the confirm change modal
 * This function will change the request to the clicked request
 * without saving the changes
 */
const discardRequestChange = () => {
  noChangeSetRESTRequest()
  confirmChangeToRequest.value = false
}

/**
 * Used to get the index of the request from the path
 * @param path The path of the request
 * @returns The index of the request
 */
const pathToIndex = computed(() => {
  return (path: string) => {
    const pathArr = path.split("/")
    return parseInt(pathArr[pathArr.length - 1])
  }
})

/**
 * This function is called when the user drops the request inside a collection
 * @param payload Object that contains the folder path, request index and the destination collection index
 */
const dropRequest = (payload: {
  folderPath?: string | undefined
  requestIndex: string
  destinationCollectionIndex: string
}) => {
  const { folderPath, requestIndex, destinationCollectionIndex } = payload
  if (!requestIndex || !destinationCollectionIndex) return
  if (collectionsType.value.type === "my-collections" && folderPath) {
    moveRESTRequest(
      folderPath,
      pathToIndex.value(requestIndex),
      destinationCollectionIndex
    )
    toast.success(`${t("request.moved")}`)
    draggingToRoot.value = false
  } else if (hasTeamWriteAccess.value) {
    // add the request index to the loading array
    requestMoveLoading.value.push(requestIndex)

    pipe(
      moveRESTTeamRequest(destinationCollectionIndex, requestIndex),
      TE.match(
        (err: GQLError<string>) => {
          toast.error(`${getErrorMessage(err)}`)
          requestMoveLoading.value.splice(
            requestMoveLoading.value.indexOf(requestIndex),
            1
          )
        },
        () => {
          // remove the request index from the loading array
          requestMoveLoading.value.splice(
            requestMoveLoading.value.indexOf(requestIndex),
            1
          )
          toast.success(`${t("request.moved")}`)
        }
      )
    )()
  }
}

/**
 * This function is called when the user moves the collection
 * to a different collection or folder
 * @param payload - object containing the collection index dragged and the destination collection index
 */
const dropCollection = (payload: {
  collectionIndexDragged: string
  destinationCollectionIndex: string
}) => {
  const { collectionIndexDragged, destinationCollectionIndex } = payload
  if (!collectionIndexDragged || !destinationCollectionIndex) return
  if (collectionIndexDragged === destinationCollectionIndex) return
  if (collectionsType.value.type === "my-collections") {
    moveRESTFolder(collectionIndexDragged, destinationCollectionIndex)
    draggingToRoot.value = false
    toast.success(`${t("collection.moved")}`)
  } else if (hasTeamWriteAccess.value) {
    // add the collection index to the loading array
    collectionMoveLoading.value.push(collectionIndexDragged)
    pipe(
      moveRESTTeamCollection(
        collectionIndexDragged,
        destinationCollectionIndex
      ),
      TE.match(
        (err: GQLError<string>) => {
          toast.error(`${getErrorMessage(err)}`)
          collectionMoveLoading.value.splice(
            collectionMoveLoading.value.indexOf(collectionIndexDragged),
            1
          )
        },
        () => {
          toast.success(`${t("collection.moved")}`)
          // remove the collection index from the loading array
          collectionMoveLoading.value.splice(
            collectionMoveLoading.value.indexOf(collectionIndexDragged),
            1
          )
        }
      )
    )()
  }
}

/**
 * Checks if the collection is already in the root
 * @param id - path of the collection
 * @returns boolean - true if the collection is already in the root
 */
const isAlreadyInRoot = computed(() => {
  return (id: string) => {
    const indexPath = id.split("/").map((i) => parseInt(i))
    return indexPath.length === 1
  }
})

/**
 * This function is called when the user drops the collection
 * to the root
 * @param payload - object containing the collection index dragged
 */
const dropToRoot = ({ dataTransfer }: DragEvent) => {
  if (dataTransfer) {
    const collectionIndexDragged = dataTransfer.getData("collectionIndex")
    if (!collectionIndexDragged) return
    if (collectionsType.value.type === "my-collections") {
      // check if the collection is already in the root
      if (isAlreadyInRoot.value(collectionIndexDragged)) {
        toast.error(`${t("collection.invalid_root_move")}`)
      } else {
        moveRESTFolder(collectionIndexDragged, null)
        toast.success(`${t("collection.moved")}`)
      }

      draggingToRoot.value = false
    } else if (hasTeamWriteAccess.value) {
      // add the collection index to the loading array
      collectionMoveLoading.value.push(collectionIndexDragged)

      // destination collection index is null since we are moving to root
      pipe(
        moveRESTTeamCollection(collectionIndexDragged, null),
        TE.match(
          (err: GQLError<string>) => {
            collectionMoveLoading.value.splice(
              collectionMoveLoading.value.indexOf(collectionIndexDragged),
              1
            )
            toast.error(`${getErrorMessage(err)}`)
          },
          () => {
            // remove the collection index from the loading array
            collectionMoveLoading.value.splice(
              collectionMoveLoading.value.indexOf(collectionIndexDragged),
              1
            )
            toast.success(`${t("collection.moved")}`)
          }
        )
      )()
    }
  }
}

/**
 * Used to check if the request/collection is being moved to the same parent since reorder is only allowed within the same parent
 * @param draggedReq - path index of the dragged request
 * @param destinationReq - path index of the destination request
 * @returns boolean - true if the request is being moved to the same parent
 */
const isSameSameParent = computed(
  () => (draggedReq: string, destinationReq: string) => {
    const draggedReqIndex = draggedReq.split("/").map((i) => parseInt(i))
    const destinationReqIndex = destinationReq
      .split("/")
      .map((i) => parseInt(i))

    // length of 1 means the request is in the root
    if (draggedReqIndex.length === 1 && destinationReqIndex.length === 1) {
      return true
    } else if (
      draggedReqIndex[draggedReqIndex.length - 2] ===
      destinationReqIndex[destinationReqIndex.length - 2]
    ) {
      return true
    } else {
      return false
    }
  }
)

/**
 * This function is called when the user updates the request order in a collection
 * @param payload - object containing the request index dragged and the destination request index
 *  with the destination collection index
 */
const updateRequestOrder = (payload: {
  dragedRequestIndex: string
  destinationRequestIndex: string
  destinationCollectionIndex: string
}) => {
  const {
    dragedRequestIndex,
    destinationRequestIndex,
    destinationCollectionIndex,
  } = payload

  if (
    !dragedRequestIndex ||
    !destinationRequestIndex ||
    !destinationCollectionIndex
  )
    return

  if (dragedRequestIndex === destinationRequestIndex) return

  if (collectionsType.value.type === "my-collections") {
    if (!isSameSameParent.value(dragedRequestIndex, destinationRequestIndex)) {
      toast.error(`${t("collection.different_parent")}`)
    } else {
      updateRESTRequestOrder(
        pathToIndex.value(dragedRequestIndex),
        pathToIndex.value(destinationRequestIndex),
        destinationCollectionIndex
      )
      toast.success(`${t("request.order_changed")}`)
    }
  } else if (hasTeamWriteAccess.value) {
    // add the request index to the loading array
    requestMoveLoading.value.push(dragedRequestIndex)

    pipe(
      updateOrderRESTTeamRequest(
        dragedRequestIndex,
        destinationRequestIndex,
        destinationCollectionIndex
      ),
      TE.match(
        (err: GQLError<string>) => {
          toast.error(`${getErrorMessage(err)}`)
          requestMoveLoading.value.splice(
            requestMoveLoading.value.indexOf(dragedRequestIndex),
            1
          )
        },
        () => {
          toast.success(`${t("request.order_changed")}`)

          // remove the request index from the loading array
          requestMoveLoading.value.splice(
            requestMoveLoading.value.indexOf(dragedRequestIndex),
            1
          )
        }
      )
    )()
  }
}

/**
 * This function is called when the user updates the collection or folder order
 * @param payload - object containing the collection index dragged and the destination collection index
 */
const updateCollectionOrder = (payload: {
  dragedCollectionIndex: string
  destinationCollectionIndex: string
}) => {
  const { dragedCollectionIndex, destinationCollectionIndex } = payload
  if (!dragedCollectionIndex || !destinationCollectionIndex) return
  if (dragedCollectionIndex === destinationCollectionIndex) return

  if (collectionsType.value.type === "my-collections") {
    if (
      !isSameSameParent.value(dragedCollectionIndex, destinationCollectionIndex)
    ) {
      toast.error(`${t("collection.different_parent")}`)
    } else {
      updateRESTCollectionOrder(
        dragedCollectionIndex,
        destinationCollectionIndex
      )
      toast.success(`${t("collection.order_changed")}`)
    }
  } else if (hasTeamWriteAccess.value) {
    collectionMoveLoading.value.push(dragedCollectionIndex)
    pipe(
      updateOrderRESTTeamCollection(
        dragedCollectionIndex,
        destinationCollectionIndex
      ),
      TE.match(
        (err: GQLError<string>) => {
          toast.error(`${getErrorMessage(err)}`)
          collectionMoveLoading.value.splice(
            collectionMoveLoading.value.indexOf(dragedCollectionIndex),
            1
          )
        },
        () => {
          toast.success(`${t("collection.order_changed")}`)
          collectionMoveLoading.value.splice(
            collectionMoveLoading.value.indexOf(dragedCollectionIndex),
            1
          )
        }
      )
    )()
  }
}
// Import - Export Collection functions
/**
 * Export the whole my collection or specific team collection to JSON
 */
const getJSONCollection = async () => {
  if (collectionsType.value.type === "my-collections") {
    collectionJSON.value = JSON.stringify(myCollections.value, null, 2)
  } else {
    if (!collectionsType.value.selectedTeam) return
    exportingTeamCollections.value = true
    pipe(
      await getTeamCollectionJSON(collectionsType.value.selectedTeam.id),
      E.match(
        (err) => {
          toast.error(`${getErrorMessage(err)}`)
          exportingTeamCollections.value = false
        },
        (result) => {
          const { exportCollectionsToJSON } = result
          collectionJSON.value = exportCollectionsToJSON
          exportingTeamCollections.value = false
        }
      )
    )
  }

  return collectionJSON.value
}

/**
 * Create a downloadable file from a collection and prompts the user to download it.
 * @param collectionJSON - JSON string of the collection
 * @param name - Name of the collection set as the file name
 */
const initializeDownloadCollection = (
  collectionJSON: string,
  name: string | null
) => {
  const file = new Blob([collectionJSON], { type: "application/json" })
  const a = document.createElement("a")
  const url = URL.createObjectURL(file)
  a.href = url

  if (name) {
    a.download = `${name}.json`
  } else {
    a.download = `${url.split("/").pop()!.split("#")[0].split("?")[0]}.json`
  }

  document.body.appendChild(a)
  a.click()
  toast.success(t("state.download_started").toString())
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 1000)
}

/**
 * Export a specific collection or folder
 * Triggered by the export button in the tippy menu
 * @param collection - Collection or folder to be exported
 */
const exportData = async (
  collection: HoppCollection<HoppRESTRequest> | TeamCollection
) => {
  if (collectionsType.value.type === "my-collections") {
    const collectionJSON = JSON.stringify(collection)

    const name = (collection as HoppCollection<HoppRESTRequest>).name

    initializeDownloadCollection(collectionJSON, name)
  } else {
    if (!collection.id) return
    exportLoading.value = true

    pipe(
      getCompleteCollectionTree(collection.id),
      TE.match(
        (err: GQLError<string>) => {
          toast.error(`${getErrorMessage(err)}`)
          exportLoading.value = false
          return
        },
        (coll) => {
          const hoppColl = teamCollToHoppRESTColl(coll)
          const collectionJSONString = JSON.stringify(hoppColl)

          initializeDownloadCollection(collectionJSONString, hoppColl.name)
          exportLoading.value = false
        }
      )
    )()
  }
}

const exportJSONCollection = async () => {
  await getJSONCollection()

  initializeDownloadCollection(collectionJSON.value, null)
}

const createCollectionGist = async () => {
  if (!currentUser.value || !currentUser.value.accessToken) {
    toast.error(t("profile.no_permission").toString())
    return
  }

  creatingGistCollection.value = true
  await getJSONCollection()

  pipe(
    createCollectionGists(collectionJSON.value, currentUser.value.accessToken),
    TE.match(
      (err) => {
        toast.error(t("error.something_went_wrong").toString())
        console.error(err)
        creatingGistCollection.value = false
      },
      (result) => {
        toast.success(t("export.gist_created").toString())
        creatingGistCollection.value = false
        window.open(result.data.html_url)
      }
    )
  )()
}

const importToTeams = async (collection: HoppCollection<HoppRESTRequest>[]) => {
  if (!hasTeamWriteAccess.value) {
    toast.error(t("team.no_access").toString())
    return
  }

  if (!collectionsType.value.selectedTeam) return

  importingMyCollections.value = true

  pipe(
    importJSONToTeam(
      JSON.stringify(collection),
      collectionsType.value.selectedTeam.id
    ),
    TE.match(
      (err: GQLError<string>) => {
        toast.error(`${getErrorMessage(err)}`)
        importingMyCollections.value = false
      },
      () => {
        importingMyCollections.value = false
        displayModalImportExport(false)
      }
    )
  )()
}

const resolveConfirmModal = (title: string | null) => {
  if (title === `${t("confirm.remove_collection")}`) onRemoveCollection()
  else if (title === `${t("confirm.remove_request")}`) onRemoveRequest()
  else if (title === `${t("confirm.remove_folder")}`) onRemoveFolder()
  else {
    console.error(
      `Confirm modal title ${title} is not handled by the component`
    )
    toast.error(t("error.something_went_wrong"))
    displayConfirmModal(false)
  }
}

const resetSelectedData = () => {
  editingCollection.value = null
  editingCollectionIndex.value = null
  editingCollectionID.value = null
  editingFolder.value = null
  editingFolderPath.value = null
  editingRequest.value = null
  editingRequestIndex.value = null
  editingRequestID.value = null
  confirmModalTitle.value = null
}

const getErrorMessage = (err: GQLError<string>) => {
  console.error(err)
  if (err.type === "network_error") {
    return t("error.network_error")
  } else {
    switch (err.error) {
      case "team_coll/short_title":
        return t("collection.name_length_insufficient")
      case "team/invalid_coll_id":
      case "bug/team_coll/no_coll_id":
      case "team_req/invalid_target_id":
        return t("team.invalid_coll_id")
      case "team/not_required_role":
        return t("profile.no_permission")
      case "team_req/not_required_role":
        return t("profile.no_permission")
      case "Forbidden resource":
        return t("profile.no_permission")
      case "team_req/not_found":
        return t("team.no_request_found")
      case "bug/team_req/no_req_id":
        return t("team.no_request_found")
      case "team/collection_is_parent_coll":
        return t("team.parent_coll_move")
      case "team/target_and_destination_collection_are_same":
        return t("team.same_target_destination")
      case "team/target_collection_is_already_root_collection":
        return t("collection.invalid_root_move")
      case "team_req/requests_not_from_same_collection":
        return t("request.different_collection")
      case "team/team_collections_have_different_parents":
        return t("collection.different_parent")
      default:
        return t("error.something_went_wrong")
    }
  }
}
</script>
