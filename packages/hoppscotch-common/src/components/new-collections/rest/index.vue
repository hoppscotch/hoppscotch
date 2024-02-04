<template>
  <div class="flex flex-1 flex-col">
    <div
      class="sticky z-10 flex flex-1 justify-between border-b border-dividerLight bg-primary"
      :style="'top: var(--upper-primary-sticky-fold)'"
    >
      <HoppButtonSecondary
        :icon="IconPlus"
        :label="t('add.new')"
        class="!rounded-none"
        @click="showModalAdd = true"
      />
      <span class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/documentation/features/collections"
          blank
          :title="t('app.wiki')"
          :icon="IconHelpCircle"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconImport"
          :title="t('modal.import_export')"
          @click="onImportExportClick"
        />
      </span>
    </div>

    <div class="flex flex-1 flex-col">
      <HoppSmartTree :adapter="treeAdapter">
        <template #content="{ node, toggleChildren, isOpen }">
          <!-- TODO: Implement -->
          <NewCollectionsRestCollection
            v-if="node.data.type === 'collection'"
            :collection="node.data.value"
            :is-open="isOpen"
            @add-request="addRequest"
            @add-folder="addFolder"
            @remove-collection="removeFolder"
            @toggle-children="toggleChildren"
          />
          <NewCollectionsRestRequest
            v-else-if="node.data.type === 'request'"
            :request="node.data.value"
            @duplicate-request="duplicateRequest"
            @edit-request="editRequest"
            @remove-request="removeRequest(node.data.value.requestID)"
            @select-request="selectRequest"
          />
          <div v-else @click="toggleChildren">
            {{ node.data.value }}
          </div>
        </template>
        <template #emptyNode>
          <!-- TODO: Implement -->
          <div>Empty Node!</div>
        </template>
      </HoppSmartTree>
    </div>

    <CollectionsAdd
      :show="showModalAdd"
      :loading-state="modalLoadingState"
      @submit="addNewRootCollection"
      @hide-modal="showModalAdd = false"
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
    <CollectionsEditRequest
      v-model="editingRequestName"
      :show="showModalEditRequest"
      :loading-state="modalLoadingState"
      @submit="onEditRequest"
      @hide-modal="displayModalEditRequest(false)"
    />

    <HoppSmartConfirmModal
      :show="showConfirmModal"
      :title="confirmModalTitle"
      :loading-state="modalLoadingState"
      @hide-modal="showConfirmModal = false"
      @resolve="resolveConfirmModal"
    />
  </div>
</template>

<script setup lang="ts">
import * as E from "fp-ts/lib/Either"

import { useService } from "dioc/vue"
import { markRaw, ref } from "vue"

import { useI18n } from "~/composables/i18n"
import { useToast } from "~/composables/toast"
import { WorkspaceRESTCollectionTreeAdapter } from "~/helpers/adapters/WorkspaceRESTCollectionTreeAdapter"
import { NewWorkspaceService } from "~/services/new-workspace"
import { HandleRef } from "~/services/new-workspace/handle"
import { Workspace } from "~/services/new-workspace/workspace"
import { RESTTabService } from "~/services/tab/rest"
import IconImport from "~icons/lucide/folder-down"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconPlus from "~icons/lucide/plus"
import {
  resolveSaveContextOnCollectionReorder,
  getFoldersByPath,
} from "~/helpers/collection/collection"
import {
  navigateToFolderWithIndexPath,
  restCollectionStore,
  removeRESTFolder,
  restCollections$,
} from "~/newstore/collections"
import { useReadonlyStream } from "~/composables/stream"
import { cloneDeep } from "lodash-es"
import { HoppRESTRequest } from "@hoppscotch/data"

const t = useI18n()
const toast = useToast()
const tabs = useService(RESTTabService)

const props = defineProps<{
  workspaceHandle: HandleRef<Workspace>
}>()

defineEmits<{
  (e: "display-modal-add"): void
  (e: "display-modal-import-export"): void
}>()

