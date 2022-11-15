<template>
  <CollectionsChooseType
    :collections-type="collectionsType"
    @update-collection-type="updateCollectionType"
    @update-selected-team="updateSelectedTeam"
  />
  <ButtonSecondary
    :label="t('action.new')"
    class="!rounded-none"
    @click="displayModalAdd(true)"
  />
  <SmartTree
    v-if="collectionsType.type === 'my-collections'"
    :adapter="myAdapter"
  >
    <template #content="{ node, toggleChildren, isOpen }">
      <CollectionsMyCollection
        v-if="node.type === 'collections'"
        :collection="node.data"
        @add-folder="addFolder(node)"
        @remove-collection="removeCollection(node)"
        @toggle-children="toggleChildren"
      />

      <div v-if="node.type === 'folders'" class="flex flex-1">
        <CollectionsMyFolder
          :folder="node.data"
          :is-open="isOpen"
          @add-folder="addFolder(node)"
          @remove-folder="removeFolder(node)"
          @toggle-children="toggleChildren"
        />
      </div>
      <div v-if="node.type === 'requests'" class="flex flex-1">
        <CollectionsMyRequest
          :request="node.data"
          :request-index="pathToId(node.id)[pathToId(node.id).length - 1]"
        />
      </div>
    </template>
    <template #emptyRoot>
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
          {{ t("empty.collection") }}
        </span>
      </div>
    </template>
  </SmartTree>
  <SmartTree v-else :adapter="teamAdapter">
    <template #content="{ node, toggleChildren, isOpen }">
      <CollectionsMyCollection
        v-if="node.type === 'collections'"
        :collection="node.data"
        :loading-collection-i-ds="teamLoadingCollections.value"
        @add-folder="addFolder(node)"
        @remove-collection="removeCollection(node)"
        @toggle-children="toggleChildren"
      />

      <div v-if="node.type === 'folders'" class="flex flex-1">
        <!-- {{ node }} -->
        <CollectionsMyFolder
          :folder="node.data"
          :is-open="isOpen"
          :loading-collection-i-ds="teamLoadingCollections.value"
          @add-folder="addFolder(node)"
          @remove-folder="removeFolder(node)"
          @toggle-children="toggleChildren"
        />
      </div>
      <div v-if="node.type === 'requests'" class="flex flex-1">
        <CollectionsMyRequest
          :request="node.data"
          :request-index="pathToId(node.id)[pathToId(node.id).length - 1]"
        />
      </div>
    </template>
    <template #emptyRoot>
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
          {{ t("empty.collection") }}
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
import {
  HoppCollection,
  HoppRESTRequest,
  makeCollection,
} from "@hoppscotch/data"
import { useReadonlyStream } from "~/composables/stream"
import { SmartTreeAdapter, TreeNode } from "~/helpers/tree/SmartTreeAdapter"
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
import { Team } from "~/helpers/backend/graphql"
import TeamCollectionAdapter from "~/helpers/teams/TeamCollectionAdapter"
import { TeamCollection } from "~/helpers/teams/TeamCollection"

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

const addFolder = (payload: TreeNode<HoppCollection<HoppRESTRequest>>) => {
  const { data, id } = payload
  editingFolder.value = data
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
  addRESTCollection(
    makeCollection({
      name,
      folders: [],
      requests: [],
    })
  )
  displayModalAdd(false)
}

const pathToId = computed(() => {
  return (path: string) => {
    return path.split("/").map((x) => parseInt(x))
  }
})

type Collection = HoppCollection<HoppRESTRequest>

type Folder = HoppCollection<HoppRESTRequest>

type Requests = HoppRESTRequest

type MyCollectionNode = Collection | Folder | Requests | null | undefined

class MyCollectionsAdapter implements SmartTreeAdapter<MyCollectionNode> {
  constructor(public data: Ref<Collection[]>) {}

  navigateToFolderWithIndexPath(
    collections: Collection[],
    indexPaths: number[]
  ) {
    if (indexPaths.length === 0) return null

    let target = collections[indexPaths.shift() as number]

    while (indexPaths.length > 0)
      target = target.folders[indexPaths.shift() as number]

    return target !== undefined ? target : null
  }

  getChildren(id: string | null) {
    return computed(() => {
      if (id === null) {
        return this.data.value.map((item, index) => ({
          type: "collections",
          id: index.toString(),
          data: item,
        }))
      }
      const indexPath = id.split("/").map((x) => parseInt(x))

      const item = this.navigateToFolderWithIndexPath(
        this.data.value,
        indexPath
      )

      if (item) {
        return [
          ...item.folders.map((item, index) => ({
            type: "folders",
            id: `${id}/${index}`,
            data: item,
          })),
          ...item.requests.map((item, index) => ({
            type: "requests",
            id: `${id}/${index}`,
            data: item,
          })),
        ]
      } else {
        return []
      }
    })
  }
}

type TeamCollectionNode = TeamCollection | HoppRESTRequest | null | undefined

class TeamCollectionsAdapter implements SmartTreeAdapter<TeamCollectionNode> {
  constructor(public data: Ref<TeamCollection[]>) {}

  public loading = false

  findCollInTree(
    tree: TeamCollection[],
    targetID: string
  ): TeamCollection | null {
    for (const coll of tree) {
      // If the direct child matched, then return that
      if (coll.id === targetID) return coll

      // Else run it in the children
      if (coll.children) {
        const result = this.findCollInTree(coll.children, targetID)
        if (result) return result
      }
    }

    // If nothing matched, return null
    return null
  }

  getChildren(id: string | null): Ref<TreeNode<TeamCollectionNode>[]> {
    return computed(() => {
      if (id === null) {
        return this.data.value.map((item) => ({
          type: "collections",
          id: item.id,
          data: item,
        }))
      }
      teamCollectionAdapter.expandCollection(id)
      const item = this.findCollInTree(this.data.value, id)
      if (item) {
        return [
          ...(item.children
            ? item.children.map((item) => ({
                type: "folders",
                id: item.id,
                data: item,
              }))
            : []),
          ...(item.requests
            ? item.requests.map((item) => ({
                type: "requests",
                id: item.id,
                data: item.request,
              }))
            : []),
        ]
      } else {
        return []
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
