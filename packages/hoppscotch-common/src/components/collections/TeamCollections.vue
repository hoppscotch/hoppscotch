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
      <HoppButtonSecondary
        v-if="hasNoTeamAccess"
        v-tippy="{ theme: 'tooltip' }"
        disabled
        class="!rounded-none"
        :icon="IconPlus"
        :title="t('team.no_access')"
        :label="t('add.new')"
      />
      <HoppButtonSecondary
        v-else
        :icon="IconPlus"
        :label="t('add.new')"
        class="!rounded-none"
        @click="emit('display-modal-add')"
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
          :disabled="
            collectionsType.type === 'team-collections' &&
            collectionsType.selectedTeam === undefined
          "
          :icon="IconImport"
          :title="t('modal.import_export')"
          @click="emit('display-modal-import-export')"
        />
      </span>
    </div>
    <div class="flex flex-col overflow-hidden">
      <HoppSmartTree :adapter="teamAdapter">
        <template
          #content="{ node, toggleChildren, isOpen, highlightChildren }"
        >
          <CollectionsCollection
            v-if="node.data.type === 'collections'"
            :id="node.data.data.data.id"
            :parent-i-d="node.data.data.parentIndex"
            :data="node.data.data.data"
            :collections-type="collectionsType.type"
            :is-open="isOpen"
            :export-loading="exportLoading"
            :has-no-team-access="hasNoTeamAccess"
            :collection-move-loading="collectionMoveLoading"
            :is-last-item="node.data.isLastItem"
            :is-selected="
              isSelected({
                collectionID: node.id,
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
            @drag-event="dragEvent($event, node.id)"
            @update-collection-order="
              updateCollectionOrder($event, {
                destinationCollectionIndex: node.data.data.data.id,
                destinationCollectionParentIndex: node.data.data.parentIndex,
              })
            "
            @update-last-collection-order="
              updateCollectionOrder($event, {
                destinationCollectionIndex: null,
                destinationCollectionParentIndex: node.data.data.parentIndex,
              })
            "
            @dragging="
              (isDraging) =>
                highlightChildren(isDraging ? node.data.data.data.id : null)
            "
            @toggle-children="
              () => {
                toggleChildren(),
                  saveRequest &&
                    emit('select', {
                      pickedType: 'teams-collection',
                      collectionID: node.id,
                    })
              }
            "
          />
          <CollectionsCollection
            v-if="node.data.type === 'folders'"
            :id="node.data.data.data.id"
            :parent-i-d="node.data.data.parentIndex"
            :data="node.data.data.data"
            :collections-type="collectionsType.type"
            :is-open="isOpen"
            :export-loading="exportLoading"
            :has-no-team-access="hasNoTeamAccess"
            :collection-move-loading="collectionMoveLoading"
            :is-last-item="node.data.isLastItem"
            :is-selected="
              isSelected({
                folderID: node.data.data.data.id,
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
                  folder: node.data.data.data,
                })
            "
            @export-data="
              node.data.type === 'folders' &&
                emit('export-data', node.data.data.data)
            "
            @remove-collection="
              node.data.type === 'folders' &&
                emit('remove-folder', node.data.data.data.id)
            "
            @drop-event="dropEvent($event, node.data.data.data.id)"
            @drag-event="dragEvent($event, node.data.data.data.id)"
            @update-collection-order="
              updateCollectionOrder($event, {
                destinationCollectionIndex: node.data.data.data.id,
                destinationCollectionParentIndex: node.data.data.parentIndex,
              })
            "
            @update-last-collection-order="
              updateCollectionOrder($event, {
                destinationCollectionIndex: null,
                destinationCollectionParentIndex: node.data.data.parentIndex,
              })
            "
            @dragging="
              (isDraging) =>
                highlightChildren(isDraging ? node.data.data.data.id : null)
            "
            @toggle-children="
              () => {
                toggleChildren(),
                  saveRequest &&
                    emit('select', {
                      pickedType: 'teams-folder',
                      folderID: node.data.data.data.id,
                    })
              }
            "
          />
          <CollectionsRequest
            v-if="node.data.type === 'requests'"
            :request="node.data.data.data.request"
            :request-i-d="node.data.data.data.id"
            :parent-i-d="node.data.data.parentIndex"
            :collections-type="collectionsType.type"
            :duplicate-loading="duplicateLoading"
            :is-active="isActiveRequest(node.data.data.data.id)"
            :has-no-team-access="hasNoTeamAccess"
            :request-move-loading="requestMoveLoading"
            :is-last-item="node.data.isLastItem"
            :is-selected="
              isSelected({
                requestID: node.data.data.data.id,
              })
            "
            @edit-request="
              node.data.type === 'requests' &&
                emit('edit-request', {
                  requestIndex: node.data.data.data.id,
                  request: node.data.data.data.request,
                })
            "
            @duplicate-request="
              node.data.type === 'requests' &&
                emit('duplicate-request', {
                  folderPath: node.data.data.parentIndex,
                  request: node.data.data.data.request,
                })
            "
            @remove-request="
              node.data.type === 'requests' &&
                emit('remove-request', {
                  folderPath: null,
                  requestIndex: node.data.data.data.id,
                })
            "
            @select-request="
              node.data.type === 'requests' &&
                selectRequest({
                  request: node.data.data.data.request,
                  requestIndex: node.data.data.data.id,
                })
            "
            @drag-request="
              dragRequest($event, {
                folderPath: node.data.data.parentIndex,
                requestIndex: node.data.data.data.id,
              })
            "
            @update-request-order="
              updateRequestOrder($event, {
                folderPath: node.data.data.parentIndex,
                requestIndex: node.data.data.data.id,
              })
            "
            @update-last-request-order="
              updateRequestOrder($event, {
                folderPath: node.data.data.parentIndex,
                requestIndex: null,
              })
            "
          />
        </template>
        <template #emptyNode="{ node }">
          <div
            v-if="node === null"
            class="flex flex-col space-y-25 py-5"
            @drop="(e) => e.stopPropagation()"
          >
            <div class="flex flex-col items-center space-y-4">
              <span class="text-secondaryLight text-center">
                {{ t("collection.import_or_create") }}
              </span>
              <div class="flex gap-4 flex-col items-center">
                <HoppButtonPrimary
                  :icon="IconImport"
                  :label="t('import.title')"
                  filled
                  outline
                  :disabled="hasNoTeamAccess"
                  :title="hasNoTeamAccess ? t('team.no_access') : ''"
                  @click="
                    hasNoTeamAccess ? null : emit('display-modal-import-export')
                  "
                />
                <HoppButtonSecondary
                  :icon="IconPlus"
                  :label="t('add.new')"
                  filled
                  outline
                  :disabled="hasNoTeamAccess"
                  :title="hasNoTeamAccess ? t('team.no_access') : ''"
                  @click="hasNoTeamAccess ? null : emit('display-modal-add')"
                />
              </div>
            </div>
            <HoppSmartPlaceholder
              :src="`/images/states/${colorMode.value}/pack.svg`"
              :alt="`${t('empty.collections')}`"
              :text="t('empty.collections')"
            />
          </div>
          <div
            v-else-if="node.data.type === 'collections'"
            @drop="(e) => e.stopPropagation()"
          >
            <HoppSmartPlaceholder
              :src="`/images/states/${colorMode.value}/pack.svg`"
              :alt="`${t('empty.collections')}`"
              :text="t('empty.collections')"
            >
              <HoppButtonSecondary
                :label="t('add.new')"
                filled
                outline
                @click="
                  node.data.type === 'collections' &&
                    emit('add-folder', {
                      path: node.id,
                      folder: node.data.data.data,
                    })
                "
              />
            </HoppSmartPlaceholder>
          </div>
          <div
            v-else-if="node.data.type === 'folders'"
            @drop="(e) => e.stopPropagation()"
          >
            <HoppSmartPlaceholder
              :src="`/images/states/${colorMode.value}/pack.svg`"
              :alt="`${t('empty.folder')}`"
              :text="t('empty.folder')"
            />
          </div>
        </template>
      </HoppSmartTree>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconPlus from "~icons/lucide/plus"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconImport from "~icons/lucide/folder-down"
import { computed, PropType, Ref, toRef } from "vue"
import { GetMyTeamsQuery } from "~/helpers/backend/graphql"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { TeamCollection } from "~/helpers/teams/TeamCollection"
import { TeamRequest } from "~/helpers/teams/TeamRequest"
import {
  ChildrenResult,
  SmartTreeAdapter,
} from "@hoppscotch/ui/dist/helpers/treeAdapter"
import { cloneDeep } from "lodash-es"
import { HoppRESTRequest } from "@hoppscotch/data"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import { Picked } from "~/helpers/types/HoppPicked.js"
import { currentActiveTab } from "~/helpers/rest/tab"

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
  collectionsType: {
    type: Object as PropType<CollectionType>,
    default: () => ({ type: "my-collections", selectedTeam: undefined }),
    required: true,
  },
  teamCollectionList: {
    type: Array as PropType<TeamCollection[]>,
    default: () => [],
    required: true,
  },
  teamLoadingCollections: {
    type: Array as PropType<string[]>,
    default: () => [],
    required: true,
  },
  saveRequest: {
    type: Boolean,
    default: false,
    required: false,
  },
  exportLoading: {
    type: Boolean,
    default: false,
    required: false,
  },
  duplicateLoading: {
    type: Boolean,
    default: false,
    required: false,
  },
  picked: {
    type: Object as PropType<Picked | null>,
    default: null,
    required: false,
  },
  collectionMoveLoading: {
    type: Array as PropType<string[]>,
    default: () => [],
    required: false,
  },
  requestMoveLoading: {
    type: Array as PropType<string[]>,
    default: () => [],
    required: false,
  },
})

