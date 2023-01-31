<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex justify-between flex-1 border-b bg-primary border-dividerLight"
      :style="
        saveRequest
          ? 'top: calc(var(--upper-primary-sticky-fold) - var(--line-height-body))'
          : 'top: var(--upper-primary-sticky-fold)'
      "
    >
      <ButtonSecondary
        :icon="IconPlus"
        :label="t('action.new')"
        class="!rounded-none"
        @click="emit('display-modal-add')"
      />
      <span class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/collections"
          blank
          :title="t('app.wiki')"
          :icon="IconHelpCircle"
        />
        <ButtonSecondary
          v-if="!saveRequest"
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconArchive"
          :title="t('modal.import_export')"
          @click="emit('display-modal-import-export')"
        />
      </span>
    </div>
    <div class="flex flex-col flex-1">
      <SmartTree :adapter="myAdapter">
        <template #content="{ node, toggleChildren, isOpen }">
          <CollectionsCollection
            v-if="node.data.type === 'collections'"
            :data="node.data.data.data"
            :collections-type="collectionsType.type"
            :is-open="isOpen"
            :is-selected="
              isSelected({
                collectionIndex: parseInt(node.id),
              })
            "
            folder-type="collection"
            @add-request="
              node.data.type === 'collections' &&
                emit('add-request', {
                  path: node.id,
                  folder: node.data.data.data,
                })
            "
            @add-folder="
              node.data.type === 'collections' &&
                emit('add-folder', {
                  path: node.id,
                  folder: node.data.data.data,
                })
            "
            @edit-collection="
              node.data.type === 'collections' &&
                emit('edit-collection', {
                  collectionIndex: node.id,
                  collection: node.data.data.data,
                })
            "
            @export-data="
              node.data.type === 'collections' &&
                emit('export-data', node.data.data.data)
            "
            @remove-collection="emit('remove-collection', node.id)"
            @drop-event="dropEvent($event, node.id)"
            @toggle-children="
              () => {
                toggleChildren(),
                  saveRequest &&
                    emit('select', {
                      pickedType: 'my-collection',
                      collectionIndex: parseInt(node.id),
                    })
              }
            "
          />
          <CollectionsCollection
            v-if="node.data.type === 'folders'"
            :data="node.data.data.data"
            :collections-type="collectionsType.type"
            :is-open="isOpen"
            :is-selected="
              isSelected({
                folderPath: node.id,
              })
            "
            folder-type="folder"
            @add-request="
              node.data.type === 'folders' &&
                emit('add-request', {
                  path: node.id,
                  folder: node.data.data.data,
                })
            "
            @add-folder="
              node.data.type === 'folders' &&
                emit('add-folder', {
                  path: node.id,
                  folder: node.data.data.data,
                })
            "
            @edit-collection="
              node.data.type === 'folders' &&
                emit('edit-folder', {
                  folderPath: node.id,
                  folder: node.data.data.data,
                })
            "
            @export-data="
              node.data.type === 'folders' &&
                emit('export-data', node.data.data.data)
            "
            @remove-collection="emit('remove-folder', node.id)"
            @drop-event="dropEvent($event, node.id)"
            @toggle-children="
              () => {
                toggleChildren(),
                  saveRequest &&
                    emit('select', {
                      pickedType: 'my-folder',
                      folderPath: node.id,
                    })
              }
            "
          />
          <CollectionsRequest
            v-if="node.data.type === 'requests'"
            :request="node.data.data.data"
            :collections-type="collectionsType.type"
            :save-request="saveRequest"
            :is-active="
              isActiveRequest(
                node.data.data.parentIndex,
                parseInt(pathToIndex(node.id))
              )
            "
            :is-selected="
              isSelected({
                folderPath: node.data.data.parentIndex,
                requestIndex: parseInt(pathToIndex(node.id)),
              })
            "
            @edit-request="
              node.data.type === 'requests' &&
                emit('edit-request', {
                  folderPath: node.data.data.parentIndex,
                  requestIndex: pathToIndex(node.id),
                  request: node.data.data.data,
                })
            "
            @duplicate-request="
              node.data.type === 'requests' &&
                emit('duplicate-request', {
                  folderPath: node.data.data.parentIndex,
                  request: node.data.data.data,
                })
            "
            @remove-request="
              node.data.type === 'requests' &&
                emit('remove-request', {
                  folderPath: node.data.data.parentIndex,
                  requestIndex: pathToIndex(node.id),
                })
            "
            @select-request="
              node.data.type === 'requests' &&
                selectRequest({
                  request: node.data.data.data,
                  folderPath: node.data.data.parentIndex,
                  requestIndex: pathToIndex(node.id),
                })
            "
            @drag-request="
              dragRequest($event, {
                folderPath: node.data.data.parentIndex,
                requestIndex: pathToIndex(node.id),
              })
            "
          />
        </template>
        <template #emptyNode="{ node }">
          <div
            v-if="filterText.length !== 0 && filteredCollections.length === 0"
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <icon-lucide-search class="pb-2 opacity-75 svg-icons" />
            <span class="my-2 text-center">
              {{ t("state.nothing_found") }} "{{ filterText }}"
            </span>
          </div>
          <div v-else-if="node === null">
            <div
              class="flex flex-col items-center justify-center p-4 text-secondaryLight"
            >
              <img
                :src="`/images/states/${colorMode.value}/pack.svg`"
                loading="lazy"
                class="inline-flex flex-col object-contain object-center w-16 h-16 mb-4"
                :alt="`${t('empty.collection')}`"
              />
              <span class="pb-4 text-center">
                {{ t("empty.collections") }}
              </span>
              <ButtonSecondary
                :label="t('add.new')"
                filled
                class="mb-4"
                outline
                @click="emit('display-modal-add')"
              />
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
            <span class="pb-4 text-center">
              {{ t("empty.collection") }}
            </span>
            <ButtonSecondary
              :label="t('add.new')"
              filled
              class="mb-4"
              outline
              @click="
                node.data.type === 'collections' &&
                  emit('add-folder', {
                    path: node.id,
                    folder: node.data.data.data,
                  })
              "
            />
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
    </div>
  </div>
