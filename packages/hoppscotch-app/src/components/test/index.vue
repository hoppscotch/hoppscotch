<template>
  <CollectionsChooseType
    :collections-type="collectionsType"
    @update-collection-type="updateCollectionType"
    @update-selected-team="updateSelectedTeam"
  />
  <ButtonSecondary
    :icon="IconPlus"
    :label="t('action.new')"
    class="!rounded-none"
    :disabled="
      collectionsType.type == 'team-collections' &&
      (collectionsType.selectedTeam == undefined ||
        collectionsType.selectedTeam.myRole == 'VIEWER')
    "
    @click="displayModalAdd(true)"
  />
  <SmartTree
    v-if="collectionsType.type === 'my-collections'"
    :adapter="myAdapter"
  >
    <template #content="{ node, toggleChildren, isOpen }">
      <CollectionsMyCollection
        v-if="node.data.type === 'collections'"
        :collection="node.data.data"
        @add-folder="addFolder(node)"
        @remove-collection="removeCollection(node)"
        @toggle-children="toggleChildren"
      />

      <div v-if="node.data.type === 'folders'" class="flex flex-1">
        <CollectionsMyFolder
          :folder="node.data.data"
          :is-open="isOpen"
          @add-folder="addFolder(node)"
          @remove-folder="removeFolder(node)"
          @toggle-children="toggleChildren"
        />
      </div>
      <div v-if="node.data.type === 'requests'" class="flex flex-1">
        <CollectionsMyRequest
          :request="node.data.data"
          :request-index="
            pathToId(node.id)[pathToId(node.id).length - 1].toString()
          "
        />
      </div>
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
          <span class="text-center">
            {{ t("empty.collections") }}
          </span>
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
        <span class="text-center">
          {{ t("empty.collections") }}
        </span>
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
  <SmartTree v-else :adapter="teamAdapter">
    <template #content="{ node, toggleChildren, isOpen }">
      <CollectionsMyCollection
        v-if="node.data.type === 'collections'"
        :collection="node.data.data"
        @add-folder="addFolder(node)"
        @remove-collection="removeCollection(node)"
        @toggle-children="toggleChildren"
      />

      <div v-if="node.data.type === 'folders'" class="flex flex-1">
        <CollectionsMyFolder
          :folder="node.data.data"
          :is-open="isOpen"
          :collections-type="collectionsType"
          @add-folder="addFolder(node)"
          @remove-folder="removeFolder(node)"
          @toggle-children="toggleChildren"
        />
      </div>
      <div v-if="node.data.type === 'requests'" class="flex flex-1">
        <CollectionsMyRequest
          :request="node.data.data"
          :request-index="node.id"
        />
      </div>
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
          <span class="text-center">
            {{ t("empty.collections") }}
          </span>
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
        <span class="text-center">
          {{ t("empty.collections") }}
        </span>
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
  <CollectionsAddFolder
    :show="showModalAddFolder"
    :folder="editingFolder"
    :folder-path="editingFolderPath"
    :loading-state="modalLoadingState"
    @add-folder="onAddFolder($event)"
    @hide-modal="displayModalAddFolder(false)"
  />
  <CollectionsAdd
    :show="showModalAddCollection"
    :loading-state="modalLoadingState"
    @submit="addNewRootCollection"
    @hide-modal="displayModalAdd(false)"
  />
  <SmartConfirmModal
    :show="showConfirmModal"
    :title="confirmModalTitle"
    :loading-state="modalLoadingState"
    @hide-modal="showConfirmModal = false"
    @resolve="resolveConfirmModal"
  />
</template>

