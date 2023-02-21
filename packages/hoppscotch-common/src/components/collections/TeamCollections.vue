<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex justify-between flex-1 border-b bg-primary border-dividerLight"
      :style="
        saveRequest
          ? 'top: calc(var(--upper-secondary-sticky-fold) - var(--line-height-body))'
          : 'top: var(--upper-secondary-sticky-fold)'
      "
    >
      <HoppButtonSecondary
        v-if="hasNoTeamAccess"
        v-tippy="{ theme: 'tooltip' }"
        disabled
        class="!rounded-none"
        :icon="IconPlus"
        :title="t('team.no_access')"
        :label="t('action.new')"
      />
      <HoppButtonSecondary
        v-else
        :icon="IconPlus"
        :label="t('action.new')"
        class="!rounded-none"
        @click="emit('display-modal-add')"
      />
      <span class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/collections"
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
          :icon="IconArchive"
          :title="t('modal.import_export')"
          @click="emit('display-modal-import-export')"
        />
      </span>
    </div>
    <div class="flex flex-col overflow-hidden">
      <SmartTree :adapter="teamAdapter">
        <template #content="{ node, toggleChildren, isOpen }">
          <CollectionsCollection
            v-if="node.data.type === 'collections'"
            :data="node.data.data.data"
            :collections-type="collectionsType.type"
            :is-open="isOpen"
            :export-loading="exportLoading"
            :has-no-team-access="hasNoTeamAccess"
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
            :data="node.data.data.data"
            :collections-type="collectionsType.type"
            :is-open="isOpen"
            :export-loading="exportLoading"
            :has-no-team-access="hasNoTeamAccess"
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
            :collections-type="collectionsType.type"
            :duplicate-loading="duplicateLoading"
            :is-active="isActiveRequest(node.data.data.data.id)"
            :has-no-team-access="hasNoTeamAccess"
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
          />
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
                :alt="`${t('empty.collections')}`"
              />
              <span class="pb-4 text-center">
                {{ t("empty.collections") }}
              </span>
              <HoppButtonSecondary
                v-if="hasNoTeamAccess"
                v-tippy="{ theme: 'tooltip' }"
                disabled
                filled
                outline
                :title="t('team.no_access')"
                :label="t('add.new')"
              />
              <HoppButtonSecondary
                v-else
                :label="t('add.new')"
                filled
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
            <HoppButtonSecondary
              v-if="hasNoTeamAccess"
              v-tippy="{ theme: 'tooltip' }"
              disabled
              filled
              outline
              :title="t('team.no_access')"
              :label="t('add.new')"
            />
            <HoppButtonSecondary
              v-else
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
import { computed, PropType, Ref, toRef } from "vue"
import { GetMyTeamsQuery } from "~/helpers/backend/graphql"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "@composables/theming"
import { TeamCollection } from "~/helpers/teams/TeamCollection"
import { TeamRequest } from "~/helpers/teams/TeamRequest"
import { ChildrenResult, SmartTreeAdapter } from "~/helpers/treeAdapter"
import { cloneDeep } from "lodash-es"
import { HoppRESTRequest } from "@hoppscotch/data"
import { useReadonlyStream } from "~/composables/stream"
import { restSaveContext$ } from "~/newstore/RESTSession"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import { Picked } from "~/helpers/types/HoppPicked.js"

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

const isSelected = computed(() => {
  return ({
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
})

const active = useReadonlyStream(restSaveContext$, null)

const isActiveRequest = computed(() => {
  return (requestID: string) => {
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
})

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
      isActive: isActiveRequest.value(requestIndex),
    })
  }
}

type TeamCollections = {
  type: "collections"
  data: {
    parentIndex: null
    data: TeamCollection
  }
}

type TeamFolder = {
  type: "folders"
  data: {
    parentIndex: string
    data: TeamCollection
  }
}

type TeamRequests = {
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
          const data = this.data.value.map((item) => ({
            id: item.id,
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
                ? items.children.map((item) => ({
                    id: `${id}/${item.id}`,
                    data: {
                      type: "folders",
                      data: {
                        parentIndex: parsedID,
                        data: item,
                      },
                    },
                  }))
                : []),
              ...(items.requests
                ? items.requests.map((item) => ({
                    id: `${id}/${item.id}`,
                    data: {
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
