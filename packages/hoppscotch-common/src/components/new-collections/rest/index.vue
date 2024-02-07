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
          @click="() => {}"
        />
      </span>
    </div>

    <div class="flex flex-1 flex-col">
      <HoppSmartTree :adapter="treeAdapter">
        <template #content="{ node, toggleChildren, isOpen }">
          <!-- TODO: Implement -->
          <NewCollectionsRestCollection
            v-if="node.data.type === 'collection'"
            :collection-view="node.data.value"
            :is-open="isOpen"
            @add-request="addRequest"
            @add-child-collection="addChildCollection"
            @edit-root-collection="editRootCollection"
            @edit-collection-properties="editCollectionProperties"
            @edit-child-collection="editChildCollection"
            @remove-root-collection="removeRootCollection"
            @remove-child-collection="removeChildCollection"
            @toggle-children="toggleChildren"
          />
          <NewCollectionsRestRequest
            v-else-if="node.data.type === 'request'"
            :request-view="node.data.value"
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
      :show="showModalAddChildColl"
      :loading-state="modalLoadingState"
      @add-folder="onAddChildCollection"
      @hide-modal="displayModalAddChildColl(false)"
    />
    <CollectionsEdit
      :show="showModalEditRootColl"
      :editing-collection-name="editingRootCollName ?? ''"
      :loading-state="modalLoadingState"
      @hide-modal="displayModalEditCollection(false)"
      @submit="onEditRootCollection"
    />
    <CollectionsEditFolder
      :show="showModalEditChildColl"
      :editing-folder-name="editingChildCollName ?? ''"
      :loading-state="modalLoadingState"
      @submit="onEditChildCollection"
      @hide-modal="displayModalEditChildCollection(false)"
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

    <!-- TODO: Remove the `emitWithFullCollection` prop after porting all usages of the below component -->
    <CollectionsProperties
      :show="showModalEditProperties"
      :editing-properties="editingProperties"
      :emit-with-full-collection="false"
      @hide-modal="displayModalEditProperties(false)"
      @set-collection-properties="setCollectionProperties"
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
  cascadeParentCollectionForHeaderAuth,
  saveRESTRequestAs,
} from "~/newstore/collections"
import { cloneDeep } from "lodash-es"
import { HoppCollection, HoppRESTAuth, HoppRESTRequest } from "@hoppscotch/data"
import { TeamCollection } from "~/helpers/backend/graphql"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"

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
const showModalAddChildColl = ref(false)
const showModalEditRootColl = ref(false)
const showModalEditChildColl = ref(false)
const showModalEditRequest = ref(false)
const showModalEditProperties = ref(false)
const showConfirmModal = ref(false)

const editingCollIndexPath = ref<string>("")
const editingChildCollIndexPath = ref<string>("")
const editingRootCollName = ref<string>("")
const editingChildCollName = ref<string>("")
const editingRequestName = ref<string>("")
const editingRequestIndexPath = ref<string>("")

const editingProperties = ref<{
  collection: Omit<HoppCollection, "v"> | TeamCollection | null
  isRootCollection: boolean
  path: string
  inheritedProperties?: HoppInheritedProperty
}>({
  collection: null,
  isRootCollection: false,
  path: "",
  inheritedProperties: undefined,
})

const confirmModalTitle = ref<string | null>(null)

const displayModalAddRequest = (show: boolean) => {
  showModalAddRequest.value = show

  if (!show) resetSelectedData()
}

const displayModalAddChildColl = (show: boolean) => {
  showModalAddChildColl.value = show

  if (!show) resetSelectedData()
}

const displayModalEditCollection = (show: boolean) => {
  showModalEditRootColl.value = show

  if (!show) resetSelectedData()
}

const displayModalEditChildCollection = (show: boolean) => {
  showModalEditChildColl.value = show

  if (!show) resetSelectedData()
}

const displayModalEditRequest = (show: boolean) => {
  showModalEditRequest.value = show

  if (!show) resetSelectedData()
}

