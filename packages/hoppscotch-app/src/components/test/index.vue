<template>
  <SmartTree :adapter="adapter">
    <template #content="{ node, toggleChildren, isOpen }">
      <div
        v-if="node.type === 'folders'"
        class="flex items-stretch group"
        @dragover.prevent
        @dragover="dragging = true"
        @drop="dragging = false"
        @dragleave="dragging = false"
        @dragend="dragging = false"
      >
        <span
          class="flex items-center justify-center px-4 cursor-pointer"
          @click="toggleChildren"
        >
          <component :is="getCollectionIcon(isOpen)" class="svg-icons" />
        </span>
        <span
          class="flex flex-1 min-w-0 py-2 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
          @click="toggleChildren"
        >
          <span class="truncate">
            {{ node.data.name }}
          </span>
        </span>
        <div class="flex">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconFilePlus"
            :title="t('request.new')"
            class="hidden group-hover:inline-flex"
          />
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconFolderPlus"
            :title="t('folder.new')"
            class="hidden group-hover:inline-flex"
          />
          <span>
            <tippy
              ref="options"
              interactive
              trigger="click"
              theme="popover"
              :on-shown="() => tippyActions.focus()"
            >
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.more')"
                :icon="IconMoreVertical"
              />
              <template #content="{ hide }">
                <div
                  ref="tippyActions"
                  class="flex flex-col focus:outline-none"
                  tabindex="0"
                  @keyup.escape="hide()"
                >
                  <SmartItem
                    ref="requestAction"
                    :icon="IconFilePlus"
                    :label="t('request.new')"
                    :shortcut="['R']"
                    @click="
                      () => {
                        hide()
                      }
                    "
                  />
                  <SmartItem
                    ref="folderAction"
                    :icon="IconFolderPlus"
                    :label="t('folder.new')"
                    :shortcut="['N']"
                    @click="
                      () => {
                        hide()
                      }
                    "
                  />
                  <SmartItem
                    ref="edit"
                    :icon="IconEdit"
                    :label="t('action.edit')"
                    :shortcut="['E']"
                    @click="
                      () => {
                        hide()
                      }
                    "
                  />
                  <SmartItem
                    ref="exportAction"
                    :icon="IconDownload"
                    :label="t('export.title')"
                    :shortcut="['X']"
                    @click="
                      () => {
                        hide()
                      }
                    "
                  />
                  <SmartItem
                    ref="deleteAction"
                    :icon="IconTrash2"
                    :label="t('action.delete')"
                    :shortcut="['⌫']"
                    @click="
                      () => {
                        hide()
                      }
                    "
                  />
                </div>
              </template>
            </tippy>
          </span>
        </div>
      </div>
      <div
        v-else-if="node.type === 'requests'"
        class="flex items-stretch group"
        draggable="true"
        @dragover.stop
        @dragleave="dragging = false"
        @dragend="dragging = false"
      >
        <span
          class="flex items-center justify-center w-16 px-2 truncate cursor-pointer"
          :class="getRequestLabelColor(node.data.method)"
        >
          <!-- <component
          :is="IconCheckCircle"
          v-if="isSelected"
          class="svg-icons"
          :class="{ 'text-accent': isSelected }"
        /> -->
          <span class="font-semibold truncate text-tiny">
            {{ node.data.method }}
          </span>
        </span>
        <span
          class="flex items-center flex-1 min-w-0 py-2 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
        >
          <span class="truncate">
            {{ node.data.name }}
          </span>
          <!-- <span
            v-if="true"
            v-tippy="{ theme: 'tooltip' }"
            class="relative h-1.5 w-1.5 flex flex-shrink-0 mx-3"
            :title="`${t('collection.request_in_use')}`"
          >
            <span
              class="absolute inline-flex flex-shrink-0 w-full h-full bg-green-500 rounded-full opacity-75 animate-ping"
            >
            </span>
            <span
              class="relative inline-flex flex-shrink-0 rounded-full h-1.5 w-1.5 bg-green-500"
            ></span>
          </span> -->
        </span>
        <div class="flex">
          <!-- <ButtonSecondary
          v-if="!saveRequest"
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconRotateCCW"
          :title="t('action.restore')"
          class="hidden group-hover:inline-flex"
          @click="selectRequest()"
        /> -->
          <span>
            <tippy
              ref="options"
              interactive
              trigger="click"
              theme="popover"
              :on-shown="() => tippyActions.focus()"
            >
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.more')"
                :icon="IconMoreVertical"
              />
              <template #content="{ hide }">
                <div
                  ref="tippyActions"
                  class="flex flex-col focus:outline-none"
                  tabindex="0"
                  @keyup.escape="hide()"
                >
                  <SmartItem
                    ref="edit"
                    :icon="IconEdit"
                    :label="t('action.edit')"
                    :shortcut="['E']"
                    @click="
                      () => {
                        hide()
                      }
                    "
                  />
                  <SmartItem
                    ref="duplicate"
                    :icon="IconCopy"
                    :label="t('action.duplicate')"
                    :shortcut="['D']"
                    @click="
                      () => {
                        hide()
                      }
                    "
                  />
                  <SmartItem
                    ref="deleteAction"
                    :icon="IconTrash2"
                    :label="t('action.delete')"
                    :shortcut="['⌫']"
                    @click="
                      () => {
                        hide()
                      }
                    "
                  />
                </div>
              </template>
            </tippy>
          </span>
        </div>
      </div>
      <div
        v-else-if="node.type === 'collections'"
        class="flex items-stretch group"
        @dragover.prevent
        @dragover="dragging = true"
        @drop="dragging = false"
        @dragleave="dragging = false"
        @dragend="dragging = false"
      >
        <span
          class="flex items-center justify-center px-4 cursor-pointer"
          @click="toggleChildren"
        >
          <component :is="getCollectionIcon(isOpen)" class="svg-icons" />
        </span>
        <span
          class="flex flex-1 min-w-0 py-2 pr-2 cursor-pointer transition group-hover:text-secondaryDark"
          @click="toggleChildren"
        >
          <span class="truncate" :class="{ 'text-accent': isSelected }">
            {{ node.data.name }}
          </span>
        </span>
        <div class="flex">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconFilePlus"
            :title="t('request.new')"
            class="hidden group-hover:inline-flex"
          />
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconFolderPlus"
            :title="t('folder.new')"
            class="hidden group-hover:inline-flex"
          />
          <span>
            <tippy
              ref="options"
              interactive
              trigger="click"
              theme="popover"
              :on-shown="() => tippyActions.focus()"
            >
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.more')"
                :icon="IconMoreVertical"
              />
              <template #content="{ hide }">
                <div
                  ref="tippyActions"
                  class="flex flex-col focus:outline-none"
                  tabindex="0"
                  @keyup.escape="hide()"
                >
                  <SmartItem
                    ref="requestAction"
                    :icon="IconFilePlus"
                    :label="t('request.new')"
                    :shortcut="['R']"
                    @click="
                      () => {
                        hide()
                      }
                    "
                  />
                  <SmartItem
                    ref="folderAction"
                    :icon="IconFolderPlus"
                    :label="t('folder.new')"
                    :shortcut="['N']"
                    @click="
                      () => {
                        hide()
                      }
                    "
                  />
                  <SmartItem
                    ref="edit"
                    :icon="IconEdit"
                    :label="t('action.edit')"
                    :shortcut="['E']"
                    @click="
                      () => {
                        $emit('edit-collection')
                        hide()
                      }
                    "
                  />
                  <SmartItem
                    ref="exportAction"
                    :icon="IconDownload"
                    :label="t('export.title')"
                    :shortcut="['X']"
                    @click="
                      () => {
                        hide()
                      }
                    "
                  />
                  <SmartItem
                    ref="deleteAction"
                    :icon="IconTrash2"
                    :label="t('action.delete')"
                    :shortcut="['⌫']"
                    @click="
                      () => {
                        hide()
                      }
                    "
                  />
                </div>
              </template>
            </tippy>
          </span>
        </div>
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
</template>

