<template>
  <div :class="{ 'rounded border border-divider': saveRequest }">
    <div
      class="sticky z-10 flex flex-shrink-0 flex-col overflow-x-auto rounded-t bg-primary"
      :style="
        saveRequest ? 'top: calc(-1 * var(--line-height-body))' : 'top: 0'
      "
    >
      <input
        v-model="filterText"
        type="search"
        autocomplete="off"
        :placeholder="t('action.search')"
        class="flex w-full bg-transparent px-4 py-2 h-8"
      />
      <div
        class="flex flex-1 flex-shrink-0 justify-between border-y border-dividerLight bg-primary"
      >
        <HoppButtonSecondary
          :icon="IconPlus"
          :label="t('action.new')"
          class="!rounded-none"
          @click="displayModalAdd(true)"
        />
        <div class="flex">
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
            :title="t('modal.import_export')"
            :icon="IconImport"
            @click="displayModalImportExport(true)"
          />
        </div>
      </div>
    </div>
    <div class="flex flex-col">
      <NewCollectionsGraphqlCollection
        v-for="(collection, index) in filteredCollections"
        :key="`collection-${index}`"
        :picked="picked"
        :name="collection.name"
        :collection-index="index"
        :collection="collection"
        :is-filtered="filterText.length > 0"
        :save-request="saveRequest"
        @edit-collection="editRootCollection(collection.name, index.toString())"
        @add-request="addRequest($event)"
        @add-folder="addFolder($event)"
        @edit-folder="editChildCollection($event)"
        @edit-request="editRequest($event)"
        @duplicate-request="duplicateRequest($event)"
        @edit-collection-properties="editCollectionProperties($event)"
        @select="$emit('select', $event)"
        @select-request="selectRequest($event)"
        @drop-request="dropRequest($event)"
        @remove-collection="removeCollection"
        @remove-request="removeRequest"
      />
    </div>
    <HoppSmartPlaceholder
      v-if="gqlCollectionState.length === 0"
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
              :label="t('add.new')"
              filled
              outline
              :icon="IconPlus"
              @click="displayModalAdd(true)"
            />
          </div>
        </div>
      </template>
    </HoppSmartPlaceholder>
    <HoppSmartPlaceholder
      v-if="
        !(filteredCollections.length !== 0 || gqlCollectionState.length === 0)
      "
      :text="`${t('state.nothing_found')} ‟${filterText}”`"
    >
      <template #icon>
        <icon-lucide-search class="svg-icons opacity-75" />
      </template>
    </HoppSmartPlaceholder>
    <CollectionsGraphqlAdd
      :show="showModalAdd"
      @submit="addNewRootCollection"
      @hide-modal="displayModalAdd(false)"
    />
    <CollectionsGraphqlEdit
      v-if="showModalEdit"
      :editing-collection-name="editingRootCollectionName ?? ''"
      @submit="onEditRootCollection"
      @hide-modal="displayModalEdit(false)"
    />
    <CollectionsGraphqlAddRequest
      :show="showModalAddRequest"
      :folder-path="editingChildCollectionID"
      @add-request="onAddRequest($event)"
      @hide-modal="displayModalAddRequest(false)"
    />
    <CollectionsGraphqlAddFolder
      :show="showModalAddFolder"
      :collection-index="editingCollectionID!"
      :folder-path="editingChildCollectionID"
      @add-folder="onAddFolder($event)"
      @hide-modal="displayModalAddFolder(false)"
    />
    <CollectionsGraphqlEditFolder
      v-if="showModalEditChildCollection"
      :editing-folder-name="editingChildCollectionName ?? ''"
      @submit="onEditChildCollection"
      @hide-modal="displayModalEditChildCollection(false)"
    />
    <CollectionsGraphqlEditRequest
      :show="showModalEditRequest"
      :editing-request-name="editingRequest ? editingRequest.name : ''"
      @submit="onEditRequest"
      @hide-modal="displayModalEditRequest(false)"
    />
    <CollectionsGraphqlImportExport
      v-if="showModalImportExport"
      @hide-modal="displayModalImportExport(false)"
    />
    <CollectionsProperties
      v-model="collectionPropertiesModalActiveTab"
      :show="showModalEditProperties"
      :editing-properties="editingProperties"
      source="GraphQL"
      @hide-modal="displayModalEditProperties(false)"
      @set-collection-properties="setCollectionProperties"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { useColorMode } from "@composables/theming"
import { HoppCollection, HoppGQLRequest } from "@hoppscotch/data"
import { useService } from "dioc/vue"
import * as E from "fp-ts/lib/Either"
import { cloneDeep } from "lodash-es"
import { nextTick, onMounted, ref, watchEffect } from "vue"

