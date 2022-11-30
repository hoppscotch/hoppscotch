<template>
  <div :class="{ 'rounded border border-divider': saveRequest }">
    <div
      class="sticky z-10 flex flex-col flex-shrink-0 overflow-x-auto border-b rounded-t bg-primary border-dividerLight"
      :style="
        saveRequest ? 'top: calc(-1.35 * var(--font-size-body))' : 'top: 0'
      "
    >
      <div class="flex flex-col border-b border-dividerLight">
        <input
          v-model="filterTexts"
          type="search"
          autocomplete="off"
          :placeholder="t('action.search')"
          class="py-2 pl-4 pr-2 bg-transparent"
          :disabled="collectionsType.type == 'team-collections'"
        />
      </div>
      <CollectionsChooseType
        :collections-type="collectionsType"
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
          :icon="IconPluss"
          :title="t('team.no_access')"
          :label="t('action.new')"
        />
        <ButtonSecondary
          v-else
          :icon="IconPluss"
          :label="t('action.new')"
          class="!rounded-none"
          @click="displayModalAdd(true)"
        />
        <span class="flex">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            to="https://docs.hoppscotch.io/features/collections"
            blank
            :title="t('app.wiki')"
            :icon="IconHelpCircles"
          />
          <ButtonSecondary
            v-if="!saveRequest"
            v-tippy="{ theme: 'tooltip' }"
            :disabled="
              collectionsType.type == 'team-collections' &&
              collectionsType.selectedTeam == undefined
            "
            :icon="IconArchives"
            :title="t('modal.import_export')"
            @click="displayModalImportExport(true)"
          />
        </span>
      </div>
    </div>
    <div class="flex flex-col flex-1">
      <SmartTree
        v-if="collectionsType.type === 'my-collections'"
        :adapter="myAdapter"
      >
        <template #content="{ node, toggleChildren, isOpen }">
          <CollectionsCollection
            v-if="node.data.type === 'collections'"
            :collection="node.data.data.data"
            :collection-index="parseInt(node.id)"
            :save-request="saveRequest"
            :picked="picked"
            :collections-type="collectionsType"
            :is-open="isOpen"
            @select-collection="emit('use-collection', node)"
            @unselect-collection="emit('remove-collection', node)"
            @select="emit('select', $event)"
            @add-request="addRequest(node)"
            @add-folder="addFolder(node)"
            @remove-collection="removeCollection(node)"
            @edit-collection="editCollection(node.data.data, parseInt(node.id))"
            @toggle-children="toggleChildren"
            @export-data="exportData(node)"
          />

          <CollectionsFolder
            v-if="node.data.type === 'folders'"
            :folder="node.data.data.data"
            :is-open="isOpen"
            :folder-path="`${node.id}`"
            :folder-index="lastPathID(node.id)"
            :collection-index="pathToId(node.id)[0]"
            :save-request="saveRequest"
            :collections-type="collectionsType"
            :picked="picked"
            @select-collection="emit('use-collection', node)"
            @unselect-collection="emit('remove-collection', node)"
            @select="emit('select', $event)"
            @add-folder="addFolder(node)"
            @edit-folder="editFolder(node)"
            @add-request="addRequest(node)"
            @remove-folder="removeFolder(node)"
            @toggle-children="toggleChildren"
            @export-data="exportData(node)"
          />
          <CollectionsRequest
            v-if="node.data.type === 'requests'"
            :request="node.data.data.data"
            :request-index="lastPathID(node.id).toString()"
            :collection-index="pathToId(node.id)[0]"
            :folder-index="-1"
            :collections-type="collectionsType"
            :folder-path="node.data.data.parentIndex"
            :save-request="saveRequest"
            :picked="picked"
            @remove-request="removeRequest(node)"
            @duplicate-request="duplicateRequest(node)"
            @edit-request="editRequest(node)"
            @select="$emit('select', $event)"
          />
        </template>
        <template #emptyNode="{ node }">
          <div v-if="node === null">
            <div
              class="flex flex-col items-center justify-center p-4 text-secondaryLight"
            >
              <img
                :src="`/images/states/${colorMode.value}/pack.svg`"
                loading="lazy"
                class="inline-flex flex-col object-contain object-center w-16 h-16 mb-4"
                :alt="`${t('empty.collection')}`"
              />
              <span class="pb-4 text-center">
                {{ t("empty.collections") }}
              </span>
              <ButtonSecondary
                :label="t('add.new')"
                filled
                class="mb-4"
                outline
                @click="displayModalAdd(true)"
              />
            </div>
          </div>
          <div
            v-else-if="node.data.type === 'collections'"
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <img
              :src="`/images/states/${colorMode.value}/pack.svg`"
              loading="lazy"
              class="inline-flex flex-col object-contain object-center w-16 h-16 mb-4"
              :alt="`${t('empty.collection')}`"
            />
            <span class="pb-4 text-center">
              {{ t("empty.collections") }}
            </span>
            <ButtonSecondary
              :label="t('add.new')"
              filled
              class="mb-4"
              outline
              @click="displayModalAdd(true)"
            />
          </div>
          <div
            v-else-if="node.data.type === 'folders'"
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <img
              :src="`/images/states/${colorMode.value}/pack.svg`"
              loading="lazy"
              class="inline-flex flex-col object-contain object-center w-16 h-16 mb-4"
              :alt="`${t('empty.folder')}`"
            />
            <span class="text-center">
              {{ t("empty.folder") }}
            </span>
          </div>
          <div
            v-if="
              filterTexts.length !== 0 &&
              filteredCollections.length === 0 &&
              node === null
            "
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <icon-lucide-search class="pb-2 opacity-75 svg-icons" />
            <span class="my-2 text-center">
              {{ t("state.nothing_found") }} "{{ filterTexts }}"
            </span>
          </div>
        </template>
      </SmartTree>
      <SmartTree v-else :adapter="teamAdapter">
        <template #content="{ node, toggleChildren, isOpen }">
          <CollectionsCollection
            v-if="node.data.type === 'collections'"
            :collection="node.data.data.data"
            :collection-index="node.id"
            :save-request="saveRequest"
            :picked="picked"
            :collections-type="collectionsType"
            :export-loading="exportLoading"
            @select-collection="emit('use-collection', node)"
            @unselect-collection="emit('remove-collection', node)"
            @select="emit('select', $event)"
            @add-request="addRequest(node)"
            @add-folder="addFolder(node)"
            @remove-collection="removeCollection(node)"
            @edit-collection="editCollection(node.data.data, parseInt(node.id))"
            @toggle-children="toggleChildren"
            @export-data="exportData(node)"
          />

          <CollectionsFolder
            v-if="node.data.type === 'folders'"
            :folder="node.data.data.data"
            :is-open="isOpen"
            :collections-type="collectionsType"
            :folder-path="`${node.id}`"
            :picked="picked"
            :save-request="saveRequest"
            :export-loading="exportLoading"
            @select-collection="emit('use-collection', node)"
            @unselect-collection="emit('remove-collection', node)"
            @select="emit('select', $event)"
            @add-folder="addFolder(node)"
            @edit-folder="editFolder(node)"
            @add-request="addRequest(node)"
            @remove-folder="removeFolder(node)"
            @toggle-children="toggleChildren"
            @export-data="exportData(node)"
          />
          <CollectionsRequest
            v-if="node.data.type === 'requests'"
            :request="node.data.data.data.request"
            :request-index="node.id"
            :collection-index="pathToId(node.id)[0]"
            :folder-index="-1"
            :collections-type="collectionsType"
            :folder-path="node.data.data.parentIndex"
            :save-request="saveRequest"
            :picked="picked"
            @remove-request="removeRequest(node)"
            @duplicate-request="duplicateRequest(node)"
            @edit-request="editRequest(node)"
            @select="$emit('select', $event)"
          />
        </template>
        <template #emptyNode="{ node }">
          <div v-if="node === null">
            <div
              class="flex flex-col items-center justify-center p-4 text-secondaryLight"
            >
              <img
                :src="`/images/states/${colorMode.value}/pack.svg`"
                loading="lazy"
                class="inline-flex flex-col object-contain object-center w-16 h-16 mb-4"
                :alt="`${t('empty.collection')}`"
              />
              <span class="pb-4 text-center">
                {{ t("empty.collections") }}
              </span>
              <ButtonSecondary
                v-if="
                  collectionsType.type == 'team-collections' &&
                  (collectionsType.selectedTeam == undefined ||
                    collectionsType.selectedTeam.myRole == 'VIEWER')
                "
                v-tippy="{ theme: 'tooltip' }"
                :title="t('team.no_access')"
                :label="t('add.new')"
                class="mb-4"
                filled
                outline
              />
              <ButtonSecondary
                v-else
                :label="t('add.new')"
                filled
                class="mb-4"
                outline
                @click="displayModalAdd(true)"
              />
            </div>
          </div>
          <div
            v-else-if="node.data.type === 'collections'"
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <img
              :src="`/images/states/${colorMode.value}/pack.svg`"
              loading="lazy"
              class="inline-flex flex-col object-contain object-center w-16 h-16 mb-4"
              :alt="`${t('empty.collection')}`"
            />
            <span class="pb-4 text-center">
              {{ t("empty.collections") }}
            </span>
            <ButtonSecondary
              v-if="
                collectionsType.type == 'team-collections' &&
                (collectionsType.selectedTeam == undefined ||
                  collectionsType.selectedTeam.myRole == 'VIEWER')
              "
              v-tippy="{ theme: 'tooltip' }"
              :title="t('team.no_access')"
              :label="t('add.new')"
              class="mb-4"
              filled
              outline
            />
            <ButtonSecondary
              v-else
              :label="t('add.new')"
              filled
              class="mb-4"
              outline
              @click="displayModalAdd(true)"
            />
          </div>
          <div
            v-else-if="node.data.type === 'folders'"
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <img
              :src="`/images/states/${colorMode.value}/pack.svg`"
              loading="lazy"
              class="inline-flex flex-col object-contain object-center w-16 h-16 mb-4"
              :alt="`${t('empty.folder')}`"
            />
            <span class="text-center">
              {{ t("empty.folder") }}
            </span>
          </div>
        </template>
      </SmartTree>
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
    <CollectionsEditRequest
      :show="showModalEditRequest"
      :editing-request-name="editingRequest ? editingRequest.name : ''"
      :loading-state="modalLoadingState"
      @submit="updateEditingRequest"
      @hide-modal="displayModalEditRequest(false)"
    />
    <CollectionsImportExport
      :show="showModalImportExport"
      :collections-type="collectionsType"
      @hide-modal="displayModalImportExport(false)"
      @update-team-collections="updateTeamCollections"
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
import IconArchive from "~icons/lucide/archive"
import IconPlus from "~icons/lucide/plus"
import IconHelpCircle from "~icons/lucide/help-circle"
import { cloneDeep } from "lodash-es"
import { markRaw, PropType, Ref, watch } from "vue"
import {
  HoppCollection,
  HoppRESTRequest,
  makeCollection,
} from "@hoppscotch/data"
import { useColorMode } from "@composables/theming"
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
import {
  setRESTRequest,
  getRESTRequest,
  getRESTSaveContext,
} from "~/newstore/RESTSession"
import { useReadonlyStream } from "@composables/stream"
import { runMutation } from "~/helpers/backend/GQLClient"
import {
  CreateChildCollectionDocument,
  CreateNewRootCollectionDocument,
  CreateRequestInCollectionDocument,
  DeleteCollectionDocument,
  DeleteRequestDocument,
  RenameCollectionDocument,
  Team,
  UpdateRequestDocument,
} from "~/helpers/backend/graphql"
import { useToast } from "@composables/toast"
import { useI18n } from "~/composables/i18n"
import { computed, ref } from "vue"
import {
  ChildrenResult,
  SmartTreeAdapter,
  TreeNode,
} from "~/helpers/tree/SmartTreeAdapter"
import { TeamCollection } from "~/helpers/teams/TeamCollection"
import {
  getCompleteCollectionTree,
  teamCollToHoppRESTColl,
} from "~/helpers/backend/helpers"
import { TeamRequest } from "~/helpers/teams/TeamRequest"

