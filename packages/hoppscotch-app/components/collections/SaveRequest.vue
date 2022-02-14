<template>
  <SmartModal
    v-if="show"
    :title="`${t('collection.save_as')}`"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
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
          :doc="false"
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
          @update-collection="updateColl"
          @update-coll-type="onUpdateCollType"
        />
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary
          :label="`${t('action.save')}`"
          @click.native="saveRequestAs"
        />
        <ButtonSecondary
          :label="`${t('action.cancel')}`"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "@nuxtjs/composition-api"
import * as E from "fp-ts/Either"
import { HoppGQLRequest, isHoppRESTRequest } from "@hoppscotch/data"
import cloneDeep from "lodash/cloneDeep"
import {
  editGraphqlRequest,
  editRESTRequest,
  saveGraphqlRequestAs,
  saveRESTRequestAs,
} from "~/newstore/collections"
import { getGQLSession, useGQLRequestName } from "~/newstore/GQLSession"
import {
  getRESTRequest,
  setRESTSaveContext,
  useRESTRequestName,
} from "~/newstore/RESTSession"
import { useI18n, useToast } from "~/helpers/utils/composables"
import { runMutation } from "~/helpers/backend/GQLClient"
import {
  CreateRequestInCollectionDocument,
  UpdateRequestDocument,
} from "~/helpers/backend/graphql"

const t = useI18n()

type CollectionType =
  | {
      type: "my-collections"
    }
  | {
      type: "team-collections"
      // TODO: Figure this type out
      selectedTeam: {
        id: string
      }
    }

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
  | {
      pickedType: "gql-my-request"
      folderPath: string
      requestIndex: number
    }
  | {
      pickedType: "gql-my-folder"
      folderPath: string
    }
  | {
      pickedType: "gql-my-collection"
      collectionIndex: number
    }