</template>

<script setup lang="ts">
import IconArchive from "~icons/lucide/archive"
import IconPlus from "~icons/lucide/plus"
import IconHelpCircle from "~icons/lucide/help-circle"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { computed, PropType, Ref, toRef } from "vue"
import { GetMyTeamsQuery } from "~/helpers/backend/graphql"
import { ChildrenResult, SmartTreeAdapter } from "~/helpers/treeAdapter"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { useReadonlyStream } from "~/composables/stream"
import { restSaveContext$ } from "~/newstore/RESTSession"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import { Picked } from "~/helpers/types/HoppPicked.js"

export type Collection = {
  type: "collections"
  data: {
    parentIndex: null
    data: HoppCollection<HoppRESTRequest>
  }
}

type Folder = {
  type: "folders"
  data: {
    parentIndex: string
    data: HoppCollection<HoppRESTRequest>
  }
}

type Requests = {
  type: "requests"
  data: {
    parentIndex: string
    data: HoppRESTRequest
  }
}

const t = useI18n()
const colorMode = useColorMode()

type SelectedTeam = GetMyTeamsQuery["myTeams"][number] | undefined

type CollectionType =
  | {
      type: "team-collections"
      selectedTeam: SelectedTeam
    }
  | { type: "my-collections"; selectedTeam: undefined }

const props = defineProps({
  filteredCollections: {
    type: Array as PropType<HoppCollection<HoppRESTRequest>[]>,
    default: () => [],
    required: true,
  },
  collectionsType: {
    type: Object as PropType<CollectionType>,
    default: () => ({ type: "my-collections", selectedTeam: undefined }),
    required: true,
  },
  filterText: {
    type: String as PropType<string>,
    default: "",
    required: true,
  },
  saveRequest: {
    type: Boolean,
    default: false,
    required: false,
  },
  picked: {
    type: Object as PropType<Picked | null>,
    default: null,
    required: false,
  },
})