const t = useI18n()
const colorMode = useColorMode()
const toast = useToast()

type Picked =
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

const props = defineProps({
  saveRequest: {
    type: Boolean,
    required: true,
  },
  picked: {
    type: Object as PropType<Picked>,
    required: true,
  },
})

const emit = defineEmits<{
  (e: "update-collection", payload: any): void
  (e: "update-team-collections"): void
  (e: "update-coll-type", payload: any): void
  (e: "select-request", payload: any): void
  (e: "select", payload: any): void
  (e: "use-collection", payload: any): void
  (e: "remove-collection", payload: any): void
}>()

const currentUser = useReadonlyStream(currentUser$, null)
const myCollections = useReadonlyStream(restCollections$, [], "deep")

const IconArchives = markRaw(IconArchive)
const IconHelpCircles = markRaw(IconHelpCircle)
const IconPluss = markRaw(IconPlus)
const filterTexts = ref("")

const editingCollection = ref()
const editingCollectionIndex = ref()
const editingCollectionID = ref()
const editingFolder = ref()
// const editingFolderName = ref()
const editingFolderIndex = ref()
const editingFolderPath = ref()
const editingRequest = ref()
const editingRequestIndex = ref()

const showModalAdd = ref(false)
const showModalEdit = ref(false)
const showModalAddRequest = ref(false)
const showModalAddFolder = ref(false)
const showModalEditFolder = ref(false)
const showModalEditRequest = ref(false)
const showModalImportExport = ref(false)
const showConfirmModal = ref(false)