const props = defineProps<{
  mode: "rest" | "graphql"
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const toast = useToast()

// TODO: Use a better implementation with computed ?
// This implementation can't work across updates to mode prop (which won't happen tho)
const requestName =
  props.mode === "rest" ? useRESTRequestName() : useGQLRequestName()

const requestData = reactive({
  name: requestName,
  collectionIndex: undefined as number | undefined,
  folderName: undefined as number | undefined,
  requestIndex: undefined as number | undefined,
})

const collectionsType = ref<CollectionType>({
  type: "my-collections",
})

// TODO: Figure this type out
const picked = ref<Picked | null>(null)

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

// All the methods
const onUpdateCollType = (newCollType: CollectionType) => {
  collectionsType.value = newCollType
}

const onSelect = ({ picked: pickedVal }: { picked: Picked | null }) => {
  picked.value = pickedVal
}

const hideModal = () => {
  picked.value = null
  emit("hide-modal")
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

  // Clone Deep because objects are shared by reference so updating
  // just one bit will update other referenced shared instances
  const requestUpdated =
    props.mode === "rest"
      ? cloneDeep(getRESTRequest())
      : cloneDeep(getGQLSession().request)

  // // Filter out all REST file inputs
  // if (this.mode === "rest" && requestUpdated.bodyParams) {
  //   requestUpdated.bodyParams = requestUpdated.bodyParams.map((param) =>
  //     param?.value?.[0] instanceof File ? { ...param, value: "" } : param
  //   )
  // }

  if (picked.value.pickedType === "my-request") {
    if (!isHoppRESTRequest(requestUpdated))
      throw new Error("requestUpdated is not a REST Request")

    editRESTRequest(
      picked.value.folderPath,
      picked.value.requestIndex,
      requestUpdated
    )

    setRESTSaveContext({
      originLocation: "user-collection",
      folderPath: picked.value.folderPath,
      requestIndex: picked.value.requestIndex,
    })

    requestSaved()
  } else if (picked.value.pickedType === "my-folder") {
    if (!isHoppRESTRequest(requestUpdated))
      throw new Error("requestUpdated is not a REST Request")

    const insertionIndex = saveRESTRequestAs(
      picked.value.folderPath,
      requestUpdated
    )

    setRESTSaveContext({
      originLocation: "user-collection",
      folderPath: picked.value.folderPath,
      requestIndex: insertionIndex,
    })

    requestSaved()
  } else if (picked.value.pickedType === "my-collection") {
    if (!isHoppRESTRequest(requestUpdated))
      throw new Error("requestUpdated is not a REST Request")

    const insertionIndex = saveRESTRequestAs(
      `${picked.value.collectionIndex}`,
      requestUpdated
    )

    setRESTSaveContext({
      originLocation: "user-collection",
      folderPath: `${picked.value.collectionIndex}`,
      requestIndex: insertionIndex,
    })

    requestSaved()
  } else if (picked.value.pickedType === "teams-request") {
    if (!isHoppRESTRequest(requestUpdated))
      throw new Error("requestUpdated is not a REST Request")

    if (collectionsType.value.type !== "team-collections")
      throw new Error("Collections Type mismatch")

    runMutation(UpdateRequestDocument, {
      requestID: picked.value.requestID,
      data: {
        request: JSON.stringify(requestUpdated),
        title: requestUpdated.name,
      },
    })().then((result) => {
      if (E.isLeft(result)) {
        toast.error(`${t("profile.no_permission")}`)
        throw new Error(`${result.left}`)
      } else {
        requestSaved()
      }
    })

    setRESTSaveContext({
      originLocation: "team-collection",
      requestID: picked.value.requestID,
    })
  } else if (picked.value.pickedType === "teams-folder") {
    if (!isHoppRESTRequest(requestUpdated))
      throw new Error("requestUpdated is not a REST Request")

    if (collectionsType.value.type !== "team-collections")
      throw new Error("Collections Type mismatch")

    const result = await runMutation(CreateRequestInCollectionDocument, {
      collectionID: picked.value.folderID,
      data: {
        request: JSON.stringify(requestUpdated),
        teamID: collectionsType.value.selectedTeam.id,
        title: requestUpdated.name,
      },
    })()

    if (E.isLeft(result)) {
      toast.error(`${t("profile.no_permission")}`)
      console.error(result.left)
    } else {
      setRESTSaveContext({
        originLocation: "team-collection",
        requestID: result.right.createRequestInCollection.id,
        teamID: collectionsType.value.selectedTeam.id,
        collectionID: picked.value.folderID,
      })

      requestSaved()
    }
  } else if (picked.value.pickedType === "teams-collection") {
    if (!isHoppRESTRequest(requestUpdated))
      throw new Error("requestUpdated is not a REST Request")

    if (collectionsType.value.type !== "team-collections")
      throw new Error("Collections Type mismatch")

    const result = await runMutation(CreateRequestInCollectionDocument, {
      collectionID: picked.value.collectionID,
      data: {
        title: requestUpdated.name,
        request: JSON.stringify(requestUpdated),
        teamID: collectionsType.value.selectedTeam.id,
      },
    })()

    if (E.isLeft(result)) {
      toast.error(`${t("profile.no_permission")}`)
      console.error(result.left)
    } else {
      setRESTSaveContext({
        originLocation: "team-collection",
        requestID: result.right.createRequestInCollection.id,
        teamID: collectionsType.value.selectedTeam.id,
        collectionID: picked.value.collectionID,
      })

      requestSaved()
    }
  } else if (picked.value.pickedType === "gql-my-request") {
    // TODO: Check for GQL request ?
    editGraphqlRequest(
      picked.value.folderPath,
      picked.value.requestIndex,
      requestUpdated as HoppGQLRequest
    )

    requestSaved()
  } else if (picked.value.pickedType === "gql-my-folder") {
    // TODO: Check for GQL request ?
    saveGraphqlRequestAs(
      picked.value.folderPath,
      requestUpdated as HoppGQLRequest
    )

    requestSaved()
  } else if (picked.value.pickedType === "gql-my-collection") {
    // TODO: Check for GQL request ?
    saveGraphqlRequestAs(
      `${picked.value.collectionIndex}`,
      requestUpdated as HoppGQLRequest
    )

    requestSaved()
  }
}

const requestSaved = () => {
  toast.success(`${t("request.added")}`)
  hideModal()
}

const updateColl = (ev: CollectionType["type"]) => {
  collectionsType.value.type = ev
}
</script>
