<template>
  <div class="flex flex-col">
    <div
      class="h-1 w-full transition"
      :class="[
        {
          'bg-accentDark': isReorderable,
        },
      ]"
      @drop="orderUpdateCollectionEvent"
      @dragover.prevent="ordering = true"
      @dragleave="ordering = false"
      @dragend="resetDragState"
    ></div>
    <div class="flex flex-col relative">
      <div
        class="absolute bg-accent opacity-0 pointer-events-none inset-0 z-1 transition"
        :class="{
          'opacity-25':
            dragging && notSameDestination && notSameParentDestination,
        }"
      ></div>
      <div
        class="flex items-stretch group relative z-3 cursor-pointer pointer-events-auto"
        :draggable="!hasNoTeamAccess"
        @dragstart="dragStart"
        @drop="handelDrop($event)"
        @dragover="handleDragOver($event)"
        @dragleave="resetDragState"
        @dragend="
          () => {
            resetDragState()
            dropItemID = ''
          }
        "
        @contextmenu.prevent="options?.tippy.show()"
      >
        <div
          class="flex items-center justify-center flex-1 min-w-0"
          @click="emit('toggle-children')"
        >
          <span
            class="flex items-center justify-center px-4 pointer-events-none"
          >
            <HoppSmartSpinner v-if="isCollLoading" />
            <component
              :is="collectionIcon"
              v-else
              class="svg-icons"
              :class="{ 'text-accent': isSelected }"
            />
          </span>
          <span
            class="flex flex-1 min-w-0 py-2 pr-2 transition pointer-events-none group-hover:text-secondaryDark"
          >
            <span class="truncate" :class="{ 'text-accent': isSelected }">
              {{ collectionName }}
            </span>
          </span>
        </div>
        <div v-if="!hasNoTeamAccess" class="flex">
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconFilePlus"
            :title="t('request.new')"
            class="hidden group-hover:inline-flex"
            @click="emit('add-request')"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :icon="IconFolderPlus"
            :title="t('folder.new')"
            class="hidden group-hover:inline-flex"
            @click="emit('add-folder')"
          />
          <span>
            <tippy
              ref="options"
              interactive
              trigger="click"
              theme="popover"
              :on-shown="() => tippyActions!.focus()"
            >
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.more')"
                :icon="IconMoreVertical"
              />
              <template #content="{ hide }">
                <div
                  ref="tippyActions"
                  class="flex flex-col focus:outline-none"
                  tabindex="0"
                  @keyup.r="requestAction?.$el.click()"
                  @keyup.n="folderAction?.$el.click()"
                  @keyup.e="edit?.$el.click()"
                  @keyup.delete="deleteAction?.$el.click()"
                  @keyup.x="exportAction?.$el.click()"
                  @keyup.escape="hide()"
                >
                  <HoppSmartItem
                    ref="requestAction"
                    :icon="IconFilePlus"
                    :label="t('request.new')"
                    :shortcut="['R']"
                    @click="
                      () => {
                        emit('add-request')
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    ref="folderAction"
                    :icon="IconFolderPlus"
                    :label="t('folder.new')"
                    :shortcut="['N']"
                    @click="
                      () => {
                        emit('add-folder')
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    ref="edit"
                    :icon="IconEdit"
                    :label="t('action.edit')"
                    :shortcut="['E']"
                    @click="
                      () => {
                        emit('edit-collection')
                        hide()
                      }
                    "
                  />
                  <HoppSmartItem
                    ref="exportAction"
                    :icon="IconDownload"
                    :label="t('export.title')"
                    :shortcut="['X']"
                    :loading="exportLoading"
                    @click="
                      () => {
                        emit('export-data'),
                          collectionsType === 'my-collections' ? hide() : null
                      }
                    "
                  />
                  <HoppSmartItem
                    ref="deleteAction"
                    :icon="IconTrash2"
                    :label="t('action.delete')"
                    :shortcut="['⌫']"
                    @click="
                      () => {
                        emit('remove-collection')
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
    </div>
    <div
      v-if="isLastItem"
      class="w-full transition"
      :class="[
        {
          'bg-accentDark': isLastItemReorderable,
          'h-1 ': isLastItem,
        },
      ]"
      @drop="updateLastItemOrder"
      @dragover.prevent="orderingLastItem = true"
      @dragleave="orderingLastItem = false"
      @dragend="resetDragState"
    ></div>
  </div>
</template>

<script setup lang="ts">
import IconCheckCircle from "~icons/lucide/check-circle"
import IconFolderPlus from "~icons/lucide/folder-plus"
import IconFilePlus from "~icons/lucide/file-plus"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconDownload from "~icons/lucide/download"
import IconTrash2 from "~icons/lucide/trash-2"
import IconEdit from "~icons/lucide/edit"
import IconFolder from "~icons/lucide/folder"
import IconFolderOpen from "~icons/lucide/folder-open"
import { ref, computed, watch } from "vue"
import { HoppCollection, HoppRESTRequest } from "@hoppscotch/data"
import { useI18n } from "@composables/i18n"
import { TippyComponent } from "vue-tippy"
import { TeamCollection } from "~/helpers/teams/TeamCollection"
import {
  changeCurrentReorderStatus,
  currentReorderingStatus$,
} from "~/newstore/reordering"
import { useReadonlyStream } from "~/composables/stream"

type CollectionType = "my-collections" | "team-collections"
type FolderType = "collection" | "folder"

const t = useI18n()

const props = withDefaults(
  defineProps<{
    id: string
    parentID?: string | null
    data: HoppCollection<HoppRESTRequest> | TeamCollection
    /**
     * Collection component can be used for both collections and folders.
     * folderType is used to determine which one it is.
     */
    collectionsType: CollectionType
    folderType: FolderType
    isOpen: boolean
    isSelected?: boolean | null
    exportLoading?: boolean
    hasNoTeamAccess?: boolean
    collectionMoveLoading?: string[]
    isLastItem?: boolean
  }>(),
  {
    id: "",
    parentID: null,
    collectionsType: "my-collections",
    folderType: "collection",
    isOpen: false,
    isSelected: false,
    exportLoading: false,
    hasNoTeamAccess: false,
    isLastItem: false,
  }
)

const emit = defineEmits<{
  (event: "toggle-children"): void
  (event: "add-request"): void
  (event: "add-folder"): void
  (event: "edit-collection"): void
  (event: "export-data"): void
  (event: "remove-collection"): void
  (event: "drop-event", payload: DataTransfer): void
  (event: "drag-event", payload: DataTransfer): void
  (event: "dragging", payload: boolean): void
  (event: "update-collection-order", payload: DataTransfer): void
  (event: "update-last-collection-order", payload: DataTransfer): void
}>()

const tippyActions = ref<TippyComponent | null>(null)
const requestAction = ref<HTMLButtonElement | null>(null)
const folderAction = ref<HTMLButtonElement | null>(null)
const edit = ref<HTMLButtonElement | null>(null)
const deleteAction = ref<HTMLButtonElement | null>(null)
const exportAction = ref<HTMLButtonElement | null>(null)
const options = ref<TippyComponent | null>(null)

const dragging = ref(false)
const ordering = ref(false)
const orderingLastItem = ref(false)
const dropItemID = ref("")

const currentReorderingStatus = useReadonlyStream(currentReorderingStatus$, {
  type: "collection",
  id: "",
  parentID: "",
})

// Used to determine if the collection is being dragged to a different destination
// This is used to make the highlight effect work
watch(
  () => dragging.value,
  (val) => {
    if (val && notSameDestination.value && notSameParentDestination.value) {
      emit("dragging", true)
    } else {
      emit("dragging", false)
    }
  }
)

const collectionIcon = computed(() => {
  if (props.isSelected) return IconCheckCircle
  else if (!props.isOpen) return IconFolder
  else if (props.isOpen) return IconFolderOpen
  else return IconFolder
})

const collectionName = computed(() => {
  if ((props.data as HoppCollection<HoppRESTRequest>).name)
    return (props.data as HoppCollection<HoppRESTRequest>).name
  else return (props.data as TeamCollection).title
})

watch(
  () => props.exportLoading,
  (val) => {
    if (!val) {
      options.value!.tippy.hide()
    }
  }
)

const notSameParentDestination = computed(() => {
  return currentReorderingStatus.value.parentID !== props.id
})

const isRequestDragging = computed(() => {
  return currentReorderingStatus.value.type === "request"
})

const isSameParent = computed(() => {
  return currentReorderingStatus.value.parentID === props.parentID
})

const isReorderable = computed(() => {
  return (
    ordering.value &&
    notSameDestination.value &&
    !isRequestDragging.value &&
    isSameParent.value
  )
})
const isLastItemReorderable = computed(() => {
  return (
    orderingLastItem.value &&
    notSameDestination.value &&
    !isRequestDragging.value &&
    isSameParent.value
  )
})

const dragStart = ({ dataTransfer }: DragEvent) => {
  if (dataTransfer) {
    emit("drag-event", dataTransfer)
    dropItemID.value = dataTransfer.getData("collectionIndex")
    dragging.value = !dragging.value
    changeCurrentReorderStatus({
      type: "collection",
      id: props.id,
      parentID: props.parentID,
    })
  }
}

// Trigger the re-ordering event when a collection is dragged over another collection's top section
const handleDragOver = (e: DragEvent) => {
  dragging.value = true
  if (
    e.offsetY < 10 &&
    notSameDestination.value &&
    !isRequestDragging.value &&
    isSameParent.value
  ) {
    ordering.value = true
    dragging.value = false
    orderingLastItem.value = false
  } else if (
    e.offsetY > 18 &&
    notSameDestination.value &&
    !isRequestDragging.value &&
    isSameParent.value &&
    props.isLastItem
  ) {
    orderingLastItem.value = true
    dragging.value = false
    ordering.value = false
  } else {
    ordering.value = false
    orderingLastItem.value = false
  }
}

const handelDrop = (e: DragEvent) => {
  if (ordering.value) {
    orderUpdateCollectionEvent(e)
  } else if (orderingLastItem.value) {
    updateLastItemOrder(e)
  } else {
    notSameParentDestination.value ? dropEvent(e) : e.stopPropagation()
  }
}

const dropEvent = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.stopPropagation()
    emit("drop-event", e.dataTransfer)
    resetDragState()
  }
}

const orderUpdateCollectionEvent = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.stopPropagation()
    emit("update-collection-order", e.dataTransfer)
    resetDragState()
  }
}

const updateLastItemOrder = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.stopPropagation()
    emit("update-last-collection-order", e.dataTransfer)
    resetDragState()
  }
}

const notSameDestination = computed(() => {
  return dropItemID.value !== props.id
})

const isCollLoading = computed(() => {
  const { collectionMoveLoading } = props
  if (
    collectionMoveLoading &&
    collectionMoveLoading.length > 0 &&
    props.data.id
  ) {
    return collectionMoveLoading.includes(props.data.id)
  } else {
    return false
  }
})

const resetDragState = () => {
  dragging.value = false
  ordering.value = false
  orderingLastItem.value = false
}
</script>