const emit = defineEmits<{
  (
    event: "add-request",
    payload: {
      path: string
      folder: TeamCollection
    }
  ): void
  (
    event: "add-folder",
    payload: {
      path: string
      folder: TeamCollection
    }
  ): void
  (
    event: "edit-collection",
    payload: {
      collectionIndex: string
      collection: TeamCollection
    }
  ): void
  (
    event: "edit-folder",
    payload: {
      folder: TeamCollection
    }
  ): void
  (
    event: "edit-request",
    payload: {
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
  (event: "export-data", payload: TeamCollection): void
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
      requestIndex: string
      isActive: boolean
      folderPath?: string | undefined
    }
  ): void
  (
    event: "drop-request",
    payload: {
      folderPath: string
      requestIndex: string
      destinationCollectionIndex: string
    }
  ): void
  (
    event: "drop-collection",
    payload: {
      collectionIndexDragged: string
      destinationCollectionIndex: string
    }
  ): void
  (
    event: "update-request-order",
    payload: {
      dragedRequestIndex: string
      destinationRequestIndex: string | null
      destinationCollectionIndex: string
    }
  ): void
  (
    event: "update-collection-order",
    payload: {
      dragedCollectionIndex: string
      destinationCollection: {
        destinationCollectionIndex: string | null
        destinationCollectionParentIndex: string | null
      }
    }
  ): void
  (event: "select", payload: Picked | null): void
  (event: "expand-team-collection", payload: string): void
  (event: "display-modal-add"): void
  (event: "display-modal-import-export"): void
}>()