<script setup lang="ts">
import IconPlus from "~icons/lucide/plus"
import {
  HoppCollection,
  HoppRESTRequest,
  makeCollection,
} from "@hoppscotch/data"
import { useReadonlyStream } from "~/composables/stream"
import {
  SmartTreeAdapter,
  TreeNode,
  ChildrenResult,
} from "~/helpers/tree/SmartTreeAdapter"
import {
  addRESTCollection,
  addRESTFolder,
  removeRESTCollection,
  removeRESTFolder,
  restCollections$,
} from "~/newstore/collections"
import { computed, Ref, ref, watch } from "vue"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "~/composables/theming"
import { useToast } from "~/composables/toast"
import {
  CreateNewRootCollectionDocument,
  Team,
} from "~/helpers/backend/graphql"
import TeamCollectionAdapter from "~/helpers/teams/TeamCollectionAdapter"
import { TeamCollection } from "~/helpers/teams/TeamCollection"
import { runMutation } from "~/helpers/backend/GQLClient"
import * as E from "fp-ts/Either"

const t = useI18n()
const toast = useToast()

const colorMode = useColorMode()

type CollectionType = {
  type: "my-collections" | "team-collections"
  selectedTeam: Team | undefined
}

const collectionsType = ref<CollectionType>({
  type: "my-collections",
  selectedTeam: undefined,
})

// type HoppCollections = HoppCollection<HoppRESTRequest> | TeamCollection[] | null

const myCollection = useReadonlyStream(restCollections$, [], "deep")
const teamCollectionAdapter = new TeamCollectionAdapter(null)
const teamCollectionList = useReadonlyStream(
  teamCollectionAdapter.collections$,
  []
)
const teamLoadingCollections = teamCollectionAdapter.loadingCollections$

watch(
  () => collectionsType.value.selectedTeam,
  (team) => {
    if (team) {
      teamCollectionAdapter.changeTeamID(team.id)
      console.log("team-changes", teamCollectionList.value)
    }
  }
)

const editingCollectionIndex = ref<number>(0)
const editingCollectionID = ref("")
const editingFolder = ref<HoppCollection<HoppRESTRequest>>()
// const editingFolderName = ref(undefined)
// const editingFolderIndex = ref(undefined)
const editingFolderPath = ref("")
const showModalAddFolder = ref(false)
const showModalAddCollection = ref(false)
const showConfirmModal = ref(false)

const modalLoadingState = ref(false)
const confirmModalTitle = ref("")

const updateSelectedTeam = (
  newSelectedTeam: CollectionType["selectedTeam"]
) => {
  collectionsType.value.selectedTeam = newSelectedTeam
}

const updateCollectionType = (newCollectionType: CollectionType["type"]) => {
  collectionsType.value.type = newCollectionType
}

const displayModalAdd = (shouldDisplay: boolean) => {
  showModalAddCollection.value = shouldDisplay
}

const displayModalAddFolder = (shouldDisplay: boolean) => {
  showModalAddFolder.value = shouldDisplay
}

const displayConfirmModal = (shouldDisplay: boolean) => {
  showConfirmModal.value = shouldDisplay
}

const addFolder = (
  payload: TreeNode<{
    type: "folders" | "collections"
    data: HoppCollection<HoppRESTRequest>
  }>
) => {
  const { data, id } = payload
  editingFolder.value = data.data
  editingFolderPath.value = id
  displayModalAddFolder(true)
}

const removeCollection = (
  payload: TreeNode<HoppCollection<HoppRESTRequest>>
) => {
  const { data, id } = payload
  console.log("remove-collection", data, id)

  editingCollectionIndex.value = Number(id)
  editingCollectionID.value = id
  confirmModalTitle.value = `${t("confirm.remove_collection")}`

  displayConfirmModal(true)
}

const removeFolder = (payload: TreeNode<HoppCollection<HoppRESTRequest>>) => {
  const { data, id } = payload
  editingCollectionID.value = id
  editingFolder.value = data
  editingFolderPath.value = id
  confirmModalTitle.value = `${t("confirm.remove_folder")}`
  displayConfirmModal(true)
}

const resolveConfirmModal = (title: string) => {
  if (title === `${t("confirm.remove_collection")}`) onRemoveCollection()
  // else if (title === `${t("confirm.remove_request")}`) onRemoveRequest()
  else if (title === `${t("confirm.remove_folder")}`) onRemoveFolder()
  else {
    console.error(
      `Confirm modal title ${title} is not handled by the component`
    )
    toast.error(t("error.something_went_wrong"))
    displayConfirmModal(false)
  }
}

