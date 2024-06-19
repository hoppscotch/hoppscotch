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
          @click="showModalAddRootCollection = true"
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
        <HoppSmartTree v-if="searchText" :adapter="searchTreeAdapter">
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
                  parentCollectionIndexPath: node.data.value.collectionID,
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
                  parentCollectionIndexPath: node.data.value.collectionID,
                  requestIndex: node.data.value.requestID,
                })
              "
              @update-last-request-order="
                updateRequestOrder($event, {
                  parentCollectionIndexPath: node.data.value.collectionID,
                  requestIndex: null,
                })
              "
            />
            <div v-else @click="toggleChildren">
              {{ node.data.value }}
            </div>
          </template>

          <template #emptyNode="{ node }">
            <HoppSmartPlaceholder
              v-if="searchText.length !== 0 && filteredCollections.length === 0"
              :text="`${t('state.nothing_found')} ‟${searchText}”`"
            >
              <template #icon>
                <icon-lucide-search class="svg-icons opacity-75" />
              </template>
            </HoppSmartPlaceholder>

            <HoppSmartPlaceholder
              v-else-if="node === null"
              :src="`/images/states/${colorMode.value}/pack.svg`"
              :alt="`${t('empty.collections')}`"
              :text="t('empty.collections')"
            >
              <template #body>
                <div class="flex flex-col items-center space-y-4">
                  <span class="text-center text-secondaryLight">
                    {{ t("collection.import_or_create") }}
                  </span>

                  <div class="flex flex-col items-stretch gap-4">
                    <HoppButtonPrimary
                      :icon="IconImport"
                      :label="t('import.title')"
                      filled
                      outline
                      @click="displayModalImportExport(true)"
                    />

                    <HoppButtonSecondary
                      :icon="IconPlus"
                      :label="t('add.new')"
                      filled
                      outline
                      @click="showModalAddRootCollection = true"
                    />
                  </div>
                </div>
              </template>
            </HoppSmartPlaceholder>

            <template v-else-if="node.data.type === 'collection'">
              <HoppSmartPlaceholder
                v-if="isAlreadyInRoot(node.data.value.collectionID)"
                :src="`/images/states/${colorMode.value}/pack.svg`"
                :alt="t('empty.collection')"
                :text="t('empty.collection')"
              >
                <template #body>
                  <HoppButtonSecondary
                    :label="t('add.new')"
                    filled
                    outline
                    @click="addChildCollection(node.data.value.collectionID)"
                  />
                </template>
              </HoppSmartPlaceholder>

              <HoppSmartPlaceholder
                v-else
                :src="`/images/states/${colorMode.value}/pack.svg`"
                :alt="t('empty.folder')"
                :text="t('empty.folder')"
              />
            </template>
          </template>
        </HoppSmartTree>

        <HoppSmartTree v-show="!searchText" :adapter="treeAdapter">
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
                  parentCollectionIndexPath: node.data.value.collectionID,
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
                  parentCollectionIndexPath: node.data.value.collectionID,
                  requestIndex: node.data.value.requestID,
                })
              "
              @update-last-request-order="
                updateRequestOrder($event, {
                  parentCollectionIndexPath: node.data.value.collectionID,
                  requestIndex: null,
                })
              "
            />
            <div v-else @click="toggleChildren">
              {{ node.data.value }}
            </div>
          </template>

          <template #emptyNode="{ node }">
            <HoppSmartPlaceholder
              v-if="searchText.length !== 0 && filteredCollections.length === 0"
              :text="`${t('state.nothing_found')} ‟${searchText}”`"
            >
              <template #icon>
                <icon-lucide-search class="svg-icons opacity-75" />
              </template>
            </HoppSmartPlaceholder>

            <HoppSmartPlaceholder
              v-else-if="node === null"
              :src="`/images/states/${colorMode.value}/pack.svg`"
              :alt="`${t('empty.collections')}`"
              :text="t('empty.collections')"
            >
              <template #body>
                <div class="flex flex-col items-center space-y-4">
                  <span class="text-center text-secondaryLight">
                    {{ t("collection.import_or_create") }}
                  </span>

                  <div class="flex flex-col items-stretch gap-4">
                    <HoppButtonPrimary
                      :icon="IconImport"
                      :label="t('import.title')"
                      filled
                      outline
                      @click="displayModalImportExport(true)"
                    />

                    <HoppButtonSecondary
                      :icon="IconPlus"
                      :label="t('add.new')"
                      filled
                      outline
                      @click="showModalAddRootCollection = true"
                    />
                  </div>
                </div>
              </template>
            </HoppSmartPlaceholder>

            <template v-else-if="node.data.type === 'collection'">
              <HoppSmartPlaceholder
                v-if="isAlreadyInRoot(node.data.value.collectionID)"
                :src="`/images/states/${colorMode.value}/pack.svg`"
                :alt="t('empty.collection')"
                :text="t('empty.collection')"
              >
                <template #body>
                  <HoppButtonSecondary
                    :label="t('add.new')"
                    filled
                    outline
                    @click="addChildCollection(node.data.value.collectionID)"
                  />
                </template>
              </HoppSmartPlaceholder>

              <HoppSmartPlaceholder
                v-else
                :src="`/images/states/${colorMode.value}/pack.svg`"
                :alt="t('empty.folder')"
                :text="t('empty.folder')"
              />
            </template>
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
        :show="showModalAddRootCollection"
        :loading-state="modalLoadingState"
        @submit="addNewRootCollection"
        @hide-modal="showModalAddRootCollection = false"
      />
      <CollectionsAddRequest
        :show="showModalAddRequest"
        :loading-state="modalLoadingState"
        @add-request="onAddRequest"
        @hide-modal="displayModalAddRequest(false)"
      />
      <CollectionsAddFolder
        :show="showModalAddChildCollection"
        :loading-state="modalLoadingState"
        @add-folder="onAddChildCollection"
        @hide-modal="displayModalAddChildCollection(false)"
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

      <CollectionsProperties
        v-model="collectionPropertiesModalActiveTab"
        :show="showModalEditProperties"
        :editing-properties="editingProperties"
        source="REST"
        @hide-modal="displayModalEditProperties(false)"
        @set-collection-properties="setCollectionProperties"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { useService } from "dioc/vue"