const workspaceService = useService(NewWorkspaceService)
const treeAdapter = markRaw(
  new WorkspaceRESTCollectionTreeAdapter(
    props.workspaceHandle,
    workspaceService
  )
)

const modalLoadingState = ref(false)

const showModalAdd = ref(false)
const showModalAddRequest = ref(false)
const showModalAddFolder = ref(false)
const showModalEditRequest = ref(false)
const showConfirmModal = ref(false)

const editingFolderPath = ref<string | null>(null)
const editingRequest = ref<HoppRESTRequest | null>(null)
const editingRequestName = ref("")
const editingRequestIndex = ref<number | null>(null)

const confirmModalTitle = ref<string | null>(null)

const myCollections = useReadonlyStream(restCollections$, [], "deep")

const displayModalAddRequest = (show: boolean) => {
  showModalAddRequest.value = show

  if (!show) resetSelectedData()
}

const displayModalAddFolder = (show: boolean) => {
  showModalAddFolder.value = show

  if (!show) resetSelectedData()
}

const displayModalEditRequest = (show: boolean) => {
  showModalEditRequest.value = show

  if (!show) resetSelectedData()
}

const displayConfirmModal = (show: boolean) => {
  showConfirmModal.value = show

  if (!show) resetSelectedData()
}

const addNewRootCollection = async (name: string) => {
  modalLoadingState.value = true

  const result = await workspaceService.createRESTRootCollection(
    props.workspaceHandle,
    name
  )

  if (E.isLeft(result)) {
    // TODO: Error Handling
    return
  }

  // Workspace invalidated
  if (result.right.value.type === "invalid") {
    // TODO: Error Handling
    return
  }

  modalLoadingState.value = false
  showModalAdd.value = false
}

const addRequest = (payload: { path: string }) => {
  const { path } = payload
  editingFolderPath.value = path
  displayModalAddRequest(true)
}