import { GQLOptionTabs } from "~/components/graphql/RequestOptions.vue"
import { useToast } from "~/composables/toast"
import { defineActionHandler } from "~/helpers/actions"
import { updateInheritedPropertiesForAffectedRequests } from "~/helpers/collection/collection"
import { getRequestsByPath } from "~/helpers/collection/request"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import { Picked } from "~/helpers/types/HoppPicked"
import {
  graphqlCollections$,
  navigateToFolderWithIndexPath,
} from "~/newstore/collections"
import { Handle } from "~/services/new-workspace/handle"
import { PersonalWorkspaceProviderService } from "~/services/new-workspace/providers/personal.workspace"
import { Workspace } from "~/services/new-workspace/workspace"
import { PersistedOAuthConfig } from "~/services/oauth/oauth.service"
import { PersistenceService } from "~/services/persistence"
import { GQLTabService } from "~/services/tab/graphql"
import IconImport from "~icons/lucide/folder-down"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconPlus from "~icons/lucide/plus"
import {
  EditingProperties,
  UpdatedCollectionProps,
} from "../../collections/Properties.vue"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  workspaceHandle: Handle<Workspace>
  picked?: Picked | null
  // Whether to activate the ability to pick items (activates 'select' events)
  saveRequest?: boolean
}>()

defineEmits<{
  (e: "select", i: Picked | null): void
}>()

const gqlCollectionState = useReadonlyStream(graphqlCollections$, [], "deep")
const colorMode = useColorMode()

const persistenceService = useService(PersistenceService)

// To be replaced with workspace service when support for teams is brought about
const personalWorkspaceProviderService = useService(
  PersonalWorkspaceProviderService
)

const tabs = useService(GQLTabService)

const showModalAdd = ref(false)
const showModalEdit = ref(false)
const showModalImportExport = ref(false)
const showModalAddRequest = ref(false)
const showModalAddFolder = ref(false)
const showModalEditChildCollection = ref(false)
const showModalEditRequest = ref(false)
const showModalEditProperties = ref(false)

const editingCollection = ref<HoppCollection | null>(null)
const editingRootCollectionName = ref<string | null>(null)
const editingChildCollection = ref<HoppCollection | null>(null)
const editingChildCollectionName = ref<string | null>(null)
const editingRequest = ref<HoppGQLRequest | null>(null)

const editingCollectionID = ref<string | null>(null)
const editingChildCollectionID = ref("")
const editingRequestID = ref<string | null>(null)

const editingProperties = ref<{
  collection: Partial<HoppCollection> | null
  isRootCollection: boolean
  path: string
  inheritedProperties?: HoppInheritedProperty
}>({
  collection: null,
  isRootCollection: false,
  path: "",
  inheritedProperties: undefined,
})

const filterText = ref("")

const collectionPropertiesModalActiveTab = ref<GQLOptionTabs>("headers")