const onRemoveCollection = () => {
  const collectionIndex = editingCollectionIndex.value
  const collectionID = editingCollectionID.value

  console.log("remove-collection", collectionIndex, collectionID)
  removeRESTCollection(collectionIndex)
  displayConfirmModal(false)
}
const onRemoveFolder = () => {
  // const folder = editingFolder.value
  const folderPath = editingFolderPath.value

  console.log("remove-foler", folderPath)
  removeRESTFolder(folderPath)
  displayConfirmModal(false)
}

type FolderProperties = {
  name: string
  folder: HoppCollection<HoppRESTRequest>
  path: string
}

const onAddFolder = ({ name, folder, path }: FolderProperties) => {
  console.log(name, folder, path)
  addRESTFolder(name, path)
  displayModalAddFolder(false)
}

const addNewRootCollection = (name: string) => {
  if (!name) return

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
    collectionsType.value.selectedTeam?.myRole !== "VIEWER"
  ) {
    if (!collectionsType.value.selectedTeam) return
    modalLoadingState.value = true
    runMutation(CreateNewRootCollectionDocument, {
      title: name,
      teamID: collectionsType.value.selectedTeam?.id,
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

const pathToId = computed(() => {
  return (path: string) => {
    return path.split("/").map((x) => parseInt(x))
  }
})

type Collection = {
  type: string
  data: HoppCollection<HoppRESTRequest>
}

type Folder = {
  type: string
  data: HoppCollection<HoppRESTRequest>
}

type Requests = {
  type: string
  data: HoppRESTRequest
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
            data: item,
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
              data: item,
            },
          })),
          ...item.requests.map((item, index) => ({
            id: `${id}/${index}`,
            data: {
              type: "requests",
              data: item,
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
  type: string
  data: TeamCollection
}

type TeamFolder = {
  type: string
  data: TeamCollection
}

type TeamRequests = {
  type: string
  data: HoppRESTRequest
}

type TeamCollectionNode = TeamCollections | TeamFolder | TeamRequests

class TeamCollectionsAdapter implements SmartTreeAdapter<TeamCollectionNode> {
  constructor(public data: Ref<TeamCollection[]>) {}

  findCollInTree(
    tree: TeamCollection[],
    targetID: string
  ): TeamCollections | null {
    for (const coll of tree) {
      // If the direct child matched, then return that
      if (coll.id === targetID)
        return {
          type: "collections",
          data: coll,
        }

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
      console.log("root-loading", teamLoadingCollections.value.includes("root"))
      //TODO: Root collections not reactive
      if (id === null) {
        // console.log(
        //   "root-loading",
        //   teamLoadingCollections.value.includes("root")
        // )

        if (teamLoadingCollections.value.includes("root")) {
          return {
            status: "loading",
          }
        } else {
          console.log("root-loaded", teamLoadingCollections.value)
          const data = this.data.value.map((item) => ({
            id: item.id,
            data: {
              type: "collections",
              data: item,
            },
          }))
          return {
            status: "loaded",
            data: data,
          }
        }
      }

      teamCollectionAdapter.expandCollection(id)
      console.log("id-to-team-load", id, teamLoadingCollections.value)

      if (teamLoadingCollections.value.includes(id)) {
        return {
          status: "loading",
        }
      } else {
        const item = this.findCollInTree(this.data.value, id)
        if (item) {
          const data = [
            ...(item.data.children
              ? item.data.children.map((item) => ({
                  id: item.id,
                  data: {
                    type: "folders",
                    data: item,
                  },
                }))
              : []),
            ...(item.data.requests
              ? item.data.requests.map((item) => ({
                  id: item.id,
                  data: {
                    type: "requests",
                    data: item.request,
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
  myCollection
)
const teamAdapter: SmartTreeAdapter<TeamCollectionNode> =
  new TeamCollectionsAdapter(teamCollectionList)
</script>