const displayModalEditProperties = (show: boolean) => {
  showModalEditProperties.value = show

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

const removeRootCollection = (collPathIndex: string) => {
  editingCollIndexPath.value = collPathIndex

  confirmModalTitle.value = `${t("confirm.remove_collection")}`
  displayConfirmModal(true)
}

const onRemoveRootCollection = async () => {
  const collIndexPath = editingCollIndexPath.value

  const collHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    collIndexPath
  )

  if (E.isLeft(collHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collHandle = collHandleResult.right

  if (collHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED | INVALID_COLLECTION_HANDLE
    return
  }

  const result = await workspaceService.removeRESTRootCollection(collHandle)

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  if (result.right.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  toast.success(t("state.deleted"))
  displayConfirmModal(false)
}

const addRequest = (requestPathIndex: string) => {
  editingCollIndexPath.value = requestPathIndex
  displayModalAddRequest(true)
}

const onAddRequest = async (requestName: string) => {
  const parentCollIndexPath = editingCollIndexPath.value

  const collHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    parentCollIndexPath
  )

  if (E.isLeft(collHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collHandle = collHandleResult.right

  if (collHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED | INVALID_COLLECTION_HANDLE
    return
  }

  const result = await workspaceService.createRESTRequest(
    collHandle,
    requestName
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

const addChildCollection = (parentCollIndexPath: string) => {
  editingCollIndexPath.value = parentCollIndexPath
  displayModalAddChildColl(true)
}

const onAddChildCollection = async (childCollName: string) => {
  const parentCollIndexPath = editingCollIndexPath.value

  const collHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    parentCollIndexPath
  )

  if (E.isLeft(collHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collHandle = collHandleResult.right

  if (collHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED | INVALID_COLLECTION_HANDLE
    return
  }

  const result = await workspaceService.createRESTChildCollection(
    collHandle,
    childCollName
  )

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  if (result.right.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  displayModalAddChildColl(false)
}

const editRootCollection = (payload: {
  collIndexPath: string
  collectionName: string
}) => {
  const { collIndexPath, collectionName } = payload

  editingCollIndexPath.value = collIndexPath
  editingRootCollName.value = collectionName

  displayModalEditCollection(true)
}

const onEditRootCollection = async (newCollectionName: string) => {
  const collID = editingCollIndexPath.value

  const collHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    collID
  )

  if (E.isLeft(collHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collHandle = collHandleResult.right

  if (collHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED | INVALID_COLLECTION_HANDLE
    return
  }

  const result = await workspaceService.editRESTRootCollection(
    collHandle,
    newCollectionName
  )

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  if (result.right.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  displayModalEditCollection(false)
  toast.success(t("collection.renamed"))
}

const editChildCollection = (payload: {
  collIndexPath: string
  collectionName: string
}) => {
  const { collIndexPath, collectionName } = payload

  editingChildCollIndexPath.value = collIndexPath
  editingChildCollName.value = collectionName

  displayModalEditChildCollection(true)
}

const onEditChildCollection = async (newCollectionName: string) => {
  const collID = editingChildCollIndexPath.value

  const collHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    collID
  )

  if (E.isLeft(collHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collHandle = collHandleResult.right

  if (collHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED | INVALID_COLLECTION_HANDLE
    return
  }

  const result = await workspaceService.editRESTChildCollection(
    collHandle,
    newCollectionName
  )

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  if (result.right.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  displayModalEditChildCollection(false)
  toast.success(t("collection.renamed"))
}

const removeChildCollection = (parentCollIndexPath: string) => {
  editingCollIndexPath.value = parentCollIndexPath

  confirmModalTitle.value = `${t("confirm.remove_folder")}`
  displayConfirmModal(true)
}

const onRemoveChildCollection = async () => {
  const parentCollIndexPath = editingCollIndexPath.value

  const parentCollHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    parentCollIndexPath
  )

  if (E.isLeft(parentCollHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const parentCollHandle = parentCollHandleResult.right

  if (parentCollHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED | INVALID_COLLECTION_HANDLE
    return
  }

  const result =
    await workspaceService.removeRESTChildCollection(parentCollHandle)

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  if (result.right.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  toast.success(t("state.deleted"))
  displayConfirmModal(false)
}

const removeRequest = (requestIndexPath: string) => {
  const collIndexPath = requestIndexPath.split("/").slice(0, -1).join("/")

  editingCollIndexPath.value = collIndexPath
  editingRequestIndexPath.value = requestIndexPath

  confirmModalTitle.value = `${t("confirm.remove_request")}`
  displayConfirmModal(true)
}

const onRemoveRequest = async () => {
  const parentCollIndexPath = editingCollIndexPath.value
  const requestIndexPath = editingRequestIndexPath.value

  const parentCollHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    parentCollIndexPath
  )

  if (E.isLeft(parentCollHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const parentCollHandle = parentCollHandleResult.right

  if (parentCollHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED | INVALID_COLLECTION_HANDLE
    return
  }

  const requestHandleResult = await workspaceService.getRequestHandle(
    parentCollHandle,
    requestIndexPath
  )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const requestHandle = requestHandleResult.right

  if (requestHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED | INVALID_REQUEST_HANDLE
    return
  }

  const result = await workspaceService.removeRESTRequest(requestHandle)

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

const selectRequest = async (requestIndexPath: string) => {
  const collIndexPath = requestIndexPath.split("/").slice(0, -1).join("/")

  const collHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    collIndexPath
  )

  if (E.isLeft(collHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collHandle = collHandleResult.right

  if (collHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED | INVALID_COLLECTION_HANDLE
    return
  }

  const requestHandleResult = await workspaceService.getRequestHandle(
    collHandle,
    requestIndexPath
  )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const requestHandle = requestHandleResult.right

  if (requestHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED | INVALID_REQUEST_HANDLE
    return
  }

  const requestIndex = parseInt(requestIndexPath.split("/").slice(-1)[0])
  const request = requestHandle.value.data.request as HoppRESTRequest

  // If there is a request with this save context, switch into it
  let possibleTab = null

  const { auth, headers } = cascadeParentCollectionForHeaderAuth(
    collIndexPath,
    "rest"
  )
  possibleTab = tabs.getTabRefWithSaveContext({
    originLocation: "user-collection",
    requestIndex,
    folderPath: collIndexPath,
  })
  if (possibleTab) {
    tabs.setActiveTab(possibleTab.value.id)
  } else {
    // If not, open the request in a new tab
    tabs.createNewTab({
      request: cloneDeep(request),
      isDirty: false,
      saveContext: {
        originLocation: "user-collection",
        folderPath: collIndexPath,
        requestIndex,
      },
      inheritedProperties: {
        auth,
        headers,
      },
    })
  }
}

const duplicateRequest = async (requestIndexPath: string) => {
  const collPath = requestIndexPath.split("/").slice(0, -1).join("/")

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
    // WORKSPACE_INVALIDATED | INVALID_COLLECTION_HANDLE
    return
  }

  const requestHandleResult = await workspaceService.getRequestHandle(
    collHandle,
    requestIndexPath
  )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const requestHandle = requestHandleResult.right

  if (requestHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED | INVALID_REQUEST_HANDLE
    return
  }

  const request = requestHandle.value.data.request as HoppRESTRequest

  const newRequest = {
    ...cloneDeep(request),
    name: `${request.name} - ${t("action.duplicate")}`,
  }

  saveRESTRequestAs(collPath, newRequest)

  toast.success(t("request.duplicated"))
}

const editRequest = (payload: {
  requestIndexPath: string
  requestName: string
}) => {
  const { requestIndexPath, requestName } = payload

  const collPath = requestIndexPath.split("/").slice(0, -1).join("/")

  editingCollIndexPath.value = collPath
  editingRequestIndexPath.value = requestIndexPath

  editingRequestName.value = requestName

  displayModalEditRequest(true)
}

const onEditRequest = async (newReqName: string) => {
  const parentCollID = editingCollIndexPath.value
  const requestID = editingRequestIndexPath.value

  const parentCollHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    parentCollID
  )

  if (E.isLeft(parentCollHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const parentCollHandle = parentCollHandleResult.right

  if (parentCollHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED | INVALID_COLLECTION_HANDLE
    return
  }

  const requestHandleResult = await workspaceService.getRequestHandle(
    parentCollHandle,
    requestID
  )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const requestHandle = requestHandleResult.right

  if (requestHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED | INVALID_REQUEST_HANDLE
    return
  }

  const result = await workspaceService.editRESTRequest(
    requestHandle,
    newReqName
  )

  if (E.isLeft(result)) {
    // INVALID_REQUEST_HANDLE
    return
  }

  if (result.right.value.type === "invalid") {
    // REQUEST_INVALIDATED
    return
  }

  displayModalEditRequest(false)
  toast.success(t("request.renamed"))
}

const editCollectionProperties = async (collIndexPath: string) => {
  const parentIndex = collIndexPath.split("/").slice(0, -1).join("/") // remove last folder to get parent folder

  let inheritedProperties = {
    auth: {
      parentID: "",
      parentName: "",
      inheritedAuth: {
        authType: "inherit",
        authActive: true,
      },
    },
    headers: [
      {
        parentID: "",
        parentName: "",
        inheritedHeader: {},
      },
    ],
  } as HoppInheritedProperty

  if (parentIndex) {
    const { auth, headers } = cascadeParentCollectionForHeaderAuth(
      parentIndex,
      "rest"
    )

    inheritedProperties = {
      auth,
      headers,
    }
  }

  const collHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    collIndexPath
  )

  if (E.isLeft(collHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collHandle = collHandleResult.right

  if (collHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED | INVALID_COLLECTION_HANDLE
    return
  }

  const { collection } = collHandle.value.data

  editingProperties.value = {
    collection,
    isRootCollection: isAlreadyInRoot(collIndexPath),
    path: collIndexPath,
    inheritedProperties,
  }

  displayModalEditProperties(true)
}

const setCollectionProperties = async (updatedCollectionProps: {
  auth: HoppRESTAuth
  headers: HoppCollection["headers"]
  collIndexPath: string
}) => {
  const { collIndexPath, auth, headers } = updatedCollectionProps

  const collHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    collIndexPath
  )

  if (E.isLeft(collHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collHandle = collHandleResult.right

  if (collHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED | INVALID_COLLECTION_HANDLE
    return
  }

  const result = await workspaceService.editRESTCollectionProperties(
    collHandle,
    { auth, headers }
  )

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  if (result.right.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  toast.success(t("collection.properties_updated"))

  displayModalEditProperties(false)
}

const resolveConfirmModal = (title: string | null) => {
  if (title === `${t("confirm.remove_collection")}`) {
    onRemoveRootCollection()
  } else if (title === `${t("confirm.remove_request")}`) {
    onRemoveRequest()
  } else if (title === `${t("confirm.remove_folder")}`) {
    onRemoveChildCollection()
  } else {
    console.error(
      `Confirm modal title ${title} is not handled by the component`
    )
    toast.error(t("error.something_went_wrong"))
    displayConfirmModal(false)
  }
}

const resetSelectedData = () => {
  editingCollIndexPath.value = ""
}

/**
 * @param path The path of the collection or request
 * @returns The index of the collection or request
 */
const pathToIndex = (path: string) => {
  const pathArr = path.split("/")
  return pathArr
}

/**
 * Checks if the collection is already in the root
 * @param id - path of the collection
 * @returns boolean - true if the collection is already in the root
 */
const isAlreadyInRoot = (id: string) => {
  const indexPath = pathToIndex(id)
  return indexPath.length === 1
}
</script>
