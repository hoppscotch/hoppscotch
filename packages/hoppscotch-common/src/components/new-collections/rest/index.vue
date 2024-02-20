<template>
  <div
    :class="{
      'rounded border border-divider': saveRequest,
      'bg-primaryDark':
        draggingToRoot && currentReorderingStatus.type !== 'request',
    }"
    class="flex-1"
    @drop.prevent="dropToRoot"
    @dragover.prevent="draggingToRoot = true"
    @dragend="draggingToRoot = false"
  >
    <div
      class="sticky z-10 flex flex-shrink-0 flex-col overflow-x-auto border-b border-dividerLight bg-primary"
      :class="{ 'rounded-t': saveRequest }"
      :style="
        saveRequest ? 'top: calc(-1 * var(--line-height-body))' : 'top: 0'
      "
    >
      <WorkspaceCurrent :section="t('tab.collections')" />
      <input
        v-model="searchText"
        type="search"
        autocomplete="off"
        class="flex h-8 w-full bg-transparent p-4 py-2"
        :placeholder="t('action.search')"
      />
    </div>

    <div class="flex flex-1 flex-col">
      <div
        class="sticky z-10 flex flex-1 justify-between border-b border-dividerLight bg-primary"
        :style="
          saveRequest
            ? 'top: calc(var(--upper-primary-sticky-fold) - var(--line-height-body))'
            : 'top: var(--upper-primary-sticky-fold)'
        "
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
            v-if="!saveRequest"
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconImport"
            :title="t('modal.import_export')"
            @click="displayModalImportExport(true)"
          />
        </span>
      </div>

      <div class="flex flex-1 flex-col">
        <HoppSmartTree :adapter="treeAdapter">
          <template
            #content="{ highlightChildren, isOpen, node, toggleChildren }"
          >
            <NewCollectionsRestCollection
              v-if="node.data.type === 'collection'"
              :collection-view="node.data.value"
              :is-open="isOpen"
              :is-selected="
                isSelected(
                  getCollectionIndexPathArgs(node.data.value.collectionID)
                )
              "
              :save-request="saveRequest"
              @add-request="addRequest"
              @add-child-collection="addChildCollection"
              @dragging="
                (isDraging) =>
                  highlightChildren(
                    isDraging ? node.data.value.collectionID : null
                  )
              "
              @drag-event="dragEvent($event, node.data.value.collectionID)"
              @drop-event="dropEvent($event, node.data.value.collectionID)"
              @edit-child-collection="editChildCollection"
              @edit-root-collection="editRootCollection"
              @edit-collection-properties="editCollectionProperties"
              @export-collection="exportCollection"
              @remove-child-collection="removeChildCollection"
              @remove-root-collection="removeRootCollection"
              @select-pick="onSelectPick"
              @toggle-children="
                () => {
                  toggleChildren(),
                    saveRequest &&
                      onSelectPick({
                        pickedType: isAlreadyInRoot(
                          node.data.value.collectionID
                        )
                          ? 'my-collection'
                          : 'my-folder',
                        ...getCollectionIndexPathArgs(
                          node.data.value.collectionID
                        ),
                      })
                }
              "
              @update-collection-order="
                updateCollectionOrder($event, {
                  destinationCollectionIndex: node.data.value.collectionID,
                  destinationCollectionParentIndex:
                    node.data.value.parentCollectionID,
                })
              "
              @update-last-collection-order="
                updateCollectionOrder($event, {
                  destinationCollectionIndex: null,
                  destinationCollectionParentIndex:
                    node.data.value.parentCollectionID,
                })
              "
            />

            <NewCollectionsRestRequest
              v-else-if="node.data.type === 'request'"
              :is-active="isActiveRequest(node.data.value)"
              :is-selected="
                isSelected(getRequestIndexPathArgs(node.data.value.requestID))
              "
              :request-view="node.data.value"
              :save-request="saveRequest"
              @drag-request="
                dragRequest($event, {
                  parentCollectionIndexPath: node.data.value.parentCollectionID,
                  requestIndex: node.data.value.requestID,
                })
              "
              @duplicate-request="duplicateRequest"
              @edit-request="editRequest"
              @remove-request="removeRequest"
              @select-pick="onSelectPick"
              @select-request="selectRequest"
              @share-request="shareRequest"
              @update-request-order="
                updateRequestOrder($event, {
                  parentCollectionIndexPath: node.data.value.parentCollectionID,
                  requestIndex: node.data.value.requestID,
                })
              "
              @update-last-request-order="
                updateRequestOrder($event, {
                  parentCollectionIndexPath: node.data.value.parentCollectionID,
                  requestIndex: null,
                })
              "
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

      <div
        class="py-15 hidden flex-1 flex-col items-center justify-center bg-primaryDark px-4 text-secondaryLight"
        :class="{
          '!flex': draggingToRoot && currentReorderingStatus.type !== 'request',
        }"
      >
        <icon-lucide-list-end class="svg-icons !h-8 !w-8" />
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
        :editing-collection-name="editingRootCollectionName ?? ''"
        :loading-state="modalLoadingState"
        @hide-modal="displayModalEditCollection(false)"
        @submit="onEditRootCollection"
      />
      <CollectionsEditFolder
        :show="showModalEditChildColl"
        :editing-folder-name="editingChildCollectionName ?? ''"
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

      <!-- TODO: Supply `collectionsType` once teams implementation is in place -->
      <!-- Defaults to `my-collections` -->
      <CollectionsImportExport
        v-if="showImportExportModal"
        @hide-modal="displayModalImportExport(false)"
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
  </div>