import * as E from "fp-ts/lib/Either"
import { cloneDeep, isEqual } from "lodash-es"
import { markRaw, nextTick, onMounted, ref, watchEffect } from "vue"
import {
  EditingProperties,
  UpdatedCollectionProps,
} from "~/components/collections/Properties.vue"
import { RESTOptionTabs } from "~/components/http/RequestOptions.vue"

import { useI18n } from "~/composables/i18n"
import { useReadonlyStream } from "~/composables/stream"
import { useColorMode } from "~/composables/theming"
import { useToast } from "~/composables/toast"
import { invokeAction } from "~/helpers/actions"
import { WorkspaceRESTSearchCollectionTreeAdapter } from "~/helpers/adapters/WorkspaceRESTCollectionSearchTreeAdapter"
import { WorkspaceRESTCollectionTreeAdapter } from "~/helpers/adapters/WorkspaceRESTCollectionTreeAdapter"
import {
  getFoldersByPath,
  updateInheritedPropertiesForAffectedRequests,
} from "~/helpers/collection/collection"
import { getRequestsByPath } from "~/helpers/collection/request"
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
import { Handle } from "~/services/new-workspace/handle"
import { RESTCollectionViewRequest } from "~/services/new-workspace/view"
import { Workspace } from "~/services/new-workspace/workspace"
import { PersistedOAuthConfig } from "~/services/oauth/oauth.service"
import { PersistenceService } from "~/services/persistence"
import { RESTTabService } from "~/services/tab/rest"
import IconImport from "~icons/lucide/folder-down"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconPlus from "~icons/lucide/plus"

const colorMode = useColorMode()
const t = useI18n()
const toast = useToast()

const tabs = useService(RESTTabService)
const workspaceService = useService(NewWorkspaceService)
const persistenceService = useService(PersistenceService)

const currentReorderingStatus = useReadonlyStream(currentReorderingStatus$, {
  type: "collection",
  id: "",
  parentID: "",
})
const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)
const restCollectionState = useReadonlyStream(restCollections$, [])

const props = defineProps<{
  workspaceHandle: Handle<Workspace>
  picked?: Picked | null
  saveRequest?: boolean
}>()

const emit = defineEmits<{
  (e: "display-modal-add"): void
  (e: "display-modal-import-export"): void
  (event: "select", payload: Picked | null): void
}>()

const draggingToRoot = ref(false)
const searchText = ref("")

