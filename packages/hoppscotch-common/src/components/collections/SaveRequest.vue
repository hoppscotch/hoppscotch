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
        <div class="flex gap-1">
          <HoppSmartInput
            v-model="requestName"
            class="flex-grow"
            styles="relative flex"
            placeholder=" "
            :label="t('request.name')"
            input-styles="floating-input"
            @submit="saveRequestAs"
          />
          <HoppButtonSecondary
            v-if="canDoRequestNameGeneration"
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconSparkle"
            :disabled="isGenerateRequestNamePending"
            class="rounded-md"
            :class="{
              'animate-pulse': isGenerateRequestNamePending,
            }"
            :title="t('ai_experiments.generate_request_name')"
            @click="
              async () => {
                await generateRequestName(requestContext)
                submittedFeedback = false
              }
            "
          />
        </div>

        <label class="p-4">
          {{ t("collection.select_location") }}
        </label>

        <!-- TODO: Remove the below check once GQL collections are ported to the new architecture -->
        <div v-if="!activeWorkspaceHandle" class="p-4">
          {{ t("workspace.no_workspace_selected") }}
        </div>

        <CollectionsGraphql
          v-else-if="mode === 'graphql'"
          :picked="picked"
          :save-request="true"
          @select="onSelect"
        />

        <NewCollections
          v-else
          :picked="picked"
          :save-request="true"
          platform="rest"
          @select="onSelect"
        />
      </div>
    </template>
    <template #footer>
      <div class="flex justify-between items-center w-full">
        <div class="flex space-x-2">
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
        </div>

        <div
          v-if="lastTraceID && !submittedFeedback"
          class="flex items-center gap-2"
        >
          <p>{{ t("ai_experiments.feedback_cta_request_name") }}</p>
          <template v-if="!isSubmitFeedbackPending">
            <HoppButtonSecondary
              :icon="IconThumbsUp"
              outline
              @click="
                async () => {
                  if (lastTraceID) {
                    await submitFeedback('positive', lastTraceID)
                    submittedFeedback = true
                  }
                }
              "
            />
            <HoppButtonSecondary
              :icon="IconThumbsDown"
              outline
              @click="
                async () => {
                  if (lastTraceID) {
                    await submitFeedback('negative', lastTraceID)
                    submittedFeedback = true
                  }
                }
              "
            />
          </template>
          <template v-else>
            <HoppSmartSpinner />
          </template>
        </div>
        <div v-if="submittedFeedback">
          <p>{{ t("ai_experiments.feedback_thank_you") }}</p>
        </div>
      </div>
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
import {
  useRequestNameGeneration,
  useSubmitFeedback,
} from "~/composables/ai-experiments"
import { Picked } from "~/helpers/types/HoppPicked"
import {
  cascadeParentCollectionForProperties,
  editGraphqlRequest,
  saveGraphqlRequestAs,
} from "~/newstore/collections"
import { platform } from "~/platform"
import { NewWorkspaceService } from "~/services/new-workspace"
import { GQLTabService } from "~/services/tab/graphql"
import { RESTTabService } from "~/services/tab/rest"
import IconSparkle from "~icons/lucide/sparkles"
import IconThumbsDown from "~icons/lucide/thumbs-down"
import IconThumbsUp from "~icons/lucide/thumbs-up"
import { handleTokenValidation } from "~/helpers/handleTokenValidation"

const t = useI18n()
const toast = useToast()

const RESTTabs = useService(RESTTabService)
const GQLTabs = useService(GQLTabService)
const workspaceService = useService(NewWorkspaceService)

const activeWorkspaceHandle = workspaceService.activeWorkspaceHandle

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
  () =>
    RESTTabs.currentActiveTab.value.document.type === "request"
      ? RESTTabs.currentActiveTab.value.document.request.name
      : ""
)

const reqName = computed(() => {
  if (props.request) {
    return props.request.name
  } else if (props.mode === "rest") {
    return restRequestName.value
  }
  return gqlRequestName.value
})

const requestContext = computed(() => {
  if (props.request) {
    return props.request
  }

  if (
    props.mode === "rest" &&
    RESTTabs.currentActiveTab.value.document.type === "request"
  ) {
    return RESTTabs.currentActiveTab.value.document.request
  }

  return GQLTabs.currentActiveTab.value.document.request
})

const requestName = ref(reqName.value)

const {
  canDoRequestNameGeneration,
  generateRequestName,
  isGenerateRequestNamePending,
  lastTraceID,
} = useRequestNameGeneration(requestName)

watch(
  () => props.show,
  (newVal) => {
    if (!newVal) {
      submittedFeedback.value = false
      lastTraceID.value = null
    }
  }
)