const emit = defineEmits<{
  (event: "display-modal-add"): void
  (
    event: "add-request",
    payload: {
      path: string
      folder: HoppCollection<HoppRESTRequest>
    }
  ): void
  (
    event: "add-folder",
    payload: {
      path: string
      folder: HoppCollection<HoppRESTRequest>
    }
  ): void
  (
    event: "edit-collection",
    payload: {
      collectionIndex: string
      collection: HoppCollection<HoppRESTRequest>
    }
  ): void
  (
    event: "edit-folder",
    payload: {
      folderPath: string
      folder: HoppCollection<HoppRESTRequest>
    }
  ): void
  (
    event: "edit-request",
    payload: {
      folderPath: string
      requestIndex: string
      request: HoppRESTRequest
    }
  ): void
  (
    event: "duplicate-request",
    payload: {
      folderPath: string
      request: HoppRESTRequest
    }
  ): void
  (event: "export-data", payload: HoppCollection<HoppRESTRequest>): void
  (event: "remove-collection", payload: string): void
  (event: "remove-folder", payload: string): void
  (
    event: "remove-request",
    payload: {
      folderPath: string | null
      requestIndex: string
    }
  ): void
  (
    event: "select-request",
    payload: {
      request: HoppRESTRequest
      folderPath: string
      requestIndex: string
      isActive: boolean
    }
  ): void
  (
    event: "drop-request",
    payload: {
      folderPath: string
      requestIndex: string
      collectionIndex: string
    }
  ): void
  (event: "select", payload: Picked | null): void
  (event: "display-modal-import-export"): void
}>()

const refFilterCollection = toRef(props, "filteredCollections")

const pathToIndex = computed(() => {
  return (path: string) => {
    const pathArr = path.split("/")
    return pathArr[pathArr.length - 1]
  }
})

const isSelected = computed(() => {
  return ({
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
    } else {
      return (
        props.picked &&
        props.picked.pickedType === "my-folder" &&
        props.picked.folderPath === folderPath
      )
    }
  }
})

const active = useReadonlyStream(restSaveContext$, null)

const isActiveRequest = computed(() => {
  return (folderPath: string, requestIndex: number) => {
    return pipe(
      active.value,
      O.fromNullable,
      O.filter(
        (active) =>
          active.originLocation === "user-collection" &&
          active.folderPath === folderPath &&
          active.requestIndex === requestIndex
      ),
      O.isSome
    )
  }
})

const selectRequest = (data: {
  request: HoppRESTRequest
  folderPath: string
  requestIndex: string
}) => {
  const { request, folderPath, requestIndex } = data
  if (props.saveRequest) {
    emit("select", {
      pickedType: "my-request",
      folderPath: folderPath,
      requestIndex: parseInt(requestIndex),
    })
  } else {
    emit("select-request", {
      request,
      folderPath,
      requestIndex,
      isActive: isActiveRequest.value(folderPath, parseInt(requestIndex)),
    })
  }
}

const dragRequest = (
  dataTransfer: DataTransfer,
  {
    folderPath,
    requestIndex,
  }: { folderPath: string | null; requestIndex: string }
) => {
  if (!folderPath) return
  dataTransfer.setData("folderPath", folderPath)
  dataTransfer.setData("requestIndex", requestIndex)
}

const dropEvent = (dataTransfer: DataTransfer, collectionIndex: string) => {
  const folderPath = dataTransfer.getData("folderPath")
  const requestIndex = dataTransfer.getData("requestIndex")
  emit("drop-request", {
    folderPath,
    requestIndex,
    collectionIndex,
  })
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
    return computed(() => {
      if (id === null) {
        const data = this.data.value.map((item, index) => ({
          id: index.toString(),
          data: {
            type: "collections",
            data: {
              parentIndex: null,
              data: item,
            },
          },
        }))
        return {
          status: "loaded",
          data: data,
        } as ChildrenResult<Collection>
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
              data: {
                parentIndex: id,
                data: item,
              },
            },
          })),
          ...item.requests.map((item, index) => ({
            id: `${id}/${index}`,
            data: {
              type: "requests",
              data: {
                parentIndex: id,
                data: item,
              },
            },
          })),
        ]

        return {
          status: "loaded",
          data: data,
        } as ChildrenResult<Folder | Requests>
      } else {
        return {
          status: "loaded",
          data: [],
        }
      }
    })
  }
}

const myAdapter: SmartTreeAdapter<MyCollectionNode> = new MyCollectionsAdapter(
  refFilterCollection
)
</script>
