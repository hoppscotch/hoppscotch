<!-- eslint-disable prettier/prettier -->
<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="`${t('collection.save_as')}`"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col">
        <HoppSmartInput
          v-model="requestName"
          styles="relative flex"
          placeholder=" "
          :label="t('request.name')"
          input-styles="floating-input"
          @submit="saveRequestAs"
        />

        <label class="p-4">
          {{ t("collection.select_location") }}
        </label>
        <!-- <CollectionsGraphql
          v-if="mode === 'graphql'"
          :picked="picked"
          :save-request="true"
          @select="onSelect"
        /> -->
        <!-- <Collections
          v-else
          :picked="picked"
          :save-request="true"
          @select="onSelect"
          @update-team="updateTeam"
          @update-collection-type="updateCollectionType"
        /> -->
        <NewCollections
          :picked="picked"
          :save-request="true"
          :platform="mode"
          @select="onSelect"
        />
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="`${t('action.save')}`"
          :loading="modalLoadingState"
          outline
          @click="saveRequestAs"
        />
        <HoppButtonSecondary
          :label="`${t('action.cancel')}`"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import {
  HoppGQLRequest,
  HoppRESTRequest,
  isHoppRESTRequest,
} from "@hoppscotch/data"
import { computedWithControl } from "@vueuse/core"
import { useService } from "dioc/vue"
import * as E from "fp-ts/Either"
import { cloneDeep } from "lodash-es"
import { computed, nextTick, reactive, ref, watch } from "vue"

import { Picked } from "~/helpers/types/HoppPicked"
import { cascadeParentCollectionForHeaderAuth } from "~/newstore/collections"
import { NewWorkspaceService } from "~/services/new-workspace"
import { GQLTabService } from "~/services/tab/graphql"
import { RESTTabService } from "~/services/tab/rest"

const t = useI18n()
const toast = useToast()

const RESTTabs = useService(RESTTabService)
const GQLTabs = useService(GQLTabService)
const workspaceService = useService(NewWorkspaceService)

// type SelectedTeam = GetMyTeamsQuery["myTeams"][number] | undefined

// type CollectionType =
//   | {
//       type: "team-collections"
//       selectedTeam: SelectedTeam
//     }
//   | { type: "my-collections"; selectedTeam: undefined }

const props = withDefaults(
  defineProps<{
    show: boolean
    mode: "rest" | "graphql"
    request?: HoppRESTRequest | HoppGQLRequest | null
  }>(),
  {
    show: false,
    mode: "rest",
    request: null,
  }
)

const emit = defineEmits<{
  (
    event: "edit-request",
    payload: {
      folderPath: string
      requestIndex: string
      request: HoppRESTRequest
    }
  ): void
  (e: "hide-modal"): void
}>()

const gqlRequestName = computedWithControl(
  () => GQLTabs.currentActiveTab.value,
  () => GQLTabs.currentActiveTab.value.document.request.name
)

const restRequestName = computedWithControl(
  () => RESTTabs.currentActiveTab.value,
  () => RESTTabs.currentActiveTab.value.document.request.name
)

const reqName = computed(() => {
  if (props.request) {
    return props.request.name
  } else if (props.mode === "rest") {
    return restRequestName.value
  }
  return gqlRequestName.value
})

const requestName = ref(reqName.value)

watch(
  () => [RESTTabs.currentActiveTab.value, GQLTabs.currentActiveTab.value],
  () => {
    if (props.mode === "rest") {
      requestName.value =
        RESTTabs.currentActiveTab.value?.document.request.name ?? ""
    } else {
      requestName.value =
        GQLTabs.currentActiveTab.value?.document.request.name ?? ""
    }
  }
)

const requestData = reactive({
  name: requestName,
  collectionIndex: undefined as number | undefined,
  folderName: undefined as number | undefined,
  requestIndex: undefined as number | undefined,
})

// const collectionsType = ref<CollectionType>({
//   type: "my-collections",
//   selectedTeam: undefined,
// })

const picked = ref<Picked | null>(null)

