<template>
  <SmartModal
    v-if="show"
    dialog
    :title="`${t('collection.save_as')}`"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col">
        <div class="relative flex">
          <input
            id="selectLabelSaveReq"
            v-model="requestName"
            v-focus
            class="input floating-input"
            placeholder=" "
            type="text"
            autocomplete="off"
            @keyup.enter="saveRequestAs"
          />
          <label for="selectLabelSaveReq">
            {{ t("request.name") }}
          </label>
        </div>
        <label class="p-4">
          {{ t("collection.select_location") }}
        </label>
        <CollectionsGraphql
          v-if="mode === 'graphql'"
          :show-coll-actions="false"
          :picked="picked"
          :saving-mode="true"
          @select="onSelect"
        />
        <Collections
          v-else
          :picked="picked"
          :save-request="true"
          @select="onSelect"
          @update-team="updateTeam"
          @update-collection-type="updateCollectionType"
        />
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <ButtonPrimary
          :label="`${t('action.save')}`"
          :loading="modalLoadingState"
          outline
          @click="saveRequestAs"
        />
        <ButtonSecondary
          :label="`${t('action.cancel')}`"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { HoppRESTRequest, isHoppRESTRequest } from "@hoppscotch/data"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { cloneDeep } from "lodash-es"
import { reactive, ref, watch } from "vue"
import { GetMyTeamsQuery } from "~/helpers/backend/graphql"
import {
  createRequestInCollection,
  updateTeamRequest,
} from "~/helpers/backend/mutations/TeamRequest"
import { Picked } from "~/helpers/types/HoppRESTPicked"
import { getGQLSession, useGQLRequestName } from "~/newstore/GQLSession"
import {
  getRESTRequest,
  setRESTSaveContext,
  useRESTRequestName,
} from "~/newstore/RESTSession"
import { editRESTRequest, saveRESTRequestAs } from "~/newstore/collections"
import { GQLError } from "~/helpers/backend/GQLClient"

const t = useI18n()
const toast = useToast()

type SelectedTeam = GetMyTeamsQuery["myTeams"][number] | undefined

type CollectionType =
  | {
      type: "team-collections"
      selectedTeam: SelectedTeam
    }
  | { type: "my-collections"; selectedTeam: undefined }

const props = withDefaults(
  defineProps<{
    show: boolean
    mode: "rest" | "graphql"
  }>(),
  {
    show: false,
    mode: "rest",
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

const requestName = ref(
  props.mode === "rest" ? useRESTRequestName() : useGQLRequestName()
)

const requestData = reactive({
  name: requestName,
  collectionIndex: undefined as number | undefined,
  folderName: undefined as number | undefined,
  requestIndex: undefined as number | undefined,
})

const collectionsType = ref<CollectionType>({
  type: "my-collections",
  selectedTeam: undefined,
})

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

const updateTeam = (newTeam: SelectedTeam) => {
  collectionsType.value.selectedTeam = newTeam
}

const updateCollectionType = (type: CollectionType["type"]) => {
  collectionsType.value.type = type
}

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

  console.log("picked", picked.value)

  const requestUpdated =
    props.mode === "rest"
      ? cloneDeep(getRESTRequest())
      : cloneDeep(getGQLSession().request)

  if (!isHoppRESTRequest(requestUpdated))
    throw new Error("requestUpdated is not a REST Request")

  if (picked.value.pickedType === "my-collection") {
    const insertionIndex = saveRESTRequestAs(
      `${picked.value.collectionIndex}`,
      requestUpdated
    )

    setRESTSaveContext({
      originLocation: "user-collection",
      folderPath: `${picked.value.collectionIndex}`,
      requestIndex: insertionIndex,
      req: requestUpdated,
    })

    requestSaved()
  } else if (picked.value.pickedType === "my-folder") {
    const insertionIndex = saveRESTRequestAs(
      picked.value.folderPath,
      requestUpdated
    )

    setRESTSaveContext({
      originLocation: "user-collection",
      folderPath: picked.value.folderPath,
      requestIndex: insertionIndex,
      req: requestUpdated,
    })

    requestSaved()
  } else if (picked.value.pickedType === "my-request") {
    editRESTRequest(
      picked.value.folderPath,
      picked.value.requestIndex,
      requestUpdated
    )

    setRESTSaveContext({
      originLocation: "user-collection",
      folderPath: picked.value.folderPath,
      requestIndex: picked.value.requestIndex,
      req: requestUpdated,
    })

    requestSaved()
  } else if (picked.value.pickedType === "teams-collection") {
    updateTeamCollectionOrFolder(picked.value.collectionID, requestUpdated)
  } else if (picked.value.pickedType === "teams-folder") {
    updateTeamCollectionOrFolder(picked.value.folderID, requestUpdated)
  } else if (picked.value.pickedType === "teams-request") {
    if (
      collectionsType.value.type !== "team-collections" ||
      !collectionsType.value.selectedTeam
    )
      throw new Error("Collections Type mismatch")

    modalLoadingState.value = true

    const data = {
      request: JSON.stringify(requestUpdated),
      title: requestUpdated.name,
    }

    pipe(
      updateTeamRequest(picked.value.requestID, data),
      TE.match(
        (err: GQLError<string>) => {
          toast.error(`${getErrorMessage(err)}`)
          modalLoadingState.value = false
        },
        () => {
          modalLoadingState.value = false
          requestSaved()
        }
      )
    )()
  }
  // TODO: Add graphQL support
}

/**
 * Updates a team collection or folder and sets the save context to the updated request
 * @param collectionID - ID of the collection or folder
 * @param requestUpdated - Updated request
 */
const updateTeamCollectionOrFolder = (
  collectionID: string,
  requestUpdated: HoppRESTRequest
) => {
  if (
    collectionsType.value.type !== "team-collections" ||
    !collectionsType.value.selectedTeam
  )
    throw new Error("Collections Type mismatch")

  modalLoadingState.value = true

  const data = {
    title: requestUpdated.name,
    request: JSON.stringify(requestUpdated),
    teamID: collectionsType.value.selectedTeam.id,
  }
  pipe(
    createRequestInCollection(collectionID, data),
    TE.match(
      (err: GQLError<string>) => {
        toast.error(`${getErrorMessage(err)}`)
        modalLoadingState.value = false
      },
      (result) => {
        const { createRequestInCollection } = result

        setRESTSaveContext({
          originLocation: "team-collection",
          requestID: createRequestInCollection.id,
          collectionID: createRequestInCollection.collection.id,
          teamID: createRequestInCollection.collection.team.id,
          req: requestUpdated,
        })
        modalLoadingState.value = false
        requestSaved()
      }
    )
  )()
}

const requestSaved = () => {
  toast.success(`${t("request.added")}`)
  hideModal()
}

const hideModal = () => {
  picked.value = null
  emit("hide-modal")
}

const getErrorMessage = (err: GQLError<string>) => {
  if (err.type === "network_error") {
    console.error(err)
    return t("error.network_error")
  } else {
    switch (err.error) {
      case "team_coll/short_title":
        console.error(err)
        return t("collection.name_length_insufficient")
      case "team/invalid_coll_id":
        console.error(err)
        return t("team.invalid_id")
      case "team/not_required_role":
        console.error(err)
        return t("profile.no_permission")
      case "team_req/not_required_role":
        console.error(err)
        return t("profile.no_permission")
      case "Forbidden resource":
        console.error(err)
        return t("profile.no_permission")
      default:
        console.error(err)
        return t("error.something_went_wrong")
    }
  }
}
</script>