const teamCollectionsList = toRef(props, "teamCollectionList")

const hasNoTeamAccess = computed(
  () =>
    props.collectionsType.type === "team-collections" &&
    (props.collectionsType.selectedTeam === undefined ||
      props.collectionsType.selectedTeam.myRole === "VIEWER")
)

const isSelected = ({
  collectionID,
  folderID,
  requestID,
}: {
  collectionID?: string | undefined
  folderID?: string | undefined
  requestID?: string | undefined
}) => {
  if (collectionID !== undefined) {
    return (
      props.picked &&
      props.picked.pickedType === "teams-collection" &&
      props.picked.collectionID === collectionID
    )
  } else if (requestID !== undefined) {
    return (
      props.picked &&
      props.picked.pickedType === "teams-request" &&
      props.picked.requestID === requestID
    )
  } else {
    return (
      props.picked &&
      props.picked.pickedType === "teams-folder" &&
      props.picked.folderID === folderID
    )
  }
}

const active = computed(() => currentActiveTab.value.document.saveContext)

const isActiveRequest = (requestID: string) => {
  return pipe(
    active.value,
    O.fromNullable,
    O.filter(
      (active) =>
        active.originLocation === "team-collection" &&
        active.requestID === requestID
    ),
    O.isSome
  )
}