const modalLoadingState = ref(false)

// Resets
watch(
  () => requestData.collectionIndex,
  () => {
    requestData.folderName = undefined
    requestData.requestIndex = undefined
  }
)
watch(
  () => requestData.folderName,
  () => {
    requestData.requestIndex = undefined
  }
)

// TODO: To be removed
// const updateTeam = (newTeam: SelectedTeam) => {
//   collectionsType.value.selectedTeam = newTeam
// }

// const updateCollectionType = (type: CollectionType["type"]) => {
//   collectionsType.value.type = type
// }

const onSelect = (pickedVal: Picked | null) => {
  picked.value = pickedVal
}

const saveRequestAs = async () => {
  if (!requestName.value) {
    toast.error(`${t("error.empty_req_name")}`)
    return
  }
  if (picked.value === null) {
    toast.error(`${t("collection.select")}`)
    return
  }

  const updatedRequest =
    props.mode === "rest"
      ? cloneDeep(RESTTabs.currentActiveTab.value.document.request)
      : cloneDeep(GQLTabs.currentActiveTab.value.document.request)

  updatedRequest.name = requestName.value

  if (!workspaceService.activeWorkspaceHandle.value) {
    return
  }

  if (
    picked.value.pickedType === "my-collection" ||
    picked.value.pickedType === "my-folder"
  ) {
    if (!isHoppRESTRequest(updatedRequest))
      throw new Error("requestUpdated is not a REST Request")

    const collectionPathIndex =
      picked.value.pickedType === "my-collection"
        ? picked.value.collectionIndex.toString()
        : picked.value.folderPath

    const collectionHandleResult = await workspaceService.getCollectionHandle(
      workspaceService.activeWorkspaceHandle.value,
      collectionPathIndex,
      "REST"
    )

    if (E.isLeft(collectionHandleResult)) {
      // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
      return
    }

    const collectionHandle = collectionHandleResult.right

    const requestHandleResult = await workspaceService.createRESTRequest(
      collectionHandle,
      updatedRequest
    )

    if (E.isLeft(requestHandleResult)) {
      // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_HANDLE
      return
    }

    const requestHandle = requestHandleResult.right

    const requestHandleRef = requestHandle.get()

    if (requestHandleRef.value.type === "invalid") {
      // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_HANDLE
      return
    }

    RESTTabs.currentActiveTab.value.document = {
      request: updatedRequest,
      isDirty: false,
      saveContext: {
        originLocation: "workspace-user-collection",
        requestHandle,
      },
    }

    requestSaved()
  } else if (picked.value.pickedType === "my-request") {
    if (!isHoppRESTRequest(updatedRequest))
      throw new Error("updatedRequest is not a REST Request")

    const collectionHandleResult = await workspaceService.getCollectionHandle(
      workspaceService.activeWorkspaceHandle.value,
      picked.value.folderPath,
      "REST"
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

    const requestHandleResult = await workspaceService.getRequestHandle(
      workspaceService.activeWorkspaceHandle.value,
      `${picked.value.folderPath}/${picked.value.requestIndex.toString()}`,
      "REST"
    )

    if (E.isLeft(requestHandleResult)) {
      // INVALID_COLLECTION_HANDLE | INVALID_REQUEST_ID | REQUEST_NOT_FOUND
      return
    }

    const requestHandle = requestHandleResult.right

    const requestHandleRef = requestHandle.get()

    if (requestHandleRef.value.type === "invalid") {
      // INVALID_WORKSPACE_HANDLE
      return
    }

    const updateRequestResult = await workspaceService.updateRESTRequest(
      requestHandle,
      updatedRequest
    )

    if (E.isLeft(updateRequestResult)) {
      // INVALID_WORKSPACE_HANDLE | INVALID_REQUEST_HANDLE
      return
    }

    RESTTabs.currentActiveTab.value.document = {
      request: updatedRequest,
      isDirty: false,
      saveContext: {
        originLocation: "workspace-user-collection",
        requestHandle,
      },
    }

    const cascadingAuthHeadersHandleResult =
      await workspaceService.getCollectionLevelAuthHeadersView(
        collectionHandle,
        "REST"
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

    RESTTabs.currentActiveTab.value.document.inheritedProperties = {
      auth,
      headers,
    }

    requestSaved()
  } else if (
    picked.value.pickedType === "gql-my-collection" ||
    picked.value.pickedType === "gql-my-folder"
  ) {
    if (HoppGQLRequest.safeParse(updatedRequest).type === "err") {
      throw new Error("updatedRequest is not a GQL Request")
    }

    const collectionPathIndex =
      picked.value.pickedType === "gql-my-collection"
        ? picked.value.collectionIndex.toString()
        : picked.value.folderPath

    const collectionHandleResult = await workspaceService.getCollectionHandle(
      workspaceService.activeWorkspaceHandle.value,
      collectionPathIndex,
      "GQL"
    )

    if (E.isLeft(collectionHandleResult)) {
      // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_ID | INVALID_PATH
      return
    }

    const collectionHandle = collectionHandleResult.right

    const requestHandleResult = await workspaceService.createGQLRequest(
      collectionHandle,
      updatedRequest as HoppGQLRequest
    )

    if (E.isLeft(requestHandleResult)) {
      // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_HANDLE
      return
    }

    const requestHandle = requestHandleResult.right

    const requestHandleRef = requestHandle.get()

    if (requestHandleRef.value.type === "invalid") {
      // INVALID_WORKSPACE_HANDLE | INVALID_COLLECTION_HANDLE
      return
    }

    GQLTabs.currentActiveTab.value.document = {
      request: updatedRequest as HoppGQLRequest,
      isDirty: false,
      saveContext: {
        originLocation: "workspace-user-collection",
        requestHandle,
      },
    }

    requestSaved()
  } else if (picked.value.pickedType === "gql-my-request") {
    if (HoppGQLRequest.safeParse(updatedRequest).type === "err") {
      throw new Error("updatedRequest is not a GQL Request")
    }

    const collectionHandleResult = await workspaceService.getCollectionHandle(
      workspaceService.activeWorkspaceHandle.value,
      picked.value.folderPath,
      "GQL"
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

    const requestHandleResult = await workspaceService.getRequestHandle(
      workspaceService.activeWorkspaceHandle.value,
      `${picked.value.folderPath}/${picked.value.requestIndex.toString()}`,
      "GQL"
    )

    if (E.isLeft(requestHandleResult)) {
      // INVALID_COLLECTION_HANDLE | INVALID_REQUEST_ID | REQUEST_NOT_FOUND
      return
    }

    const requestHandle = requestHandleResult.right

    const requestHandleRef = requestHandle.get()

    if (requestHandleRef.value.type === "invalid") {
      // INVALID_WORKSPACE_HANDLE
      return
    }

    const updateRequestResult = await workspaceService.updateGQLRequest(
      requestHandle,
      updatedRequest as HoppGQLRequest
    )

    if (E.isLeft(updateRequestResult)) {
      // INVALID_WORKSPACE_HANDLE | INVALID_REQUEST_HANDLE
      return
    }

    GQLTabs.currentActiveTab.value.document = {
      request: updatedRequest as HoppGQLRequest,
      isDirty: false,
      saveContext: {
        originLocation: "workspace-user-collection",
        requestHandle,
      },
    }

    const cascadingAuthHeadersHandleResult =
      await workspaceService.getCollectionLevelAuthHeadersView(
        collectionHandle,
        "GQL"
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

    GQLTabs.currentActiveTab.value.document.inheritedProperties = {
      auth,
      headers,
    }

    requestSaved()
  }
  // TODO: To be removed
  // else if (picked.value.pickedType === "teams-collection") {
  //   if (!isHoppRESTRequest(updatedRequest))
  //     throw new Error("requestUpdated is not a REST Request")

  //   updateTeamCollectionOrFolder(picked.value.collectionID, updatedRequest)

  //   platform.analytics?.logEvent({
  //     type: "HOPP_SAVE_REQUEST",
  //     createdNow: true,
  //     platform: "rest",
  //     workspaceType: "team",
  //   })
  // } else if (picked.value.pickedType === "teams-folder") {
  //   if (!isHoppRESTRequest(updatedRequest))
  //     throw new Error("requestUpdated is not a REST Request")

  //   updateTeamCollectionOrFolder(picked.value.folderID, updatedRequest)

  //   platform.analytics?.logEvent({
  //     type: "HOPP_SAVE_REQUEST",
  //     createdNow: true,
  //     platform: "rest",
  //     workspaceType: "team",
  //   })
  // } else if (picked.value.pickedType === "teams-request") {
  //   if (!isHoppRESTRequest(updatedRequest))
  //     throw new Error("requestUpdated is not a REST Request")

  //   if (
  //     collectionsType.value.type !== "team-collections" ||
  //     !collectionsType.value.selectedTeam
  //   )
  //     throw new Error("Collections Type mismatch")

  //   modalLoadingState.value = true

  //   const data = {
  //     request: JSON.stringify(updatedRequest),
  //     title: updatedRequest.name,
  //   }

  //   platform.analytics?.logEvent({
  //     type: "HOPP_SAVE_REQUEST",
  //     createdNow: false,
  //     platform: "rest",
  //     workspaceType: "team",
  //   })

  //   pipe(
  //     updateTeamRequest(picked.value.requestID, data),
  //     TE.match(
  //       (err: GQLError<string>) => {
  //         toast.error(`${getErrorMessage(err)}`)
  //         modalLoadingState.value = false
  //       },
  //       () => {
  //         modalLoadingState.value = false
  //         requestSaved()
  //       }
  //     )
  //   )()
  // }
}

/**
 * Updates a team collection or folder and sets the save context to the updated request
 * @param collectionID - ID of the collection or folder
 * @param requestUpdated - Updated request
 */
// const updateTeamCollectionOrFolder = (
//   collectionID: string,
//   requestUpdated: HoppRESTRequest
// ) => {
//   if (
//     collectionsType.value.type !== "team-collections" ||
//     !collectionsType.value.selectedTeam
//   )
//     throw new Error("Collections Type mismatch")

//   modalLoadingState.value = true

//   const data = {
//     title: requestUpdated.name,
//     request: JSON.stringify(requestUpdated),
//     teamID: collectionsType.value.selectedTeam.id,
//   }
//   pipe(
//     createRequestInCollection(collectionID, data),
//     TE.match(
//       (err: GQLError<string>) => {
//         toast.error(`${getErrorMessage(err)}`)
//         modalLoadingState.value = false
//       },
//       (result) => {
//         const { createRequestInCollection } = result

//         RESTTabs.currentActiveTab.value.document = {
//           request: requestUpdated,
//           isDirty: false,
//           saveContext: {
//             originLocation: "team-collection",
//             requestID: createRequestInCollection.id,
//             collectionID: createRequestInCollection.collection.id,
//             teamID: createRequestInCollection.collection.team.id,
//           },
//         }

//         modalLoadingState.value = false
//         requestSaved()
//       }
//     )
//   )()
// }

const requestSaved = () => {
  toast.success(`${t("request.added")}`)
  nextTick(() => {
    RESTTabs.currentActiveTab.value.document.isDirty = false
  })
  hideModal()
}

const hideModal = () => {
  picked.value = null
  emit("hide-modal")
}

// const getErrorMessage = (err: GQLError<string>) => {
//   console.error(err)
//   if (err.type === "network_error") {
//     return t("error.network_error")
//   }
//   switch (err.error) {
//     case "team_coll/short_title":
//       return t("collection.name_length_insufficient")
//     case "team/invalid_coll_id":
//       return t("team.invalid_id")
//     case "team/not_required_role":
//       return t("profile.no_permission")
//     case "team_req/not_required_role":
//       return t("profile.no_permission")
//     case "Forbidden resource":
//       return t("profile.no_permission")
//     default:
//       return t("error.something_went_wrong")
//   }
// }
</script>