const modalLoadingState = ref(false)

const showModalAddRootCollection = ref(false)
const showModalAddRequest = ref(false)
const showModalAddChildCollection = ref(false)
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

const onSessionEnd = ref<() => void>()

const filteredCollections = ref<HoppCollection[]>([])

const editingProperties = ref<EditingProperties>({
  collection: null,
  isRootCollection: false,
  path: "",
  inheritedProperties: undefined,
})

const confirmModalTitle = ref<string | null>(null)

const collectionPropertiesModalActiveTab = ref<RESTOptionTabs>("headers")

onMounted(() => {
  const localOAuthTempConfig =
    persistenceService.getLocalConfig("oauth_temp_config")

  if (!localOAuthTempConfig) {
    return
  }

  const { context, source, token }: PersistedOAuthConfig =
    JSON.parse(localOAuthTempConfig)

  if (source === "GraphQL") {
    return
  }

  if (context?.type === "collection-properties") {
    // load the unsaved editing properties
    const unsavedCollectionPropertiesString = persistenceService.getLocalConfig(
      "unsaved_collection_properties"
    )

    if (unsavedCollectionPropertiesString) {
      const unsavedCollectionProperties: EditingProperties = JSON.parse(
        unsavedCollectionPropertiesString
      )

      const auth = unsavedCollectionProperties.collection?.auth

      if (auth?.authType === "oauth-2") {
        const grantTypeInfo = auth.grantTypeInfo

        grantTypeInfo && (grantTypeInfo.token = token ?? "")
      }

      editingProperties.value = unsavedCollectionProperties
    }

    persistenceService.removeLocalConfig("oauth_temp_config")
    collectionPropertiesModalActiveTab.value = "authorization"
    showModalEditProperties.value = true
  }
})

watchEffect(async () => {
  if (!searchText.value) {
    filteredCollections.value = []
    onSessionEnd.value?.()
    return
  }

  const searchResultsHandleResult =
    await workspaceService.getRESTSearchResultsView(
      props.workspaceHandle,
      searchText
    )

  if (E.isLeft(searchResultsHandleResult)) {
    filteredCollections.value = []
    return
  }

  const searchResultsHandle = searchResultsHandleResult.right.get()

  if (searchResultsHandle.value.type === "invalid") {
    filteredCollections.value = []
    return
  }

  filteredCollections.value = searchResultsHandle.value.data.results.value
  onSessionEnd.value = searchResultsHandle.value.data.onSessionEnd
})

const treeAdapter = markRaw(
  new WorkspaceRESTCollectionTreeAdapter(
    props.workspaceHandle,
    workspaceService
  )
)