const selectRequest = (data: {
  request: HoppRESTRequest
  requestIndex: string
}) => {
  const { request, requestIndex } = data
  if (props.saveRequest) {
    emit("select", {
      pickedType: "teams-request",
      requestID: requestIndex,
    })
  } else {
    emit("select-request", {
      request: request,
      requestIndex: requestIndex,
      isActive: isActiveRequest(requestIndex),
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

const dragEvent = (dataTransfer: DataTransfer, collectionIndex: string) => {
  dataTransfer.setData("collectionIndex", collectionIndex)
}

const dropEvent = (
  dataTransfer: DataTransfer,
  destinationCollectionIndex: string
) => {
  const folderPath = dataTransfer.getData("folderPath")
  const requestIndex = dataTransfer.getData("requestIndex")
  const collectionIndexDragged = dataTransfer.getData("collectionIndex")
  if (folderPath && requestIndex) {
    emit("drop-request", {
      folderPath,
      requestIndex,
      destinationCollectionIndex,
    })
  } else {
    emit("drop-collection", {
      collectionIndexDragged,
      destinationCollectionIndex,
    })
  }
}

const updateRequestOrder = (
  dataTransfer: DataTransfer,
  {
    folderPath,
    requestIndex,
  }: { folderPath: string | null; requestIndex: string | null }
) => {
  if (!folderPath) return
  const dragedRequestIndex = dataTransfer.getData("requestIndex")
  const destinationRequestIndex = requestIndex
  const destinationCollectionIndex = folderPath

  emit("update-request-order", {
    dragedRequestIndex,
    destinationRequestIndex,
    destinationCollectionIndex,
  })
}

const updateCollectionOrder = (
  dataTransfer: DataTransfer,
  destinationCollection: {
    destinationCollectionIndex: string | null
    destinationCollectionParentIndex: string | null
  }
) => {
  const dragedCollectionIndex = dataTransfer.getData("collectionIndex")

  emit("update-collection-order", {
    dragedCollectionIndex,
    destinationCollection,
  })
}

type TeamCollections = {
  isLastItem: boolean
  type: "collections"
  data: {
    parentIndex: null
    data: TeamCollection
  }
}

type TeamFolder = {
  isLastItem: boolean
  type: "folders"
  data: {
    parentIndex: string
    data: TeamCollection
  }
}

type TeamRequests = {
  isLastItem: boolean
  type: "requests"
  data: {
    parentIndex: string
    data: TeamRequest
  }
}

type TeamCollectionNode = TeamCollections | TeamFolder | TeamRequests

class TeamCollectionsAdapter implements SmartTreeAdapter<TeamCollectionNode> {
  constructor(public data: Ref<TeamCollection[]>) {}

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

  getChildren(id: string | null): Ref<ChildrenResult<TeamCollectionNode>> {
    return computed(() => {
      if (id === null) {
        if (props.teamLoadingCollections.includes("root")) {
          return {
            status: "loading",
          }
        } else {
          const data = this.data.value.map((item, index) => ({
            id: item.id,
            data: {
              isLastItem: index === this.data.value.length - 1,
              type: "collections",
              data: {
                parentIndex: null,
                data: item,
              },
            },
          }))
          return {
            status: "loaded",
            data: cloneDeep(data),
          } as ChildrenResult<TeamCollections>
        }
      } else {
        const parsedID = id.split("/")[id.split("/").length - 1]

        !props.teamLoadingCollections.includes(parsedID) &&
          emit("expand-team-collection", parsedID)

        if (props.teamLoadingCollections.includes(parsedID)) {
          return {
            status: "loading",
          }
        } else {
          const items = this.findCollInTree(this.data.value, parsedID)
          if (items) {
            const data = [
              ...(items.children
                ? items.children.map((item, index) => ({
                    id: `${id}/${item.id}`,
                    data: {
                      isLastItem:
                        items.children && items.children.length > 1
                          ? index === items.children.length - 1
                          : false,
                      type: "folders",
                      data: {
                        parentIndex: parsedID,
                        data: item,
                      },
                    },
                  }))
                : []),
              ...(items.requests
                ? items.requests.map((item, index) => ({
                    id: `${id}/${item.id}`,
                    data: {
                      isLastItem:
                        items.requests && items.requests.length > 1
                          ? index === items.requests.length - 1
                          : false,
                      type: "requests",
                      data: {
                        parentIndex: parsedID,
                        data: item,
                      },
                    },
                  }))
                : []),
            ]
            return {
              status: "loaded",
              data: cloneDeep(data),
            } as ChildrenResult<TeamFolder | TeamRequests>
          } else {
            return {
              status: "loaded",
              data: [],
            }
          }
        }
      }
    })
  }
}

const teamAdapter: SmartTreeAdapter<TeamCollectionNode> =
  new TeamCollectionsAdapter(teamCollectionsList)
</script>