const confirmModalTitle = ref("")

const modalLoadingState = ref(false)

const exportLoading = ref(false)

type CollectionType =
  | {
      type: "team-collections"
      selectedTeam: Team
    }
  | { type: "my-collections"; selectedTeam: undefined }

const collectionsType = ref<CollectionType>({
  type: "my-collections",
  selectedTeam: undefined,
})

const pathToId = computed(() => {
  return (path: string) => {
    return path.split("/").map((x) => parseInt(x))
  }
})

const lastPathID = computed(() => {
  return (path: string) => {
    const pathArr = path.split("/")
    return parseInt(pathArr[pathArr.length - 1])
  }
})

const teamCollectionAdapter = new TeamCollectionAdapter(null)
const teamCollectionList = useReadonlyStream(
  teamCollectionAdapter.collections$,
  []
)
const teamLoadingCollections = teamCollectionAdapter.loadingCollections$

const filteredCollections = computed(() => {
  const collections =
    collectionsType.value.type === "my-collections" ? myCollections.value : []

  if (!filterTexts.value) {
    return collections
  }

  if (collectionsType.value.type === "team-collections") {
    return []
  }

  const filterText = filterTexts.value.toLowerCase()
  const filteredCollections = []

  for (const collection of collections) {
    const filteredRequests = []
    const filteredFolders = []
    for (const request of collection.requests) {
      if (request.name.toLowerCase().includes(filterText))
        filteredRequests.push(request)
    }
    for (const folder of collection.folders) {
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
})

watch(
  () => collectionsType.value.type,
  () => {
    emit("update-collection", collectionsType.value.type)
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

watch(
  () => currentUser.value,
  (newUser) => {
    if (!newUser) {
      updateCollectionType("my-collections")
    }
  }
)

const updateSelectedTeam = (newSelectedTeam: Team | undefined) => {
  collectionsType.value.selectedTeam = newSelectedTeam
  emit("update-coll-type", collectionsType)
}

const updateCollectionType = (
  newCollectionType: "my-collections" | "team-collections"
) => {
  collectionsType.value.type = newCollectionType
  emit("update-coll-type", collectionsType)
}

const displayModalAdd = (show: boolean) => {
  showModalAdd.value = show
}

const displayModalEdit = (show: boolean) => {
  showModalEdit.value = show
}

const displayModalAddRequest = (show: boolean) => {
  showModalAddRequest.value = show
}

const displayModalAddFolder = (show: boolean) => {
  showModalAddFolder.value = show
}

const displayModalEditFolder = (show: boolean) => {
  showModalEditFolder.value = show
}

const displayModalEditRequest = (show: boolean) => {
  showModalEditRequest.value = show
}

const displayModalImportExport = (show: boolean) => {
  showModalImportExport.value = show
}

const displayConfirmModal = (show: boolean) => {
  showConfirmModal.value = show

  if (!show) resetSelectedData()
}

// Intented to be called by the CollectionAdd modal submit event
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
  } else if (
    collectionsType.value.type === "team-collections" &&
    collectionsType.value.selectedTeam.myRole !== "VIEWER"
  ) {
    modalLoadingState.value = true
    runMutation(CreateNewRootCollectionDocument, {
      title: name,
      teamID: collectionsType.value.selectedTeam.id,
    })().then((result) => {
      modalLoadingState.value = false
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

// Intented to be called by CollectionEdit modal submit event
const updateEditingCollection = (newName: string) => {
  if (!newName) {
    toast.error(t("collection.invalid_name"))
    return
  }
  if (collectionsType.value.type === "my-collections") {
    const collectionUpdated = {
      ...editingCollection.value,
      name: newName,
    }

    editRESTCollection(editingCollectionIndex.value, collectionUpdated)
    displayModalEdit(false)
  } else if (
    collectionsType.value.type === "team-collections" &&
    collectionsType.value.selectedTeam.myRole !== "VIEWER"
  ) {
    modalLoadingState.value = true
    runMutation(RenameCollectionDocument, {
      collectionID: editingCollection.value.id,
      newTitle: newName,
    })().then((result) => {
      modalLoadingState.value = false

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

// Intended to be called by CollectionEditFolder modal submit event
const updateEditingFolder = (newName: string) => {
  if (collectionsType.value.type === "my-collections") {
    editRESTFolder(editingFolderPath.value, {
      ...editingFolder.value,
      name: newName,
    })
    displayModalEditFolder(false)
  } else if (
    collectionsType.value.type === "team-collections" &&
    collectionsType.value.selectedTeam.myRole !== "VIEWER"
  ) {
    modalLoadingState.value = true
    runMutation(RenameCollectionDocument, {
      collectionID: editingFolder.value.id,
      newTitle: newName,
    })().then((result) => {
      modalLoadingState.value = false

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

// Intented to by called by CollectionsEditRequest modal submit event
const updateEditingRequest = (requestUpdateData: { name: string }) => {
  const saveCtx = getRESTSaveContext()
  const requestUpdated = {
    ...editingRequest.value,
    name: requestUpdateData.name || editingRequest.value.name,
  }

  if (collectionsType.value.type === "my-collections") {
    // Update REST Session with the updated state
    if (
      saveCtx &&
      saveCtx.originLocation === "user-collection" &&
      saveCtx.requestIndex === editingRequestIndex.value &&
      saveCtx.folderPath === editingFolderPath.value
    ) {
      setRESTRequest({
        ...getRESTRequest(),
        name: requestUpdateData.name,
      })
    }

    editRESTRequest(
      editingFolderPath.value,
      editingRequestIndex.value,
      requestUpdated
    )
    displayModalEditRequest(false)
  } else if (
    collectionsType.value.type === "team-collections" &&
    collectionsType.value.selectedTeam.myRole !== "VIEWER"
  ) {
    modalLoadingState.value = true

    const requestName =
      requestUpdateData.name || editingRequest.value.request.name

    // Update REST Session with the updated state
    if (
      saveCtx &&
      saveCtx.originLocation === "team-collection" &&
      saveCtx.requestID === editingRequestIndex.value
    ) {
      setRESTRequest({
        ...getRESTRequest(),
        name: requestUpdateData.name,
      })
    }

    runMutation(UpdateRequestDocument, {
      data: {
        request: JSON.stringify(requestUpdated),
        title: requestName,
      },
      requestID: editingRequestIndex.value,
    })().then((result) => {
      modalLoadingState.value = false

      if (E.isLeft(result)) {
        toast.error(t("error.something_went_wrong"))
        console.error(result.left.error)
      } else {
        toast.success(t("request.renamed"))
        emit("update-team-collections")
        displayModalEditRequest(false)
      }
    })
  }
}

const editCollection = (
  collection: {
    parentIndex: string
    data: HoppCollection<HoppRESTRequest> | TeamCollection
  },
  collectionIndex: number
) => {
  editingCollection.value = collection.data
  editingCollectionIndex.value = collectionIndex
  displayModalEdit(true)
}

const onAddFolder = ({
  name,
  folder,
  path,
}: {
  name: string
  folder: HoppCollection<HoppRESTRequest> | TeamCollection
  path: string
}) => {
  if (collectionsType.value.type === "my-collections") {
    addRESTFolder(name, path)
    displayModalAddFolder(false)
  } else if (
    collectionsType.value.type === "team-collections" &&
    collectionsType.value.selectedTeam.myRole !== "VIEWER"
  ) {
    if (folder.id) {
      modalLoadingState.value = true
      runMutation(CreateChildCollectionDocument, {
        childTitle: name,
        collectionID: folder.id,
      })().then((result) => {
        modalLoadingState.value = false
        if (E.isLeft(result)) {
          if (result.left.error === "team_coll/short_title")
            toast.error(t("folder.name_length_insufficient"))
          else toast.error(t("error.something_went_wrong"))
          console.error(result.left.error)
        } else {
          toast.success(t("folder.created"))
          displayModalAddFolder(false)
          emit("update-team-collections")
        }
      })
    }
  }
}
const addFolder = (
  payload: TreeNode<{
    type: "folders" | "collections"
    data: {
      parentIndex: string
      data: HoppCollection<HoppRESTRequest> | TeamCollection
    }
  }>
) => {
  const { data, id } = payload
  editingFolder.value = data.data.data
  editingFolderPath.value = id
  displayModalAddFolder(true)
}

const editFolder = (
  payload: TreeNode<{
    type: "folders"
    data: {
      parentIndex: string
      data: HoppCollection<HoppRESTRequest> | TeamCollection
    }
  }>
) => {
  const { data, id } = payload
  editingCollectionIndex.value = pathToId.value(id)[0]
  editingFolder.value = data.data.data
  editingFolderIndex.value = pathToId.value(id)[pathToId.value(id).length - 1]
  editingFolderPath.value = id
  collectionsType.value = collectionsType.value
  displayModalEditFolder(true)
}
const editRequest = (
  payload: TreeNode<{
    type: "requests"
    data: {
      parentIndex: string
      data: HoppRESTRequest | TeamRequest
    }
  }>
) => {
  const { parentIndex, data } = payload.data.data
  editingCollectionIndex.value = pathToId.value(payload.id)[0]
  editingFolderIndex.value =
    pathToId.value(parentIndex)[pathToId.value(parentIndex).length - 1]
  // editingFolderName.value = folderName
  if (collectionsType.value.type === "team-collections") {
    editingRequest.value = data.request
  } else {
    editingRequest.value = data
  }
  if (collectionsType.value.type === "my-collections") {
    editingRequestIndex.value = pathToId.value(payload.id)[
      pathToId.value(payload.id).length - 1
    ]
    emit(
      "select-request",
      pathToId
        .value(payload.id)
        [pathToId.value(payload.id).length - 1].toString()
    )
  } else {
    editingRequestIndex.value = payload.id
    emit("select-request", payload.id)
  }
  editingFolderPath.value = parentIndex

  displayModalEditRequest(true)
}

const resetSelectedData = () => {
  editingCollection.value = undefined
  editingCollectionIndex.value = undefined
  editingCollectionID.value = undefined
  editingFolder.value = undefined
  editingFolderPath.value = undefined
  editingFolderIndex.value = undefined
  editingRequest.value = undefined
  editingRequestIndex.value = undefined

  confirmModalTitle.value = ""
}

// const expandCollection = (collectionID) => {
//   teamCollectionAdapter.expandCollection(collectionID)
// }
const removeCollection = (
  payload: TreeNode<HoppCollection<HoppRESTRequest>>
) => {
  const { id } = payload
  editingCollectionIndex.value = parseInt(id)
  editingCollectionID.value = id
  confirmModalTitle.value = `${t("confirm.remove_collection")}`

  displayConfirmModal(true)
}

const onRemoveCollection = () => {
  const collectionIndex = editingCollectionIndex.value
  const collectionID = editingCollectionID.value

  if (collectionsType.value.type === "my-collections") {
    // Cancel pick if picked collection is deleted
    if (
      props.picked &&
      props.picked.pickedType === "my-collection" &&
      props.picked.collectionIndex === collectionIndex
    ) {
      emit("select", { picked: null })
    }

    removeRESTCollection(collectionIndex)

    toast.success(t("state.deleted"))
    displayConfirmModal(false)
  } else if (collectionsType.value.type === "team-collections") {
    modalLoadingState.value = true

    // Cancel pick if picked collection is deleted
    if (
      props.picked &&
      props.picked.pickedType === "teams-collection" &&
      props.picked.collectionID === collectionID
    ) {
      emit("select", { picked: null })
    }

    if (collectionsType.value.selectedTeam.myRole !== "VIEWER") {
      runMutation(DeleteCollectionDocument, {
        collectionID,
      })().then((result) => {
        modalLoadingState.value = false
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

const removeFolder = (
  payload: TreeNode<{
    type: "folders" | "collections"
    data: {
      parentIndex: string
      data: HoppCollection<HoppRESTRequest> | TeamCollection
    }
  }>
) => {
  const { data, id } = payload
  editingCollectionID.value = id
  editingFolder.value = data.data.data
  editingFolderPath.value = id
  confirmModalTitle.value = `${t("confirm.remove_folder")}`

  displayConfirmModal(true)
}

const onRemoveFolder = () => {
  const folder = editingFolder.value
  const folderPath = editingFolderPath.value

  if (collectionsType.value.type === "my-collections") {
    // Cancel pick if picked folder was deleted
    if (
      props.picked &&
      props.picked.pickedType === "my-folder" &&
      props.picked.folderPath === folderPath
    ) {
      emit("select", { picked: null })
    }
    removeRESTFolder(folderPath)

    toast.success(t("state.deleted"))
    displayConfirmModal(false)
  } else if (collectionsType.value.type === "team-collections") {
    modalLoadingState.value = true

    // Cancel pick if picked collection folder was deleted
    if (
      props.picked &&
      props.picked.pickedType === "teams-folder" &&
      props.picked.folderID === folder.id
    ) {
      emit("select", { picked: null })
    }

    if (collectionsType.value.selectedTeam.myRole !== "VIEWER") {
      runMutation(DeleteCollectionDocument, {
        collectionID: folder.id,
      })().then((result) => {
        modalLoadingState.value = false

        if (E.isLeft(result)) {
          toast.error(`${t("error.something_went_wrong")}`)
          console.error(result.left.error)
        } else {
          toast.success(`${t("state.deleted")}`)
          displayConfirmModal(false)

          //updateTeamCollections()
        }
      })
    }
  }
}
const removeRequest = (
  payload: TreeNode<{
    type: "requests"
    data: {
      parentIndex: string
      data: HoppRESTRequest | TeamRequest
    }
  }>
) => {
  const { id, data } = payload
  if (collectionsType.value.type === "my-collections") {
    editingRequestIndex.value =
      pathToId.value(id)[pathToId.value(id).length - 1]
  } else {
    editingRequestIndex.value = id
  }
  editingFolderPath.value = data.data.parentIndex
  confirmModalTitle.value = `${t("confirm.remove_request")}`

  displayConfirmModal(true)
}

const onRemoveRequest = () => {
  const requestIndex = editingRequestIndex.value
  const folderPath = editingFolderPath.value

  if (collectionsType.value.type === "my-collections") {
    // Cancel pick if the picked item is being deleted
    if (
      props.picked &&
      props.picked.pickedType === "my-request" &&
      props.picked.folderPath === folderPath &&
      props.picked.requestIndex === requestIndex
    ) {
      emit("select", { picked: null })
    }
    removeRESTRequest(folderPath, requestIndex)

    toast.success(t("state.deleted"))
    displayConfirmModal(false)
  } else if (collectionsType.value.type === "team-collections") {
    modalLoadingState.value = true
    // Cancel pick if the picked item is being deleted
    if (
      props.picked &&
      props.picked.pickedType === "teams-request" &&
      props.picked.requestID === requestIndex
    ) {
      emit("select", { picked: null })
    }

    runMutation(DeleteRequestDocument, {
      requestID: requestIndex,
    })().then((result) => {
      modalLoadingState.value = false
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

const addRequest = (
  payload: TreeNode<{
    type: "folders" | "collections"
    data: HoppCollection<HoppRESTRequest>
  }>
) => {
  // TODO: check if the request being worked on
  // is being overwritten (selected or not)
  const { data, id } = payload
  editingFolder.value = data.data
  editingFolderPath.value = id
  displayModalAddRequest(true)
}

const onAddRequest = ({
  name,
  folder,
  path,
}: {
  name: string
  folder: {
    parentIndex: string
    data: HoppCollection<HoppRESTRequest> | TeamCollection
  }
  path: string
}) => {
  const newRequest = {
    ...cloneDeep(getRESTRequest()),
    name,
  }

  if (collectionsType.value.type === "my-collections") {
    const insertionIndex = saveRESTRequestAs(path, newRequest)
    setRESTRequest(newRequest, {
      originLocation: "user-collection",
      folderPath: path,
      requestIndex: insertionIndex,
    })

    displayModalAddRequest(false)
  } else if (
    collectionsType.value.type === "team-collections" &&
    collectionsType.value.selectedTeam.myRole !== "VIEWER"
  ) {
    if (folder.data.id) {
      modalLoadingState.value = true
      runMutation(CreateRequestInCollectionDocument, {
        collectionID: folder.data.id,
        data: {
          request: JSON.stringify(newRequest),
          teamID: collectionsType.value.selectedTeam.id,
          title: name,
        },
      })().then((result) => {
        modalLoadingState.value = false
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
}

const duplicateRequest = (
  payload: TreeNode<{
    type: "requests"
    data: {
      parentIndex: string
      data: HoppRESTRequest | TeamRequest
    }
  }>
) => {
  const { parentIndex, data } = payload.data.data
  if (collectionsType.value.type === "team-collections") {
    const newReq = {
      ...cloneDeep(data.request),
      name: `${data.title} - ${t("action.duplicate")}`,
    }

    runMutation(CreateRequestInCollectionDocument, {
      collectionID: parentIndex,
      data: {
        request: JSON.stringify(newReq),
        teamID: collectionsType.value.selectedTeam.id,
        title: `${data.title} - ${t("action.duplicate")}`,
      },
    })().then((result) => {
      modalLoadingState.value = false
      if (E.isLeft(result)) {
        toast.error(t("error.something_went_wrong"))
        console.error(result.left.error)
      } else {
        toast.success(t("request.duplicated"))
      }
    })
  } else if (collectionsType.value.type === "my-collections") {
    saveRESTRequestAs(parentIndex, {
      ...cloneDeep(data),
      name: `${data.name} - ${t("action.duplicate")}`,
    })
  }
}

const exportData = async (
  payload: TreeNode<{
    type: "collections" | "folders"
    data: {
      parentIndex: string
      data: HoppCollection<HoppRESTRequest> | TeamCollection
    }
  }>
) => {
  const collection = payload.data.data.data
  if (collectionsType.value.type === "my-collections") {
    const collectionJSON = JSON.stringify(collection)

    const file = new Blob([collectionJSON], { type: "application/json" })
    const a = document.createElement("a")
    const url = URL.createObjectURL(file)
    a.href = url

    a.download = `${collection.name}.json`
    document.body.appendChild(a)
    a.click()
    toast.success(t("state.download_started").toString())
    setTimeout(() => {
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }, 1000)
  } else {
    if (collection.id) {
      exportLoading.value = true

      const result = await getCompleteCollectionTree(collection.id)()

      if (E.isLeft(result)) {
        toast.error(t("error.something_went_wrong").toString())
        console.log(result.left)
        exportLoading.value = false

        return
      }

      const hoppColl = teamCollToHoppRESTColl(result.right)

      const collectionJSON = JSON.stringify(hoppColl)

      const file = new Blob([collectionJSON], { type: "application/json" })
      const a = document.createElement("a")
      const url = URL.createObjectURL(file)
      a.href = url

      a.download = `${hoppColl.name}.json`
      document.body.appendChild(a)
      a.click()
      toast.success(t("state.download_started").toString())

      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 1000)

      exportLoading.value = false
    }
  }
}

const resolveConfirmModal = (title: string) => {
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

type Collection = {
  type: "collections"
  data: {
    parentIndex: null
    data: HoppCollection<HoppRESTRequest>
  }
}

type Folder = {
  type: "folders"
  data: {
    parentIndex: string
    data: HoppCollection<HoppRESTRequest>
  }
}

type Requests = {
  type: "requests"
  data: {
    parentIndex: string
    data: HoppRESTRequest
  }
}

type MyCollectionNode = Collection | Folder | Requests

class MyCollectionsAdapter implements SmartTreeAdapter<MyCollectionNode> {
  constructor(public data: Ref<HoppCollection<HoppRESTRequest>[]>) {}

  navigateToFolderWithIndexPath(
    collections: HoppCollection<HoppRESTRequest>[],
    indexPaths: number[]
  ) {
    if (indexPaths.length === 0) return null

    let target = collections[indexPaths.shift() as number]

    while (indexPaths.length > 0)
      target = target.folders[indexPaths.shift() as number]

    return target !== undefined ? target : null
  }

  getChildren(id: string | null): Ref<ChildrenResult<MyCollectionNode>> {
    return computed((): ChildrenResult<MyCollectionNode> => {
      if (id === null) {
        const data = this.data.value.map((item, index) => ({
          id: index.toString(),
          data: {
            type: "collections",
            data: {
              parentIndex: null,
              data: item,
            },
          },
        }))
        return {
          status: "loaded",
          data: data,
        }
      }

      const indexPath = id.split("/").map((x) => parseInt(x))

      const item = this.navigateToFolderWithIndexPath(
        this.data.value,
        indexPath
      )

      if (item) {
        const data = [
          ...item.folders.map((item, index) => ({
            id: `${id}/${index}`,
            data: {
              type: "folders",
              data: {
                parentIndex: id,
                data: item,
              },
            },
          })),
          ...item.requests.map((item, index) => ({
            id: `${id}/${index}`,
            data: {
              type: "requests",
              data: {
                parentIndex: id,
                data: item,
              },
            },
          })),
        ]

        return {
          status: "loaded",
          data: data,
        }
      } else {
        return {
          status: "loaded",
          data: [],
        }
      }
    })
  }
}

type TeamCollections = {
  type: "collections"
  data: {
    parentIndex: null
    data: TeamCollection
  }
}

type TeamFolder = {
  type: "folders"
  data: {
    parentIndex: string
    data: TeamCollection
  }
}

type TeamRequests = {
  type: "requests"
  data: {
    parentIndex: string
    data: TeamRequest
  }
}

type TeamCollectionNode = TeamCollections | TeamFolder | TeamRequests

class TeamCollectionsAdapter implements SmartTreeAdapter<TeamCollectionNode> {
  constructor(public data: Ref<TeamCollection[]>) {}

  findCollInTree(
    tree: TeamCollection[],
    targetID: string
  ): TeamCollection | null {
    for (const coll of tree) {
      // If the direct child matched, then return that
      if (coll.id === targetID) return coll

      // Else run it in the children
      if (coll.children) {
        const result = this.findCollInTree(coll.children, targetID)
        if (result) return result
      }
    }

    // If nothing matched, return null
    return null
  }

  getChildren(id: string | null): Ref<ChildrenResult<TeamCollectionNode>> {
    return computed((): ChildrenResult<TeamCollectionNode> => {
      //TODO: Root collections not reactive
      if (id === null) {
        if (teamLoadingCollections.value.includes("root")) {
          return {
            status: "loading",
          }
        } else {
          const data = this.data.value.map((item) => ({
            id: item.id,
            data: {
              type: "collections",
              data: {
                parentIndex: null,
                data: item,
              },
            },
          }))
          return {
            status: "loaded",
            data: data,
          }
        }
      }

      teamCollectionAdapter.expandCollection(id)

      if (teamLoadingCollections.value.includes(id)) {
        return {
          status: "loading",
        }
      } else {
        const items = this.findCollInTree(this.data.value, id)
        if (items) {
          const data = [
            ...(items.children
              ? items.children.map((item) => ({
                  id: item.id,
                  data: {
                    type: "folders",
                    data: {
                      parentIndex: id,
                      data: item,
                    },
                  },
                }))
              : []),
            ...(items.requests
              ? items.requests.map((item) => ({
                  id: item.id,
                  data: {
                    type: "requests",
                    data: {
                      parentIndex: id,
                      data: item,
                    },
                  },
                }))
              : []),
          ]
          return {
            status: "loaded",
            data: data,
          }
        } else {
          return {
            status: "loaded",
            data: [],
          }
        }
      }
    })
  }
}

const myAdapter: SmartTreeAdapter<MyCollectionNode> = new MyCollectionsAdapter(
  filteredCollections
)

const teamAdapter: SmartTreeAdapter<TeamCollectionNode> =
  new TeamCollectionsAdapter(teamCollectionList)
</script>
