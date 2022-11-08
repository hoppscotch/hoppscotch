<template>
  <ButtonSecondary
    :label="t('action.new')"
    class="!rounded-none"
    @click="displayModalAdd(true)"
  />
  <SmartTree :adapter="adapter">
    <template #content="{ node, toggleChildren, isOpen }">
      <CollectionsMyCollection
        v-if="node.type === 'collections'"
        :collection="node.data"
        @toggle-children="toggleChildren"
        @add-folder="addFolder($event)"
      />

      <div v-if="node.type === 'folders'" class="flex flex-1">
        <CollectionsMyFolder
          :folder="node.data"
          :is-open="isOpen"
          @add-folder="addFolder($event)"
          @toggle-children="toggleChildren"
        />
      </div>
      <div v-if="node.type === 'requests'" class="flex flex-1">
        <CollectionsMyRequest :request="node.data" />
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
</template>

<script setup lang="ts">
import {
  HoppCollection,
  HoppRESTRequest,
  makeCollection,
} from "@hoppscotch/data"
import { useReadonlyStream } from "~/composables/stream"
import { SmartTreeAdapter } from "~/helpers/tree/SmartTreeAdapter"
import {
  addRESTCollection,
  addRESTFolder,
  restCollections$,
} from "~/newstore/collections"
import { ref } from "vue"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "~/composables/theming"

const t = useI18n()

const colorMode = useColorMode()

const collection = useReadonlyStream(restCollections$, [], "deep")

const editingFolder = ref<HoppCollection<HoppRESTRequest>>()
// const editingFolderName = ref(undefined)
// const editingFolderIndex = ref(undefined)
const editingFolderPath = ref("")
const showModalAddFolder = ref(false)
const showModalAddCollection = ref(false)

const modalLoadingState = ref(false)

const displayModalAdd = (shouldDisplay: boolean) => {
  showModalAddCollection.value = shouldDisplay
}

const displayModalAddFolder = (shouldDisplay: boolean) => {
  showModalAddFolder.value = shouldDisplay
}

type FolderProperties = {
  name: string
  folder: HoppCollection<HoppRESTRequest>
  path: string
}

const addFolder = (payload: FolderProperties) => {
  const { folder, path } = payload
  editingFolder.value = folder
  editingFolderPath.value = path
  displayModalAddFolder(true)
  console.log("folder-add", payload)
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

type Collection = HoppCollection<HoppRESTRequest>

type Folder = HoppCollection<HoppRESTRequest>

type Requests = HoppRESTRequest

type Node = Collection | Folder | Requests | null | undefined

class CollectionAdapter implements SmartTreeAdapter<Node> {
  constructor(public data: Collection[]) {}

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
    if (id === null) {
      return this.data.map((item, index) => ({
        type: "collections",
        id: index.toString(),
        data: item,
      }))
    }

    const indexPath = id.split("/").map((x) => parseInt(x))

    const item = this.navigateToFolderWithIndexPath(this.data, indexPath)

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
  }
}

const adapter = new CollectionAdapter(collection.value)
</script>