</template>

<script setup lang="ts">
import * as E from "fp-ts/lib/Either"

import { useService } from "dioc/vue"
import { markRaw, nextTick, ref } from "vue"

import { HoppCollection, HoppRESTAuth, HoppRESTRequest } from "@hoppscotch/data"
import { cloneDeep, isEqual } from "lodash-es"
import { useI18n } from "~/composables/i18n"
import { useReadonlyStream } from "~/composables/stream"
import { useToast } from "~/composables/toast"
import { invokeAction } from "~/helpers/actions"
import { WorkspaceRESTCollectionTreeAdapter } from "~/helpers/adapters/WorkspaceRESTCollectionTreeAdapter"
import { TeamCollection } from "~/helpers/backend/graphql"
import {
  getFoldersByPath,
  resolveSaveContextOnCollectionReorder,
  updateInheritedPropertiesForAffectedRequests,
  updateSaveContextForAffectedRequests,
} from "~/helpers/collection/collection"
import {
  getRequestsByPath,
  resolveSaveContextOnRequestReorder,
} from "~/helpers/collection/request"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import { Picked } from "~/helpers/types/HoppPicked"
import {
  navigateToFolderWithIndexPath,
  restCollections$,
  saveRESTRequestAs,
} from "~/newstore/collections"
import { currentReorderingStatus$ } from "~/newstore/reordering"
import { platform } from "~/platform"
import { NewWorkspaceService } from "~/services/new-workspace"
import { HandleRef } from "~/services/new-workspace/handle"
import { RESTCollectionViewRequest } from "~/services/new-workspace/view"
import { Workspace } from "~/services/new-workspace/workspace"
import { RESTTabService } from "~/services/tab/rest"
import IconImport from "~icons/lucide/folder-down"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconPlus from "~icons/lucide/plus"

const t = useI18n()
const toast = useToast()
const tabs = useService(RESTTabService)

const props = defineProps<{
  workspaceHandle: HandleRef<Workspace>
  picked?: Picked | null
  saveRequest?: boolean
}>()

const emit = defineEmits<{
  (e: "display-modal-add"): void
  (e: "display-modal-import-export"): void
  (event: "select", payload: Picked | null): void
}>()

const workspaceService = useService(NewWorkspaceService)
const restCollectionState = useReadonlyStream(restCollections$, [])

const currentReorderingStatus = useReadonlyStream(currentReorderingStatus$, {
  type: "collection",
  id: "",
  parentID: "",
})

const treeAdapter = markRaw(
  new WorkspaceRESTCollectionTreeAdapter(
    props.workspaceHandle,
    workspaceService
  )
)

const draggingToRoot = ref(false)
const searchText = ref("")

const modalLoadingState = ref(false)

const showModalAdd = ref(false)
const showModalAddRequest = ref(false)
const showModalAddChildColl = ref(false)
const showModalEditRootColl = ref(false)
const showModalEditChildColl = ref(false)
const showModalEditRequest = ref(false)
const showImportExportModal = ref(false)
const showModalEditProperties = ref(false)
const showConfirmModal = ref(false)

const editingCollectionIndexPath = ref<string>("")
const editingRootCollectionName = ref<string>("")
const editingChildCollectionName = ref<string>("")
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

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

const isSelected = ({
  collectionIndex,
  folderPath,
  requestIndex,
}: {
  collectionIndex?: number | undefined
  folderPath?: string | undefined
  requestIndex?: number | undefined
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
  }
}

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