<script setup lang="ts">
import IconCopy from "~icons/lucide/copy"
import IconFolderPlus from "~icons/lucide/folder-plus"
import IconFilePlus from "~icons/lucide/file-plus"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconDownload from "~icons/lucide/download"
import IconTrash2 from "~icons/lucide/trash-2"
import IconEdit from "~icons/lucide/edit"
import IconFolder from "~icons/lucide/folder"
import IconFolderOpen from "~icons/lucide/folder-open"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { useReadonlyStream } from "~/composables/stream"
import { SmartTreeAdapter } from "~/helpers/tree/SmartTreeAdapter"
import { restCollections$ } from "~/newstore/collections"
import { ref } from "vue"
import { TippyComponent } from "vue-tippy"
import { useI18n } from "@composables/i18n"
import { useColorMode } from "~/composables/theming"

const t = useI18n()

const colorMode = useColorMode()

const collection = useReadonlyStream(restCollections$, [], "deep")

const dragging = ref(false)

const getCollectionIcon = (open: boolean) => {
  if (open) return IconFolderOpen
  else return IconFolder
}

const requestMethodLabels = {
  get: "text-green-500",
  post: "text-yellow-500",
  put: "text-blue-500",
  delete: "text-red-500",
  default: "text-gray-500",
}

const getRequestLabelColor = (method: string) =>
  requestMethodLabels[
    method.toLowerCase() as keyof typeof requestMethodLabels
  ] || requestMethodLabels.default

type Collection = HoppCollection<HoppRESTRequest>

type Folder = HoppCollection<HoppRESTRequest>

type Requests = HoppRESTRequest

type Node = Collection | Folder | Requests

class CollectionAdapter implements SmartTreeAdapter<Node> {
  constructor(public data: Collection[]) {}

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

const tippyActions = ref<TippyComponent | null>(null)
</script>