const submittedFeedback = ref(false)
const { submitFeedback, isSubmitFeedbackPending } = useSubmitFeedback()

watch(
  () => [RESTTabs.currentActiveTab.value, GQLTabs.currentActiveTab.value],
  () => {
    if (
      props.mode === "rest" &&
      RESTTabs.currentActiveTab.value.document.type === "request"
    ) {
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
  const isValidToken = await handleTokenValidation()
  if (!isValidToken) return

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
      ? cloneDeep(
          RESTTabs.currentActiveTab.value.document.type === "request"
            ? RESTTabs.currentActiveTab.value.document.request
            : null
        )
      : cloneDeep(GQLTabs.currentActiveTab.value.document.request)

  if (!updatedRequest) return

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

    const collectionHandleResult =
      await workspaceService.getRESTCollectionHandle(
        workspaceService.activeWorkspaceHandle.value,
        collectionPathIndex
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
      type: "request",
      saveContext: {
        originLocation: "workspace-user-collection",
        requestHandle,
      },
    }

    requestSaved()
  } else if (picked.value.pickedType === "my-request") {
    if (!isHoppRESTRequest(updatedRequest))
      throw new Error("requestUpdated is not a REST Request")

    const requestHandleResult = await workspaceService.getRESTRequestHandle(
      workspaceService.activeWorkspaceHandle.value,
      `${picked.value.folderPath}/${picked.value.requestIndex.toString()}`
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
      type: "request",
      saveContext: {
        originLocation: "workspace-user-collection",
        requestHandle,
      },
    }

    RESTTabs.currentActiveTab.value.document.inheritedProperties =
      cascadeParentCollectionForProperties(picked.value.folderPath, "rest")

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
  else if (picked.value.pickedType === "gql-my-request") {
    // TODO: Check for GQL request ?
    editGraphqlRequest(
      picked.value.folderPath,
      picked.value.requestIndex,
      updatedRequest as HoppGQLRequest
    )

    GQLTabs.currentActiveTab.value.document = {
      request: updatedRequest as HoppGQLRequest,
      isDirty: false,
      saveContext: {
        originLocation: "user-collection",
        folderPath: picked.value.folderPath,
        requestIndex: picked.value.requestIndex,
      },
    }

    platform.analytics?.logEvent({
      type: "HOPP_SAVE_REQUEST",
      createdNow: false,
      platform: "gql",
      workspaceType: "team",
    })

    GQLTabs.currentActiveTab.value.document.inheritedProperties =
      cascadeParentCollectionForProperties(picked.value.folderPath, "graphql")

    requestSaved("GQL")
  } else if (picked.value.pickedType === "gql-my-folder") {
    // TODO: Check for GQL request ?
    const insertionIndex = saveGraphqlRequestAs(
      picked.value.folderPath,
      updatedRequest as HoppGQLRequest
    )

    GQLTabs.currentActiveTab.value.document = {
      request: updatedRequest as HoppGQLRequest,
      isDirty: false,
      saveContext: {
        originLocation: "user-collection",
        folderPath: picked.value.folderPath,
        requestIndex: insertionIndex,
      },
    }

    platform.analytics?.logEvent({
      type: "HOPP_SAVE_REQUEST",
      createdNow: true,
      platform: "gql",
      workspaceType: "team",
    })

    GQLTabs.currentActiveTab.value.document.inheritedProperties =
      cascadeParentCollectionForProperties(picked.value.folderPath, "graphql")

    requestSaved("GQL")
  } else if (picked.value.pickedType === "gql-my-collection") {
    // TODO: Check for GQL request ?
    const insertionIndex = saveGraphqlRequestAs(
      `${picked.value.collectionIndex}`,
      updatedRequest as HoppGQLRequest
    )

    GQLTabs.currentActiveTab.value.document = {
      request: updatedRequest as HoppGQLRequest,
      isDirty: false,
      saveContext: {
        originLocation: "user-collection",
        folderPath: `${picked.value.collectionIndex}`,
        requestIndex: insertionIndex,
      },
    }

    platform.analytics?.logEvent({
      type: "HOPP_SAVE_REQUEST",
      createdNow: true,
      platform: "gql",
      workspaceType: "team",
    })

    GQLTabs.currentActiveTab.value.document.inheritedProperties =
      cascadeParentCollectionForProperties(
        `${picked.value.collectionIndex}`,
        "graphql"
      )

    requestSaved("GQL")
  }
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
//           type: "request",
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

const requestSaved = (tab: "REST" | "GQL" = "REST") => {
  toast.success(`${t("request.added")}`)
  nextTick(() => {
    if (tab === "REST") {
      RESTTabs.currentActiveTab.value.document.isDirty = false
    } else {
      GQLTabs.currentActiveTab.value.document.isDirty = false
    }
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