const displayModalImportExport = (show: boolean) => {
  showImportExportModal.value = show

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
    { name }
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

const removeRootCollection = (collectionIndexPath: string) => {
  editingCollectionIndexPath.value = collectionIndexPath

  confirmModalTitle.value = `${t("confirm.remove_collection")}`
  displayConfirmModal(true)
}

const onRemoveRootCollection = async () => {
  const collectionIndexPath = editingCollectionIndexPath.value

  const collectionHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    collectionIndexPath
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  if (collectionHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  if (isSelected({ collectionIndex: parseInt(collectionIndexPath) })) {
    emit("select", null)
  }

  const result = await workspaceService.removeRESTCollection(collectionHandle)

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const activeTabs = tabs.getActiveTabs()

  for (const tab of activeTabs.value) {
    if (
      tab.document.saveContext?.originLocation === "workspace-user-collection"
    ) {
      const { requestID } = tab.document.saveContext

      if (requestID.startsWith(collectionIndexPath)) {
        tab.document.saveContext = null
        tab.document.isDirty = true
      }
    }
  }

  toast.success(t("state.deleted"))
  displayConfirmModal(false)
}

const addRequest = (parentCollectionIndexPath: string) => {
  editingCollectionIndexPath.value = parentCollectionIndexPath
  displayModalAddRequest(true)
}

const onAddRequest = async (requestName: string) => {
  const parentCollectionIndexPath = editingCollectionIndexPath.value

  const collectionHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    parentCollectionIndexPath
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  if (collectionHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const newRequest = {
    ...cloneDeep(tabs.currentActiveTab.value.document.request),
    name: requestName,
  }

  const requestHandleResult = await workspaceService.createRESTRequest(
    collectionHandle,
    newRequest
  )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const requestHandle = requestHandleResult.right

  if (requestHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const cascadingAuthHeadersHandleResult =
    await workspaceService.getRESTCollectionLevelAuthHeadersView(
      collectionHandle
    )

  if (E.isLeft(cascadingAuthHeadersHandleResult)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const cascadingAuthHeadersHandle = cascadingAuthHeadersHandleResult.right

  if (cascadingAuthHeadersHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const { auth, headers } = cascadingAuthHeadersHandle.value.data

  const { collectionID, providerID, requestID, workspaceID } =
    requestHandle.value.data

  tabs.createNewTab({
    request: newRequest,
    isDirty: false,
    saveContext: {
      originLocation: "workspace-user-collection",
      workspaceID,
      providerID,
      collectionID,
      requestID,
    },
    inheritedProperties: {
      auth,
      headers,
    },
  })

  displayModalAddRequest(false)
}

const addChildCollection = (parentCollectionIndexPath: string) => {
  editingCollectionIndexPath.value = parentCollectionIndexPath
  displayModalAddChildColl(true)
}

const onAddChildCollection = async (newChildCollectionName: string) => {
  const parentCollectionIndexPath = editingCollectionIndexPath.value

  const collectionHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    parentCollectionIndexPath
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  if (collectionHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const result = await workspaceService.createRESTChildCollection(
    collectionHandle,
    { name: newChildCollectionName }
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
  collectionIndexPath: string
  collectionName: string
}) => {
  const { collectionIndexPath, collectionName } = payload

  editingCollectionIndexPath.value = collectionIndexPath
  editingRootCollectionName.value = collectionName

  displayModalEditCollection(true)
}

const onEditRootCollection = async (newCollectionName: string) => {
  const collectionIndexPath = editingCollectionIndexPath.value

  const collectionHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    collectionIndexPath
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  if (collectionHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const result = await workspaceService.updateRESTCollection(collectionHandle, {
    name: newCollectionName,
  })

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  displayModalEditCollection(false)
  toast.success(t("collection.renamed"))
}

const editChildCollection = (payload: {
  collectionIndexPath: string
  collectionName: string
}) => {
  const { collectionIndexPath, collectionName } = payload

  editingCollectionIndexPath.value = collectionIndexPath
  editingChildCollectionName.value = collectionName

  displayModalEditChildCollection(true)
}

const onEditChildCollection = async (newChildCollectionName: string) => {
  const collectionIndexPath = editingCollectionIndexPath.value

  const collectionHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    collectionIndexPath
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  if (collectionHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const result = await workspaceService.updateRESTCollection(collectionHandle, {
    name: newChildCollectionName,
  })

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  displayModalEditChildCollection(false)
  toast.success(t("collection.renamed"))
}

const removeChildCollection = (parentCollectionIndexPath: string) => {
  editingCollectionIndexPath.value = parentCollectionIndexPath

  confirmModalTitle.value = `${t("confirm.remove_folder")}`
  displayConfirmModal(true)
}

const onRemoveChildCollection = async () => {
  const parentCollectionIndexPath = editingCollectionIndexPath.value

  const parentCollectionHandleResult =
    await workspaceService.getCollectionHandle(
      props.workspaceHandle,
      parentCollectionIndexPath
    )

  if (E.isLeft(parentCollectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const parentCollectionHandle = parentCollectionHandleResult.right

  if (parentCollectionHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  if (
    isSelected({
      folderPath: parentCollectionIndexPath.split("/").pop(),
    })
  ) {
    emit("select", null)
  }

  const result = await workspaceService.removeRESTCollection(
    parentCollectionHandle
  )

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const activeTabs = tabs.getActiveTabs()

  for (const tab of activeTabs.value) {
    if (
      tab.document.saveContext?.originLocation === "workspace-user-collection"
    ) {
      const { requestID } = tab.document.saveContext

      if (requestID.startsWith(parentCollectionIndexPath)) {
        tab.document.saveContext = null
        tab.document.isDirty = true
      }
    }
  }

  toast.success(t("state.deleted"))
  displayConfirmModal(false)
}

const removeRequest = (requestIndexPath: string) => {
  const collectionIndexPath = requestIndexPath.split("/").slice(0, -1).join("/")

  editingCollectionIndexPath.value = collectionIndexPath
  editingRequestIndexPath.value = requestIndexPath

  confirmModalTitle.value = `${t("confirm.remove_request")}`
  displayConfirmModal(true)
}

const onRemoveRequest = async () => {
  const requestIndexPath = editingRequestIndexPath.value

  const requestHandleResult = await workspaceService.getRequestHandle(
    props.workspaceHandle,
    requestIndexPath
  )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE | INVALID_REQUEST_ID | REQUEST_NOT_FOUND
    return
  }

  const requestHandle = requestHandleResult.right

  if (requestHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const { collectionID, providerID, requestID, workspaceID } =
    requestHandle.value.data

  const possibleTab = tabs.getTabRefWithSaveContext({
    originLocation: "workspace-user-collection",
    workspaceID,
    providerID,
    requestID,
    collectionID,
  })

  if (
    isSelected({
      requestIndex: parseInt(requestIndexPath.split("/").pop() ?? ""),
      folderPath: editingCollectionIndexPath.value,
    })
  ) {
    emit("select", null)
  }

  const result = await workspaceService.removeRESTRequest(requestHandle)

  if (E.isLeft(result)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  // If there is a tab attached to this request, dissociate its state and mark it dirty
  if (possibleTab) {
    possibleTab.value.document.saveContext = null
    possibleTab.value.document.isDirty = true
  }

  toast.success(t("state.deleted"))
  displayConfirmModal(false)
}

const selectRequest = async (requestIndexPath: string) => {
  const collectionIndexPath = requestIndexPath.split("/").slice(0, -1).join("/")
  const requestIndex = requestIndexPath.split("/").slice(-1)[0]

  if (props.saveRequest) {
    return emit("select", {
      pickedType: "my-request",
      folderPath: collectionIndexPath,
      requestIndex: parseInt(requestIndex),
    })
  }

  const collectionHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    collectionIndexPath
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collectionHandle = collectionHandleResult.right

  if (collectionHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED | INVALID_COLLECTION_HANDLE
    return
  }

  const requestHandleResult = await workspaceService.getRequestHandle(
    props.workspaceHandle,
    requestIndexPath
  )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE | INVALID_REQUEST_ID | REQUEST_NOT_FOUND
    return
  }

  const requestHandle = requestHandleResult.right

  if (requestHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const cascadingAuthHeadersHandleResult =
    await workspaceService.getRESTCollectionLevelAuthHeadersView(
      collectionHandle
    )

  if (E.isLeft(cascadingAuthHeadersHandleResult)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const cascadingAuthHeadersHandle = cascadingAuthHeadersHandleResult.right

  if (cascadingAuthHeadersHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const { auth, headers } = cascadingAuthHeadersHandle.value.data

  const { collectionID, providerID, requestID, workspaceID } =
    requestHandle.value.data

  // If there is a request with this save context, switch into it
  const possibleTab = tabs.getTabRefWithSaveContext({
    originLocation: "workspace-user-collection",
    workspaceID,
    providerID,
    collectionID,
    requestID,
  })

  if (possibleTab) {
    tabs.setActiveTab(possibleTab.value.id)
  } else {
    // If not, open the request in a new tab
    tabs.createNewTab({
      request: requestHandle.value.data.request,
      isDirty: false,
      saveContext: {
        originLocation: "workspace-user-collection",
        workspaceID,
        providerID,
        collectionID,
        requestID,
      },
      inheritedProperties: {
        auth,
        headers,
      },
    })
  }
}

const duplicateRequest = async (requestIndexPath: string) => {
  const collectionIndexPath = requestIndexPath.split("/").slice(0, -1).join("/")

  const requestHandleResult = await workspaceService.getRequestHandle(
    props.workspaceHandle,
    requestIndexPath
  )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE | INVALID_REQUEST_ID | REQUEST_NOT_FOUND
    return
  }

  const requestHandle = requestHandleResult.right

  if (requestHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const request = requestHandle.value.data.request as HoppRESTRequest

  const newRequest = {
    ...cloneDeep(request),
    name: `${request.name} - ${t("action.duplicate")}`,
  }

  saveRESTRequestAs(collectionIndexPath, newRequest)

  toast.success(t("request.duplicated"))
}

const editRequest = (payload: {
  requestIndexPath: string
  requestName: string
}) => {
  const { requestIndexPath, requestName } = payload

  const collectionIndexPath = requestIndexPath.split("/").slice(0, -1).join("/")

  editingCollectionIndexPath.value = collectionIndexPath
  editingRequestIndexPath.value = requestIndexPath

  editingRequestName.value = requestName

  displayModalEditRequest(true)
}

const onEditRequest = async (newRequestName: string) => {
  const requestID = editingRequestIndexPath.value

  const requestHandleResult = await workspaceService.getRequestHandle(
    props.workspaceHandle,
    requestID
  )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE | INVALID_REQUEST_ID | REQUEST_NOT_FOUND
    return
  }

  const requestHandle = requestHandleResult.right

  if (requestHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const result = await workspaceService.updateRESTRequest(requestHandle, {
    name: newRequestName,
  })

  if (E.isLeft(result)) {
    // INVALID_REQUEST_HANDLE
    return
  }

  const { collectionID, providerID, workspaceID } = requestHandle.value.data

  const possibleActiveTab = tabs.getTabRefWithSaveContext({
    originLocation: "workspace-user-collection",
    workspaceID,
    providerID,
    collectionID,
    requestID,
  })

  if (possibleActiveTab) {
    possibleActiveTab.value.document.request = {
      ...possibleActiveTab.value.document.request,
      name: newRequestName,
    }
    nextTick(() => {
      possibleActiveTab.value.document.isDirty = false
    })
  }

  displayModalEditRequest(false)
  toast.success(t("request.renamed"))
}

const editCollectionProperties = async (collectionIndexPath: string) => {
  const parentIndex = collectionIndexPath.split("/").slice(0, -1).join("/") // remove last folder to get parent folder

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

  const collectionHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    collectionIndexPath
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  if (collectionHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  if (parentIndex) {
    const cascadingAuthHeadersHandleResult =
      await workspaceService.getRESTCollectionLevelAuthHeadersView(
        collectionHandle
      )

    if (E.isLeft(cascadingAuthHeadersHandleResult)) {
      // INVALID_COLLECTION_HANDLE
      return
    }

    const cascadingAuthHeadersHandle = cascadingAuthHeadersHandleResult.right

    if (cascadingAuthHeadersHandle.value.type === "invalid") {
      // COLLECTION_INVALIDATED
      return
    }

    const { auth, headers } = cascadingAuthHeadersHandle.value.data

    inheritedProperties = {
      auth,
      headers,
    }
  }

  const collection = navigateToFolderWithIndexPath(
    restCollectionState.value,
    collectionIndexPath.split("/").map((id) => parseInt(id))
  )

  editingProperties.value = {
    collection,
    isRootCollection: isAlreadyInRoot(collectionIndexPath),
    path: collectionIndexPath,
    inheritedProperties,
  }

  displayModalEditProperties(true)
}

const setCollectionProperties = async (updatedCollectionProps: {
  auth: HoppRESTAuth
  headers: HoppCollection["headers"]
  collectionIndexPath: string
}) => {
  const { collectionIndexPath, auth, headers } = updatedCollectionProps

  const collectionHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    collectionIndexPath
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  if (collectionHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const result = await workspaceService.updateRESTCollection(collectionHandle, {
    auth,
    headers,
  })

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const cascadingAuthHeadersHandleResult =
    await workspaceService.getRESTCollectionLevelAuthHeadersView(
      collectionHandle
    )

  if (E.isLeft(cascadingAuthHeadersHandleResult)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const cascadingAuthHeadersHandle = cascadingAuthHeadersHandleResult.right

  if (cascadingAuthHeadersHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const { auth: cascadedAuth, headers: cascadedHeaders } =
    cascadingAuthHeadersHandle.value.data

  nextTick(() => {
    updateInheritedPropertiesForAffectedRequests(
      collectionIndexPath,
      {
        auth: cascadedAuth,
        headers: cascadedHeaders,
      },
      "rest"
    )
  })

  toast.success(t("collection.properties_updated"))

  displayModalEditProperties(false)
}

const exportCollection = async (collectionIndexPath: string) => {
  const collectionHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    collectionIndexPath
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  if (collectionHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const collection = navigateToFolderWithIndexPath(
    restCollectionState.value,
    collectionIndexPath.split("/").map((id) => parseInt(id))
  ) as HoppCollection

  const result = await workspaceService.exportRESTCollection(
    collectionHandle,
    collection
  )

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }
}

const dragEvent = (dataTransfer: DataTransfer, collectionIndex: string) => {
  dataTransfer.setData("collectionIndex", collectionIndex)
}

const dragRequest = (
  dataTransfer: DataTransfer,
  {
    parentCollectionIndexPath,
    requestIndex,
  }: { parentCollectionIndexPath: string | null; requestIndex: string }
) => {
  if (!parentCollectionIndexPath) {
    return
  }

  dataTransfer.setData("parentCollectionIndexPath", parentCollectionIndexPath)
  dataTransfer.setData("requestIndex", requestIndex)
}

const dropEvent = async (
  dataTransfer: DataTransfer,
  destinationCollectionIndex: string
) => {
  const parentCollectionIndexPath = dataTransfer.getData(
    "parentCollectionIndexPath"
  )
  const requestIndex = dataTransfer.getData("requestIndex")
  const draggedCollectionIndex = dataTransfer.getData("collectionIndex")

  if (parentCollectionIndexPath && requestIndex) {
    await dropRequest({
      parentCollectionIndexPath,
      requestIndex,
      destinationCollectionIndex,
    })
  } else {
    await dropCollection({
      draggedCollectionIndex,
      destinationCollectionIndex,
    })
  }
}

/**
 * This function is called when the user drops the collection
 * to the root
 * @param payload - object containing the collection index dragged
 */
const dropToRoot = async ({ dataTransfer }: DragEvent) => {
  if (!dataTransfer) {
    return
  }

  const draggedCollectionIndex = dataTransfer.getData("collectionIndex")
  if (!draggedCollectionIndex) {
    return
  }

  // check if the collection is already in the root
  if (isAlreadyInRoot(draggedCollectionIndex)) {
    toast.error(`${t("collection.invalid_root_move")}`)
    draggingToRoot.value = false
    return
  }

  const draggedCollectionHandleResult =
    await workspaceService.getCollectionHandle(
      props.workspaceHandle,
      draggedCollectionIndex
    )

  if (E.isLeft(draggedCollectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const draggedCollectionHandle = draggedCollectionHandleResult.right

  if (draggedCollectionHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const result = await workspaceService.moveRESTCollection(
    draggedCollectionHandle,
    null
  )

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const destinationRootCollectionIndex = (
    restCollectionState.value.length - 1
  ).toString()

  updateSaveContextForAffectedRequests(
    draggedCollectionIndex,
    destinationRootCollectionIndex
  )

  const destinationRootCollectionHandleResult =
    await workspaceService.getCollectionHandle(
      props.workspaceHandle,
      destinationRootCollectionIndex
    )

  if (E.isLeft(destinationRootCollectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const destinationRootCollectionHandle =
    destinationRootCollectionHandleResult.right

  if (destinationRootCollectionHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const cascadingAuthHeadersHandleResult =
    await workspaceService.getRESTCollectionLevelAuthHeadersView(
      destinationRootCollectionHandle
    )

  if (E.isLeft(cascadingAuthHeadersHandleResult)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const cascadingAuthHeadersHandle = cascadingAuthHeadersHandleResult.right

  if (cascadingAuthHeadersHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const { auth, headers } = cascadingAuthHeadersHandle.value.data

  const inheritedProperty = {
    auth,
    headers,
  }

  updateInheritedPropertiesForAffectedRequests(
    destinationRootCollectionIndex,
    inheritedProperty,
    "rest"
  )

  toast.success(`${t("collection.moved")}`)

  draggingToRoot.value = false
}

const dropRequest = async (payload: {
  parentCollectionIndexPath?: string | undefined
  requestIndex: string
  destinationCollectionIndex: string
}) => {
  const {
    parentCollectionIndexPath,
    requestIndex,
    destinationCollectionIndex,
  } = payload

  if (
    !requestIndex ||
    !destinationCollectionIndex ||
    !parentCollectionIndexPath
  ) {
    return
  }

  const requestHandleResult = await workspaceService.getRequestHandle(
    props.workspaceHandle,
    requestIndex
  )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE | INVALID_REQUEST_ID | REQUEST_NOT_FOUND
    return
  }

  const requestHandle = requestHandleResult.right

  if (requestHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const result = await workspaceService.moveRESTRequest(
    requestHandle,
    destinationCollectionIndex
  )

  if (E.isLeft(result)) {
    // INVALID_REQUEST_HANDLE
    return
  }

  const collectionHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    destinationCollectionIndex
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  if (collectionHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const cascadingAuthHeadersHandleResult =
    await workspaceService.getRESTCollectionLevelAuthHeadersView(
      collectionHandle
    )

  if (E.isLeft(cascadingAuthHeadersHandleResult)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const cascadingAuthHeadersHandle = cascadingAuthHeadersHandleResult.right

  if (cascadingAuthHeadersHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const { auth, headers } = cascadingAuthHeadersHandle.value.data

  const { collectionID, providerID, requestID, workspaceID } =
    requestHandle.value.data

  const possibleTab = tabs.getTabRefWithSaveContext({
    originLocation: "workspace-user-collection",
    workspaceID,
    providerID,
    collectionID,
    requestID,
  })

  // If there is a tab attached to this request, update its save context
  if (possibleTab) {
    const newCollectionID = destinationCollectionIndex
    const newRequestID = `${destinationCollectionIndex}/${(
      getRequestsByPath(restCollectionState.value, destinationCollectionIndex)
        .length - 1
    ).toString()}`

    possibleTab.value.document.saveContext = {
      originLocation: "workspace-user-collection",
      workspaceID,
      providerID,
      collectionID: newCollectionID,
      requestID: newRequestID,
    }

    possibleTab.value.document.inheritedProperties = {
      auth,
      headers,
    }
  }

  // When it's drop it's basically getting deleted from last folder. reordering last folder accordingly
  resolveSaveContextOnRequestReorder({
    lastIndex: pathToLastIndex(requestIndex),
    newIndex: -1, // being deleted from last folder
    folderPath: parentCollectionIndexPath,
    length:
      getRequestsByPath(restCollectionState.value, parentCollectionIndexPath)
        .length - 1,
  })

  toast.success(`${t("request.moved")}`)
  draggingToRoot.value = false
}

const dropCollection = async (payload: {
  draggedCollectionIndex: string
  destinationCollectionIndex: string
}) => {
  const { draggedCollectionIndex, destinationCollectionIndex } = payload

  if (
    !draggedCollectionIndex ||
    !destinationCollectionIndex ||
    draggedCollectionIndex === destinationCollectionIndex
  ) {
    return
  }

  if (
    checkIfCollectionIsAParentOfTheChildren(
      draggedCollectionIndex,
      destinationCollectionIndex
    )
  ) {
    toast.error(`${t("team.parent_coll_move")}`)
    return
  }

  //check if the collection is being moved to its own parent
  if (
    isMoveToSameLocation(draggedCollectionIndex, destinationCollectionIndex)
  ) {
    return
  }

  const parentFolder = draggedCollectionIndex.split("/").slice(0, -1).join("/") // remove last folder to get parent folder
  const totalFoldersOfDestinationCollection =
    getFoldersByPath(restCollectionState.value, destinationCollectionIndex)
      .length - (parentFolder === destinationCollectionIndex ? 1 : 0)

  const draggedCollectionHandleResult =
    await workspaceService.getCollectionHandle(
      props.workspaceHandle,
      draggedCollectionIndex
    )

  if (E.isLeft(draggedCollectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const draggedCollectionHandle = draggedCollectionHandleResult.right

  if (draggedCollectionHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const result = await workspaceService.moveRESTCollection(
    draggedCollectionHandle,
    destinationCollectionIndex
  )

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  resolveSaveContextOnCollectionReorder(
    {
      lastIndex: pathToLastIndex(draggedCollectionIndex),
      newIndex: -1,
      folderPath: parentFolder,
      length: getFoldersByPath(restCollectionState.value, parentFolder).length,
    },
    "drop"
  )

  updateSaveContextForAffectedRequests(
    draggedCollectionIndex,
    `${destinationCollectionIndex}/${totalFoldersOfDestinationCollection}`
  )

  const destinationCollectionHandleResult =
    await workspaceService.getCollectionHandle(
      props.workspaceHandle,
      destinationCollectionIndex
    )

  if (E.isLeft(destinationCollectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const destinationCollectionHandle = destinationCollectionHandleResult.right

  if (destinationCollectionHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const cascadingAuthHeadersHandleResult =
    await workspaceService.getRESTCollectionLevelAuthHeadersView(
      destinationCollectionHandle
    )

  if (E.isLeft(cascadingAuthHeadersHandleResult)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const cascadingAuthHeadersHandle = cascadingAuthHeadersHandleResult.right

  if (cascadingAuthHeadersHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const { auth, headers } = cascadingAuthHeadersHandle.value.data

  const inheritedProperty = {
    auth,
    headers,
  }

  updateInheritedPropertiesForAffectedRequests(
    `${destinationCollectionIndex}/${totalFoldersOfDestinationCollection}`,
    inheritedProperty,
    "rest"
  )

  draggingToRoot.value = false
  toast.success(`${t("collection.moved")}`)
}

const updateRequestOrder = async (
  dataTransfer: DataTransfer,
  {
    parentCollectionIndexPath,
    requestIndex,
  }: { parentCollectionIndexPath: string | null; requestIndex: string | null }
) => {
  if (!parentCollectionIndexPath) {
    return
  }

  const draggedRequestIndex = dataTransfer.getData("requestIndex")
  const destinationRequestIndex = requestIndex
  const destinationCollectionIndex = parentCollectionIndexPath

  if (
    !draggedRequestIndex ||
    !destinationCollectionIndex ||
    draggedRequestIndex === destinationRequestIndex
  ) {
    return
  }

  if (
    !isSameSameParent(
      draggedRequestIndex,
      destinationRequestIndex,
      destinationCollectionIndex
    )
  ) {
    return toast.error(`${t("collection.different_parent")}`)
  }

  const requestHandleResult = await workspaceService.getRequestHandle(
    props.workspaceHandle,
    draggedRequestIndex
  )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE | INVALID_REQUEST_ID | REQUEST_NOT_FOUND
    return
  }

  const requestHandle = requestHandleResult.right

  if (requestHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const result = await workspaceService.reorderRESTRequest(
    requestHandle,
    destinationCollectionIndex,
    destinationRequestIndex
  )

  if (E.isLeft(result)) {
    // INVALID_REQUEST_HANDLE
    return
  }

  toast.success(`${t("request.order_changed")}`)
}

const updateCollectionOrder = async (
  dataTransfer: DataTransfer,
  destinationCollection: {
    destinationCollectionIndex: string | null
    destinationCollectionParentIndex: string | null
  }
) => {
  const draggedCollectionIndex = dataTransfer.getData("collectionIndex")

  const { destinationCollectionIndex, destinationCollectionParentIndex } =
    destinationCollection

  if (
    !draggedCollectionIndex ||
    draggedCollectionIndex === destinationCollectionIndex
  ) {
    return
  }

  if (
    !isSameSameParent(
      draggedCollectionIndex,
      destinationCollectionIndex,
      destinationCollectionParentIndex
    )
  ) {
    return toast.error(`${t("collection.different_parent")}`)
  }

  const collectionHandleResult = await workspaceService.getCollectionHandle(
    props.workspaceHandle,
    draggedCollectionIndex
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  if (collectionHandle.value.type === "invalid") {
    // WORKSPACE_INVALIDATED
    return
  }

  const result = await workspaceService.reorderRESTCollection(
    collectionHandle,
    destinationCollectionIndex
  )

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  resolveSaveContextOnCollectionReorder({
    lastIndex: pathToLastIndex(draggedCollectionIndex),
    newIndex: pathToLastIndex(destinationCollectionIndex ?? ""),
    folderPath: draggedCollectionIndex.split("/").slice(0, -1).join("/"),
  })

  toast.success(`${t("collection.order_changed")}`)
}

const shareRequest = (request: HoppRESTRequest) => {
  if (currentUser.value) {
    // Opens the share request modal if the user is logged in
    return invokeAction("share.request", { request })
  }

  // Else, prompts the user to login
  invokeAction("modals.login.toggle")
}

/**
 * Generic helpers
 */

/**
 * Used to check if the collection exist as the parent of the childrens
 * @param draggedCollectionIndex The index of the collection dragged
 * @param destinationCollectionIndex The index of the destination collection
 * @returns True if the collection exist as the parent of the childrens
 */
const checkIfCollectionIsAParentOfTheChildren = (
  draggedCollectionIndex: string,
  destinationCollectionIndex: string
) => {
  const collectionDraggedPath = pathToIndex(draggedCollectionIndex)
  const destinationCollectionPath = pathToIndex(destinationCollectionIndex)

  if (collectionDraggedPath.length < destinationCollectionPath.length) {
    const slicedDestinationCollectionPath = destinationCollectionPath.slice(
      0,
      collectionDraggedPath.length
    )
    if (isEqual(slicedDestinationCollectionPath, collectionDraggedPath)) {
      return true
    }
    return false
  }

  return false
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

const isActiveRequest = (requestView: RESTCollectionViewRequest) => {
  if (
    tabs.currentActiveTab.value.document.saveContext?.originLocation !==
    "workspace-user-collection"
  ) {
    return false
  }

  const { requestID } = tabs.currentActiveTab.value.document.saveContext

  return requestID === requestView.requestID
}

const onSelectPick = (payload: Picked | null) => {
  emit("select", payload)
}

const getCollectionIndexPathArgs = (
  collectionIndexPath: string
): { collectionIndex: number } | { folderPath: string } => {
  return isAlreadyInRoot(collectionIndexPath)
    ? {
        collectionIndex: parseInt(collectionIndexPath),
      }
    : { folderPath: collectionIndexPath }
}

const getRequestIndexPathArgs = (requestIndexPath: string) => {
  const requestIndexPathArr = pathToIndex(requestIndexPath)

  const parentCollectionIndexPath = requestIndexPathArr.slice(0, -1).join("/")
  const requestIndex = parseInt(requestIndexPathArr.slice(-1)[0])

  return {
    folderPath: parentCollectionIndexPath,
    requestIndex,
  }
}

const isMoveToSameLocation = (
  draggedItemPath: string,
  destinationPath: string
) => {
  const draggedItemPathArr = pathToIndex(draggedItemPath)
  const destinationPathArr = pathToIndex(destinationPath)

  if (draggedItemPathArr.length > 0) {
    const draggedItemParentPathArr = draggedItemPathArr.slice(
      0,
      draggedItemPathArr.length - 1
    )

    if (isEqual(draggedItemParentPathArr, destinationPathArr)) {
      return true
    }
    return false
  }
}

/**
 * Used to check if the request/collection is being moved to the same parent since reorder is only allowed within the same parent
 * @param draggedItem - path index of the dragged request
 * @param destinationItem - path index of the destination request
 * @param destinationCollectionIndex -  index of the destination collection
 * @returns boolean - true if the request is being moved to the same parent
 */
const isSameSameParent = (
  draggedItemPath: string,
  destinationItemPath: string | null,
  destinationCollectionIndex: string | null
) => {
  const draggedItemIndex = pathToIndex(draggedItemPath)

  // if the destinationItemPath and destinationCollectionIndex is null, it means the request is being moved to the root
  if (destinationItemPath === null && destinationCollectionIndex === null) {
    return draggedItemIndex.length === 1
  } else if (
    destinationItemPath === null &&
    destinationCollectionIndex !== null &&
    draggedItemIndex.length === 1
  ) {
    return draggedItemIndex[0] === destinationCollectionIndex
  } else if (
    destinationItemPath === null &&
    draggedItemIndex.length !== 1 &&
    destinationCollectionIndex !== null
  ) {
    const draggedItemParent = draggedItemIndex.slice(0, -1)

    return draggedItemParent.join("/") === destinationCollectionIndex
  }
  if (destinationItemPath === null) return false
  const destinationItemIndex = pathToIndex(destinationItemPath)

  // length of 1 means the request is in the root
  if (draggedItemIndex.length === 1 && destinationItemIndex.length === 1) {
    return true
  } else if (draggedItemIndex.length === destinationItemIndex.length) {
    const draggedItemParent = draggedItemIndex.slice(0, -1)
    const destinationItemParent = destinationItemIndex.slice(0, -1)
    if (isEqual(draggedItemParent, destinationItemParent)) {
      return true
    }
    return false
  }
  return false
}

/**
 * @param path The path of the collection or request
 * @returns The index of the collection or request
 */
const pathToIndex = (path: string) => {
  const pathArr = path.split("/")
  return pathArr
}

const pathToLastIndex = (path: string) => {
  const pathArr = pathToIndex(path)
  return parseInt(pathArr[pathArr.length - 1])
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
  editingCollectionIndexPath.value = ""
  editingRootCollectionName.value = ""
  editingChildCollectionName.value = ""
  editingRequestName.value = ""
  editingRequestIndexPath.value = ""
}
</script>