const searchTreeAdapter = markRaw(
  new WorkspaceRESTSearchCollectionTreeAdapter(filteredCollections)
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

const displayModalAddChildCollection = (show: boolean) => {
  showModalAddChildCollection.value = show

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

  const collectionHandleResult =
    await workspaceService.createRESTRootCollection(props.workspaceHandle, {
      name,
    })

  if (E.isLeft(collectionHandleResult)) {
    // TODO: Error Handling
    return
  }

  // Workspace invalidated
  if (collectionHandleResult.right.get().value.type === "invalid") {
    // TODO: Error Handling
    return
  }

  modalLoadingState.value = false
  showModalAddRootCollection.value = false
}

const removeRootCollection = (collectionIndexPath: string) => {
  editingCollectionIndexPath.value = collectionIndexPath

  confirmModalTitle.value = `${t("confirm.remove_collection")}`
  displayConfirmModal(true)
}

const onRemoveRootCollection = async () => {
  const collectionIndexPath = editingCollectionIndexPath.value

  const collectionHandleResult = await workspaceService.getRESTCollectionHandle(
    props.workspaceHandle,
    collectionIndexPath
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  const collectionHandleRef = collectionHandle.get()

  if (collectionHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
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

  toast.success(t("state.deleted"))
  displayConfirmModal(false)
}

const addRequest = (parentCollectionIndexPath: string) => {
  editingCollectionIndexPath.value = parentCollectionIndexPath
  displayModalAddRequest(true)
}

const onAddRequest = async (requestName: string) => {
  const parentCollectionIndexPath = editingCollectionIndexPath.value

  const collectionHandleResult = await workspaceService.getRESTCollectionHandle(
    props.workspaceHandle,
    parentCollectionIndexPath
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  const collectionHandleRef = collectionHandle.get()

  if (collectionHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
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

  const requestHandleRef = requestHandle.get()

  if (requestHandleRef.value.type === "invalid") {
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

  const cascadingAuthHeadersHandle =
    cascadingAuthHeadersHandleResult.right.get()

  if (cascadingAuthHeadersHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const { auth, headers } = cascadingAuthHeadersHandle.value.data

  tabs.createNewTab({
    request: newRequest,
    isDirty: false,
    saveContext: {
      originLocation: "workspace-user-collection",
      requestHandle,
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
  displayModalAddChildCollection(true)
}

const onAddChildCollection = async (newChildCollectionName: string) => {
  const parentCollectionIndexPath = editingCollectionIndexPath.value

  const collectionHandleResult = await workspaceService.getRESTCollectionHandle(
    props.workspaceHandle,
    parentCollectionIndexPath
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  const collectionHandleRef = collectionHandle.get()

  if (collectionHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
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

  if (result.right.get().value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  displayModalAddChildCollection(false)
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

  const collectionHandleResult = await workspaceService.getRESTCollectionHandle(
    props.workspaceHandle,
    collectionIndexPath
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  const collectionHandleRef = collectionHandle.get()

  if (collectionHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
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

  const collectionHandleResult = await workspaceService.getRESTCollectionHandle(
    props.workspaceHandle,
    collectionIndexPath
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  const collectionHandleRef = collectionHandle.get()

  if (collectionHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
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
    await workspaceService.getRESTCollectionHandle(
      props.workspaceHandle,
      parentCollectionIndexPath
    )

  if (E.isLeft(parentCollectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const parentCollectionHandle = parentCollectionHandleResult.right

  const parentCollectionHandleRef = parentCollectionHandle.get()

  if (parentCollectionHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
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

  const requestHandleResult = await workspaceService.getRESTRequestHandle(
    props.workspaceHandle,
    requestIndexPath
  )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE | INVALID_REQUEST_ID | REQUEST_NOT_FOUND
    return
  }

  const requestHandle = requestHandleResult.right

  const requestHandleRef = requestHandle.get()

  if (requestHandleRef.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

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

  const collectionHandleResult = await workspaceService.getRESTCollectionHandle(
    props.workspaceHandle,
    collectionIndexPath
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collectionHandle = collectionHandleResult.right

  const requestHandleResult = await workspaceService.getRESTRequestHandle(
    props.workspaceHandle,
    requestIndexPath
  )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE | INVALID_REQUEST_ID | REQUEST_NOT_FOUND
    return
  }

  const requestHandle = requestHandleResult.right

  const cascadingAuthHeadersHandleResult =
    await workspaceService.getRESTCollectionLevelAuthHeadersView(
      collectionHandle
    )

  if (E.isLeft(cascadingAuthHeadersHandleResult)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const cascadingAuthHeadersHandle =
    cascadingAuthHeadersHandleResult.right.get()

  if (cascadingAuthHeadersHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const { auth, headers } = cascadingAuthHeadersHandle.value.data

  // If there is a request with this save context, switch into it
  const possibleTab = tabs.getTabRefWithSaveContext({
    originLocation: "workspace-user-collection",
    requestHandle,
  })

  const requestHandleRef = requestHandle.get()

  if (possibleTab) {
    tabs.setActiveTab(possibleTab.value.id)
  } else if (requestHandleRef.value.type === "ok") {
    // If not, open the request in a new tab
    tabs.createNewTab({
      request: requestHandleRef.value.data.request as HoppRESTRequest,
      isDirty: false,
      saveContext: {
        originLocation: "workspace-user-collection",
        requestHandle,
      },
      inheritedProperties: {
        auth,
        headers,
      },
    })
  }
}

const duplicateRequest = async (requestID: string) => {
  const collectionID = requestID.split("/").slice(0, -1).join("/")

  const collectionHandleResult = await workspaceService.getRESTCollectionHandle(
    props.workspaceHandle,
    collectionID
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID
    return
  }

  const collectionHandle = collectionHandleResult.right

  const collectionHandleRef = collectionHandle.get()

  if (collectionHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const requestHandleResult = await workspaceService.getRESTRequestHandle(
    props.workspaceHandle,
    requestID
  )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE | INVALID_REQUEST_ID | REQUEST_NOT_FOUND
    return
  }

  const requestHandle = requestHandleResult.right.get()

  if (requestHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const request = requestHandle.value.data.request as HoppRESTRequest

  const newRequest = {
    ...cloneDeep(request),
    name: `${request.name} - ${t("action.duplicate")}`,
  }

  const createdRequestHandleResult = await workspaceService.createRESTRequest(
    collectionHandle,
    newRequest
  )

  if (E.isLeft(createdRequestHandleResult)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const createdRequestHandle = createdRequestHandleResult.right

  const createdRequestHandleRef = createdRequestHandle.get()

  if (createdRequestHandleRef.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

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

  const requestHandleResult = await workspaceService.getRESTRequestHandle(
    props.workspaceHandle,
    requestID
  )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE | INVALID_REQUEST_ID | REQUEST_NOT_FOUND
    return
  }

  const requestHandle = requestHandleResult.right

  const requestHandleRef = requestHandle.get()

  if (requestHandleRef.value.type === "invalid") {
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

  const possibleTab = tabs.getTabRefWithSaveContext({
    originLocation: "workspace-user-collection",
    requestHandle,
  })

  if (possibleTab) {
    possibleTab.value.document.isDirty = false
  }

  displayModalEditRequest(false)
  toast.success(t("request.renamed"))
}

const editCollectionProperties = async (collectionIndexPath: string) => {
  const parentCollectionID = collectionIndexPath
    .split("/")
    .slice(0, -1)
    .join("/") // remove last folder to get parent folder

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

  const collectionHandleResult = await workspaceService.getRESTCollectionHandle(
    props.workspaceHandle,
    collectionIndexPath
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  const collectionHandleRef = collectionHandle.get()

  if (collectionHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  if (parentCollectionID) {
    const cascadingAuthHeadersHandleResult =
      await workspaceService.getRESTCollectionLevelAuthHeadersView(
        collectionHandle
      )

    if (E.isLeft(cascadingAuthHeadersHandleResult)) {
      // INVALID_COLLECTION_HANDLE
      return
    }

    const cascadingAuthHeadersHandle =
      cascadingAuthHeadersHandleResult.right.get()

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

const setCollectionProperties = async (
  updatedCollectionProps: UpdatedCollectionProps
) => {
  const { collection, path } = updatedCollectionProps

  if (!collection) {
    return
  }

  const collectionHandleResult = await workspaceService.getRESTCollectionHandle(
    props.workspaceHandle,
    path
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  const collectionHandleRef = collectionHandle.get()

  if (collectionHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const result = await workspaceService.updateRESTCollection(
    collectionHandle,
    collection
  )

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

  const cascadingAuthHeadersHandle =
    cascadingAuthHeadersHandleResult.right.get()

  if (cascadingAuthHeadersHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const { auth: cascadedAuth, headers: cascadedHeaders } =
    cascadingAuthHeadersHandle.value.data

  nextTick(() => {
    updateInheritedPropertiesForAffectedRequests(
      path,
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
  const collectionHandleResult = await workspaceService.getRESTCollectionHandle(
    props.workspaceHandle,
    collectionIndexPath
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  const collectionHandleRef = collectionHandle.get()

  if (collectionHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const result = await workspaceService.exportRESTCollection(collectionHandle)

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE | COLLECTION_DOES_NOT_EXIST
    return toast.error(t("export.failed"))
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
    await workspaceService.getRESTCollectionHandle(
      props.workspaceHandle,
      draggedCollectionIndex
    )

  if (E.isLeft(draggedCollectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const draggedCollectionHandle = draggedCollectionHandleResult.right

  const draggedCollectionHandleRef = draggedCollectionHandle.get()

  if (draggedCollectionHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
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

  const destinationRootCollectionHandleResult =
    await workspaceService.getRESTCollectionHandle(
      props.workspaceHandle,
      destinationRootCollectionIndex
    )

  if (E.isLeft(destinationRootCollectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const destinationRootCollectionHandle =
    destinationRootCollectionHandleResult.right

  const destinationRootCollectionHandleRef =
    destinationRootCollectionHandle.get()

  if (destinationRootCollectionHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
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

  const cascadingAuthHeadersHandle =
    cascadingAuthHeadersHandleResult.right.get()

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

  const requestHandleResult = await workspaceService.getRESTRequestHandle(
    props.workspaceHandle,
    requestIndex
  )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE | INVALID_REQUEST_ID | REQUEST_NOT_FOUND
    return
  }

  const requestHandle = requestHandleResult.right

  const result = await workspaceService.moveRESTRequest(
    requestHandle,
    destinationCollectionIndex
  )

  if (E.isLeft(result)) {
    // INVALID_REQUEST_HANDLE
    return
  }

  const collectionHandleResult = await workspaceService.getRESTCollectionHandle(
    props.workspaceHandle,
    destinationCollectionIndex
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  const cascadingAuthHeadersHandleResult =
    await workspaceService.getRESTCollectionLevelAuthHeadersView(
      collectionHandle
    )

  if (E.isLeft(cascadingAuthHeadersHandleResult)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const cascadingAuthHeadersHandle =
    cascadingAuthHeadersHandleResult.right.get()

  if (cascadingAuthHeadersHandle.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const { auth, headers } = cascadingAuthHeadersHandle.value.data

  const requestHandleRef = requestHandle.get()

  if (requestHandleRef.value.type === "ok") {
    const newRequestIndexPos = (
      getRequestsByPath(restCollectionState.value, destinationCollectionIndex)
        .length - 1
    ).toString()

    requestHandleRef.value.data.collectionID = destinationCollectionIndex
    requestHandleRef.value.data.requestID = `${destinationCollectionIndex}/${newRequestIndexPos}`

    const possibleTab = tabs.getTabRefWithSaveContext({
      originLocation: "workspace-user-collection",
      requestHandle: { get: () => requestHandleRef },
    })

    // If there is a tab attached to this request, update the document `inheritedProperties`
    if (possibleTab) {
      possibleTab.value.document.inheritedProperties = {
        auth,
        headers,
      }
    }
  }

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

  // Check if the collection is being moved to its own parent
  if (
    isMoveToSameLocation(draggedCollectionIndex, destinationCollectionIndex)
  ) {
    return
  }

  const draggedParentCollectionIndex = draggedCollectionIndex
    .split("/")
    .slice(0, -1)
    .join("/") // Remove the last child-collection index to get the parent collection index

  const totalChildCollectionsInDestinationCollection =
    getFoldersByPath(restCollectionState.value, destinationCollectionIndex)
      .length -
    (draggedParentCollectionIndex === destinationCollectionIndex ? 1 : 0)

  const draggedCollectionHandleResult =
    await workspaceService.getRESTCollectionHandle(
      props.workspaceHandle,
      draggedCollectionIndex
    )

  if (E.isLeft(draggedCollectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const draggedCollectionHandle = draggedCollectionHandleResult.right

  const draggedCollectionHandleRef = draggedCollectionHandle.get()

  if (draggedCollectionHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
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

  const destinationCollectionHandleResult =
    await workspaceService.getRESTCollectionHandle(
      props.workspaceHandle,
      destinationCollectionIndex
    )

  if (E.isLeft(destinationCollectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const destinationCollectionHandle = destinationCollectionHandleResult.right

  const destinationCollectionHandleRef = destinationCollectionHandle.get()

  if (destinationCollectionHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
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

  const cascadingAuthHeadersHandle =
    cascadingAuthHeadersHandleResult.right.get()

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
    `${destinationCollectionIndex}/${totalChildCollectionsInDestinationCollection}`,
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

  const requestHandleResult = await workspaceService.getRESTRequestHandle(
    props.workspaceHandle,
    draggedRequestIndex
  )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE | INVALID_REQUEST_ID | REQUEST_NOT_FOUND
    return
  }

  const requestHandle = requestHandleResult.right

  const requestHandleRef = requestHandle.get()

  if (requestHandleRef.value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  const result = await workspaceService.reorderRESTRequest(
    requestHandle,
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

  const collectionHandleResult = await workspaceService.getRESTCollectionHandle(
    props.workspaceHandle,
    draggedCollectionIndex
  )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
    return
  }

  const collectionHandle = collectionHandleResult.right

  const collectionHandleRef = collectionHandle.get()

  if (collectionHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
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

  const requestHandle =
    tabs.currentActiveTab.value.document.saveContext.requestHandle

  if (!requestHandle) {
    return false
  }

  const requestHandleRef = requestHandle.get()

  if (requestHandleRef.value.type === "invalid") {
    return false
  }

  return requestHandleRef.value.data.requestID === requestView.requestID
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