const onAddRequest = async (requestName: string) => {
  const path = editingFolderPath.value
  if (!path) return

  const collHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    path
  )

  if (E.isLeft(collHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collHandle = collHandleResult.right

  if (collHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const result = await workspaceService.createRESTRequest(
    collHandle,
    requestName,
    path
  )

  if (E.isLeft(result)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  if (result.right.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  displayModalAddRequest(false)
}

const addFolder = (payload: { path: string }) => {
  const { path } = payload
  editingFolderPath.value = path
  displayModalAddFolder(true)
}

const onAddFolder = async (folderName: string) => {
  const path = editingFolderPath.value

  if (!path) return

  const collHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    path
  )

  if (E.isLeft(collHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collHandle = collHandleResult.right

  if (collHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const result = await workspaceService.createRESTChildCollection(
    collHandle,
    folderName,
    path
  )

  if (E.isLeft(result)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  if (result.right.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  displayModalAddFolder(false)
}

const removeFolder = (payload: { path: string }) => {
  const { path } = payload
  editingFolderPath.value = path

  confirmModalTitle.value = `${t("confirm.remove_folder")}`
  displayConfirmModal(true)
}

const onRemoveFolder = () => {
  const path = editingFolderPath.value

  if (!path) return

  const folderToRemove = path
    ? navigateToFolderWithIndexPath(
        restCollectionStore.value.state,
        path.split("/").map((i) => parseInt(i))
      )
    : undefined

  removeRESTFolder(path, folderToRemove ? folderToRemove.id : undefined)

  const parentFolder = path.split("/").slice(0, -1).join("/") // remove last folder to get parent folder
  resolveSaveContextOnCollectionReorder({
    lastIndex: pathToLastIndex(path),
    newIndex: -1,
    folderPath: parentFolder,
    length: getFoldersByPath(myCollections.value, parentFolder).length,
  })

  toast.success(t("state.deleted"))
  displayConfirmModal(false)
}

const removeRequest = (requestIndex: string) => {
  const folderPath = requestIndex.slice(0, -2)
  const requestID = requestIndex[requestIndex.length - 1]

  editingFolderPath.value = folderPath
  editingRequestIndex.value = parseInt(requestID)

  confirmModalTitle.value = `${t("confirm.remove_request")}`
  displayConfirmModal(true)
}

const onRemoveRequest = async () => {
  const path = editingFolderPath.value
  const requestIndex = editingRequestIndex.value

  if (path === null || requestIndex === null) return

  const collHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    path
  )

  if (E.isLeft(collHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collHandle = collHandleResult.right

  if (collHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const result = await workspaceService.removeRESTRequest(
    collHandle,
    path,
    requestIndex
  )

  if (E.isLeft(result)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  if (result.right.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  toast.success(t("state.deleted"))
  displayConfirmModal(false)
}

const selectRequest = async (payload: {
  requestPath: string
  request: HoppRESTRequest
}) => {
  const { requestPath, request } = payload

  const collPath = requestPath.slice(0, -2)
  const requestIndex = requestPath[requestPath.length - 1]

  const collHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    collPath
  )

  if (E.isLeft(collHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collHandle = collHandleResult.right

  if (collHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const result = await workspaceService.selectRESTRequest(
    collHandle,
    collPath,
    requestIndex,
    request
  )

  if (E.isLeft(result)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  if (result.right.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }
}

const duplicateRequest = async (payload: {
  requestPath: string
  request: HoppRESTRequest
}) => {
  const { requestPath, request } = payload

  const collPath = requestPath.slice(0, -2)

  const collHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    collPath
  )

  if (E.isLeft(collHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collHandle = collHandleResult.right

  if (collHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const newRequest = {
    ...cloneDeep(request),
    name: `${request.name} - ${t("action.duplicate")}`,
  }

  const result = await workspaceService.duplicateRESTRequest(
    collHandle,
    collPath,
    newRequest
  )

  if (E.isLeft(result)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  if (result.right.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  toast.success(t("request.duplicated"))
}

const editRequest = (payload: {
  requestPath: string
  request: HoppRESTRequest
}) => {
  const { requestPath, request } = payload
  const collPath = requestPath.slice(0, -2)
  const requestIndex = requestPath[requestPath.length - 1]

  editingRequest.value = request
  editingRequestName.value = request.name ?? ""
  editingFolderPath.value = collPath
  editingRequestIndex.value = parseInt(requestIndex)

  displayModalEditRequest(true)
}

const onEditRequest = async (newReqName: string) => {
  const collPath = editingFolderPath.value
  const requestIndex = editingRequestIndex.value
  const request = editingRequest.value

  if (collPath === null || requestIndex === null || !request) {
    return
  }

  const collHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    collPath
  )

  if (E.isLeft(collHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collHandle = collHandleResult.right

  if (collHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const updatedRequest = {
    ...request,
    name: newReqName || request.name,
  }

  const result = await workspaceService.editRESTRequest(
    collHandle,
    collPath,
    requestIndex,
    updatedRequest
  )

  if (E.isLeft(result)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  if (result.right.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  displayModalEditRequest(false)
  toast.success(t("request.renamed"))
}

function onImportExportClick() {
  // TODO: Implement
}

const resolveConfirmModal = (title: string | null) => {
  if (title === `${t("confirm.remove_collection")}`) {
    // onRemoveCollection()
  } else if (title === `${t("confirm.remove_request")}`) {
    onRemoveRequest()
  } else if (title === `${t("confirm.remove_folder")}`) {
    onRemoveFolder()
  } else {
    console.error(
      `Confirm modal title ${title} is not handled by the component`
    )
    toast.error(t("error.something_went_wrong"))
    displayConfirmModal(false)
  }
}

const resetSelectedData = () => {
  editingFolderPath.value = null
}

/**
 * Used to get the index of the request from the path
 * @param path The path of the request
 * @returns The index of the request
 */
const pathToLastIndex = (path: string) => {
  const pathArr = path.split("/")
  return parseInt(pathArr[pathArr.length - 1])
}
</script>