onMounted(() => {
  const localOAuthTempConfig =
    persistenceService.getLocalConfig("oauth_temp_config")

  if (!localOAuthTempConfig) {
    return
  }

  const { context, source, token }: PersistedOAuthConfig =
    JSON.parse(localOAuthTempConfig)

  if (source === "REST") {
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

const onSessionEnd = ref<() => void>()

const filteredCollections = ref<HoppCollection[]>([])

watchEffect(async () => {
  if (!filterText.value) {
    filteredCollections.value = gqlCollectionState.value
    onSessionEnd.value?.()
    return
  }

  const searchResultsHandleResult =
    await personalWorkspaceProviderService.getGQLSearchResultsView(
      props.workspaceHandle,
      filterText
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

const displayModalAdd = (shouldDisplay: boolean) => {
  showModalAdd.value = shouldDisplay
}

const displayModalEdit = (shouldDisplay: boolean) => {
  showModalEdit.value = shouldDisplay

  if (!shouldDisplay) resetSelectedData()
}

const displayModalImportExport = (shouldDisplay: boolean) => {
  showModalImportExport.value = shouldDisplay
}

const displayModalAddRequest = (shouldDisplay: boolean) => {
  showModalAddRequest.value = shouldDisplay

  if (!shouldDisplay) resetSelectedData()
}

const displayModalAddFolder = (shouldDisplay: boolean) => {
  showModalAddFolder.value = shouldDisplay

  if (!shouldDisplay) resetSelectedData()
}

const displayModalEditChildCollection = (shouldDisplay: boolean) => {
  showModalEditChildCollection.value = shouldDisplay

  if (!shouldDisplay) resetSelectedData()
}

const displayModalEditRequest = (shouldDisplay: boolean) => {
  showModalEditRequest.value = shouldDisplay

  if (!shouldDisplay) resetSelectedData()
}

const displayModalEditProperties = (show: boolean) => {
  showModalEditProperties.value = show

  if (!show) resetSelectedData()
}

const addNewRootCollection = async (name: string) => {
  const collectionHandleResult =
    await personalWorkspaceProviderService.createGQLRootCollection(
      props.workspaceHandle,
      {
        name,
      }
    )

  if (E.isLeft(collectionHandleResult)) {
    // TODO: Error Handling
    return
  }

  // Workspace invalidated
  if (collectionHandleResult.right.get().value.type === "invalid") {
    // TODO: Error Handling
    return
  }
}

const editRootCollection = (collectionName: string, collectionID: string) => {
  editingRootCollectionName.value = collectionName
  editingCollectionID.value = collectionID

  displayModalEdit(true)
}

const onEditRootCollection = async (name: string) => {
  const collectionID = editingCollectionID.value

  if (!collectionID) {
    return
  }

  const collectionHandleResult =
    await personalWorkspaceProviderService.getGQLCollectionHandle(
      props.workspaceHandle,
      collectionID
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

  const result = await personalWorkspaceProviderService.updateGQLCollection(
    collectionHandle,
    {
      name,
    }
  )

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }
}

// TODO: Remove the `index` field from the payload
const onAddRequest = async ({ name, path }: { name: string; path: string }) => {
  const collectionHandleResult =
    await personalWorkspaceProviderService.getGQLCollectionHandle(
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

  const newRequest = {
    ...cloneDeep(tabs.currentActiveTab.value.document.request),
    name,
  }

  const requestHandleResult =
    await personalWorkspaceProviderService.createGQLRequest(
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
    await personalWorkspaceProviderService.getGQLCollectionLevelAuthHeadersView(
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

const addRequest = (payload: { path: string }) => {
  const { path } = payload
  editingChildCollectionID.value = path
  displayModalAddRequest(true)
}

const onAddFolder = async ({
  name,
  path,
}: {
  name: string
  path: string | undefined
}) => {
  const collectionHandleResult =
    await personalWorkspaceProviderService.getGQLCollectionHandle(
      props.workspaceHandle,
      path ?? "0"
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

  const result =
    await personalWorkspaceProviderService.createGQLChildCollection(
      collectionHandle,
      { name }
    )

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  if (result.right.get().value.type === "invalid") {
    // COLLECTION_INVALIDATED
    return
  }

  displayModalAddFolder(false)
}

const addFolder = (payload: { path: string }) => {
  const { path } = payload
  editingChildCollectionID.value = path
  displayModalAddFolder(true)
}

const editChildCollection = (payload: {
  collectionName: string
  collectionID: string
}) => {
  const { collectionName, collectionID } = payload

  editingChildCollectionName.value = collectionName
  editingChildCollectionID.value = collectionID

  displayModalEditChildCollection(true)
}

const onEditChildCollection = async (name: string) => {
  const collectionID = editingChildCollectionID.value

  if (!collectionID) {
    return
  }

  const collectionHandleResult =
    await personalWorkspaceProviderService.getGQLCollectionHandle(
      props.workspaceHandle,
      collectionID
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

  const result = await personalWorkspaceProviderService.updateGQLCollection(
    collectionHandle,
    {
      name,
    }
  )

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }
}

const editRequest = (requestID: string) => {
  editingRequestID.value = requestID

  displayModalEditRequest(true)
}

const onEditRequest = async (newRequestName: string) => {
  const requestID = editingRequestID.value

  if (!requestID) {
    return
  }

  const requestHandleResult =
    await personalWorkspaceProviderService.getGQLRequestHandle(
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

  const result = await personalWorkspaceProviderService.updateGQLRequest(
    requestHandle,
    {
      name: newRequestName,
    }
  )

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

const duplicateRequest = async (requestID: string) => {
  const collectionID = requestID.split("/").slice(0, -1).join("/")

  const collectionHandleResult =
    await personalWorkspaceProviderService.getGQLCollectionHandle(
      props.workspaceHandle,
      collectionID
    )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collectionHandle = collectionHandleResult.right

  const collectionHandleRef = collectionHandle.get()

  if (collectionHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const requestHandleResult =
    await personalWorkspaceProviderService.getGQLRequestHandle(
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

  const request = requestHandle.value.data.request as HoppGQLRequest

  const newRequest = {
    ...cloneDeep(request),
    name: `${request.name} - ${t("action.duplicate")}`,
  }

  const createdRequestHandleResult =
    await personalWorkspaceProviderService.createGQLRequest(
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

const selectRequest = async (requestID: string) => {
  const collectionID = requestID.split("/").slice(0, -1).join("/")

  const collectionHandleResult =
    await personalWorkspaceProviderService.getGQLCollectionHandle(
      props.workspaceHandle,
      collectionID
    )

  if (E.isLeft(collectionHandleResult)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const collectionHandle = collectionHandleResult.right

  const collectionHandleRef = collectionHandle.get()

  if (collectionHandleRef.value.type === "invalid") {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  const requestHandleResult =
    await personalWorkspaceProviderService.getGQLRequestHandle(
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
    // REQUEST_INVALIDATED
    return
  }

  const cascadingAuthHeadersHandleResult =
    await personalWorkspaceProviderService.getGQLCollectionLevelAuthHeadersView(
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

  if (possibleTab) {
    tabs.setActiveTab(possibleTab.value.id)
  } else if (requestHandleRef.value.type === "ok") {
    // If not, open the request in a new tab
    tabs.createNewTab({
      request: requestHandleRef.value.data.request as HoppGQLRequest,
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

const dropRequest = async (payload: {
  folderPath: string
  requestIndex: string
  collectionIndex: string | null
}) => {
  const {
    folderPath: parentCollectionID,
    requestIndex: requestIndexPos,
    collectionIndex: destinationCollectionID,
  } = payload

  if (!requestIndexPos || !parentCollectionID || !destinationCollectionID) {
    return
  }

  const requestHandleResult =
    await personalWorkspaceProviderService.getGQLRequestHandle(
      props.workspaceHandle,
      `${parentCollectionID}/${requestIndexPos}`
    )

  if (E.isLeft(requestHandleResult)) {
    // INVALID_COLLECTION_HANDLE | INVALID_REQUEST_ID | REQUEST_NOT_FOUND
    return
  }

  const requestHandle = requestHandleResult.right

  const result = await personalWorkspaceProviderService.moveGQLRequest(
    requestHandle,
    destinationCollectionID.toString()
  )

  if (E.isLeft(result)) {
    // INVALID_REQUEST_HANDLE
    return
  }

  const collectionHandleResult =
    await personalWorkspaceProviderService.getGQLCollectionHandle(
      props.workspaceHandle,
      destinationCollectionID.toString()
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

  const cascadingAuthHeadersHandleResult =
    await personalWorkspaceProviderService.getGQLCollectionLevelAuthHeadersView(
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
      getRequestsByPath(gqlCollectionState.value, destinationCollectionID)
        .length - 1
    ).toString()

    requestHandleRef.value.data.collectionID = destinationCollectionID
    requestHandleRef.value.data.requestID = `${destinationCollectionID}/${newRequestIndexPos}`

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
}

/**
 * Checks if the collection is already in the root
 * @param id - path of the collection
 * @returns boolean - true if the collection is already in the root
 */
const isAlreadyInRoot = (id: string) => {
  const indexPath = id.split("/")
  return indexPath.length === 1
}

const editCollectionProperties = async (collectionID: string) => {
  const parentCollectionID = collectionID.split("/").slice(0, -1).join("/") // remove last folder to get parent folder

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

  const collectionHandleResult =
    await personalWorkspaceProviderService.getGQLCollectionHandle(
      props.workspaceHandle,
      collectionID
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
      await personalWorkspaceProviderService.getGQLCollectionLevelAuthHeadersView(
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
    gqlCollectionState.value,
    collectionID.split("/").map((id) => parseInt(id))
  )

  editingProperties.value = {
    collection,
    isRootCollection: isAlreadyInRoot(collectionID),
    path: collectionID,
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

  const collectionHandleResult =
    await personalWorkspaceProviderService.getGQLCollectionHandle(
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

  const result = await personalWorkspaceProviderService.updateGQLCollection(
    collectionHandle,
    collection
  )

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  const cascadingAuthHeadersHandleResult =
    await personalWorkspaceProviderService.getGQLCollectionLevelAuthHeadersView(
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

  nextTick(() => {
    updateInheritedPropertiesForAffectedRequests(
      path,
      {
        auth,
        headers,
      },
      "graphql"
    )
  })

  displayModalEditProperties(false)
}

const removeCollection = async (collectionID: string) => {
  const collectionHandleResult =
    await personalWorkspaceProviderService.getGQLCollectionHandle(
      props.workspaceHandle,
      collectionID
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

  const result =
    await personalWorkspaceProviderService.removeGQLCollection(collectionHandle)

  if (E.isLeft(result)) {
    // INVALID_COLLECTION_HANDLE
    return
  }

  toast.success(`${t("state.deleted")}`)
}

const removeRequest = async (requestID: string) => {
  const requestHandleResult =
    await personalWorkspaceProviderService.getGQLRequestHandle(
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

  const result =
    await personalWorkspaceProviderService.removeGQLRequest(requestHandle)

  if (E.isLeft(result)) {
    // INVALID_WORKSPACE_HANDLE
    return
  }

  toast.success(`${t("state.deleted")}`)
}

const resetSelectedData = () => {
  editingCollection.value = null
  editingChildCollection.value = null
  editingRequest.value = null

  editingCollectionID.value = null
  editingRequestID.value = null
}

defineActionHandler("collection.new", () => {
  displayModalAdd(true)
})
defineActionHandler("modals.collection.import", () => {
  displayModalImportExport(true)
})
</script>
