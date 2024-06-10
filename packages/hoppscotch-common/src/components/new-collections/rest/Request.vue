<template>
  <div class="flex flex-col">
    <div
      class="h-1 w-full transition"
      :class="[
        {
          'bg-accentDark': isReorderable,
        },
      ]"
      @drop="updateRequestOrder"
      @dragover.prevent="ordering = true"
      @dragleave="resetDragState"
      @dragend="resetDragState"
    ></div>

    <div
      class="group flex items-stretch"
      :draggable="true"
      @dragstart="dragStart"
      @dragover="handleDragOver($event)"
      @dragleave="resetDragState"
      @dragend="resetDragState"
      @drop="handleDrop"
      @contextmenu.prevent="options?.tippy?.show()"
    >
      <div
        class="pointer-events-auto flex min-w-0 flex-1 cursor-pointer items-center justify-center"
        @click="selectRequest"
      >
        <span
          class="pointer-events-none flex w-16 items-center justify-center truncate px-2"
          :class="requestLabelColor"
          :style="{ color: requestLabelColor }"
        >
          <component
            :is="IconCheckCircle"
            v-if="isSelected"
            class="svg-icons"
            :class="{ 'text-accent': isSelected }"
          />
          <span v-else class="truncate text-tiny font-semibold">
            {{ requestView.request.method }}
          </span>
        </span>
        <span
          class="pointer-events-none flex min-w-0 flex-1 items-center py-2 pr-2 transition group-hover:text-secondaryDark"
        >
          <span class="truncate" :class="{ 'text-accent': isSelected }">
            {{ requestView.request.name }}
          </span>
          <span
            v-if="props.isActive"
            v-tippy="{ theme: 'tooltip' }"
            class="relative mx-3 flex h-1.5 w-1.5 flex-shrink-0"
            :title="`${t('collection.request_in_use')}`"
          >
            <span
              class="absolute inline-flex h-full w-full flex-shrink-0 animate-ping rounded-full bg-green-500 opacity-75"
            >
            </span>
            <span
              class="relative inline-flex h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500"
            ></span>
          </span>
        </span>
      </div>

      <div class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconRotateCCW"
          :title="t('action.restore')"
          class="hidden group-hover:inline-flex"
          @click="selectRequest"
        />
        <span>
          <tippy
            ref="options"
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => tippyActions?.focus()"
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
                @keyup.e="edit?.$el.click()"
                @keyup.d="duplicate?.$el.click()"
                @keyup.delete="deleteAction?.$el.click()"
                @keyup.s="shareAction?.$el.click()"
                @keyup.escape="hide()"
              >
                <HoppSmartItem
                  ref="edit"
                  :icon="IconEdit"
                  :label="t('action.edit')"
                  :shortcut="['E']"
                  @click="
                    () => {
                      emit('edit-request', {
                        requestIndexPath: requestView.requestID,
                        requestName: requestView.request.name,
                      })
                      hide()
                    }
                  "
                />
                <HoppSmartItem
                  ref="duplicate"
                  :icon="IconCopy"
                  :label="t('action.duplicate')"
                  :shortcut="['D']"
                  @click="
                    () => {
                      emit('duplicate-request', requestView.requestID)
                      hide()
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
                      emit('remove-request', requestView.requestID)
                      hide()
                    }
                  "
                />
                <HoppSmartItem
                  ref="shareAction"
                  :icon="IconShare2"
                  :label="t('action.share')"
                  :shortcut="['S']"
                  @click="
                    () => {
                      emit('share-request', requestView.request)
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
      class="w-full transition"
      :class="[
        {
          'bg-accentDark': isLastItemReorderable,
          'h-1 ': props.requestView.isLastItem,
        },
      ]"
      @drop="handleDrop"
      @dragover.prevent="orderingLastItem = true"
      @dragleave="resetDragState"
      @dragend="resetDragState"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { HoppRESTRequest } from "@hoppscotch/data"
import { computed, ref } from "vue"
import { TippyComponent } from "vue-tippy"
import { useReadonlyStream } from "~/composables/stream"

import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"
import {
  currentReorderingStatus$,
  changeCurrentReorderStatus,
} from "~/newstore/reordering"
import { RESTCollectionViewRequest } from "~/services/new-workspace/view"

import IconCheckCircle from "~icons/lucide/check-circle"
import IconCopy from "~icons/lucide/copy"
import IconEdit from "~icons/lucide/edit"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconRotateCCW from "~icons/lucide/rotate-ccw"
import IconShare2 from "~icons/lucide/share-2"
import IconTrash2 from "~icons/lucide/trash-2"

const t = useI18n()

const currentReorderingStatus = useReadonlyStream(currentReorderingStatus$, {
  type: "collection",
  id: "",
  parentID: "",
})

const props = defineProps<{
  isActive: boolean
  requestView: RESTCollectionViewRequest
  isSelected: boolean | null | undefined
}>()

const emit = defineEmits<{
  (event: "duplicate-request", requestIndexPath: string): void
  (
    event: "edit-request",
    payload: {
      requestIndexPath: string
      requestName: string
    }
  ): void
  (event: "remove-request", requestIndexPath: string): void
  (event: "select-request", requestIndexPath: string): void
  (event: "share-request", request: HoppRESTRequest): void
  (event: "drag-request", payload: DataTransfer): void
  (event: "update-request-order", payload: DataTransfer): void
  (event: "update-last-request-order", payload: DataTransfer): void
}>()

const tippyActions = ref<TippyComponent | null>(null)
const edit = ref<HTMLButtonElement | null>(null)
const deleteAction = ref<HTMLButtonElement | null>(null)
const options = ref<TippyComponent | null>(null)
const duplicate = ref<HTMLButtonElement | null>(null)
const shareAction = ref<HTMLButtonElement | null>(null)

const dragging = ref(false)
const ordering = ref(false)
const orderingLastItem = ref(false)

const isCollectionDragging = computed(() => {
  return currentReorderingStatus.value.type === "collection"
})

const isLastItemReorderable = computed(() => {
  return (
    orderingLastItem.value && isSameParent.value && !isCollectionDragging.value
  )
})

const isReorderable = computed(() => {
  return (
    ordering.value &&
    !isCollectionDragging.value &&
    isSameParent.value &&
    !isSameRequest.value
  )
})

const isSameParent = computed(() => {
  return (
    currentReorderingStatus.value.parentID === props.requestView.collectionID
  )
})

const isSameRequest = computed(() => {
  return currentReorderingStatus.value.id === props.requestView.requestID
})

const requestLabelColor = computed(() =>
  getMethodLabelColorClassOf(props.requestView.request)
)

const dragStart = ({ dataTransfer }: DragEvent) => {
  if (dataTransfer) {
    emit("drag-request", dataTransfer)
    dragging.value = !dragging.value

    changeCurrentReorderStatus({
      type: "request",
      id: props.requestView.requestID,
      parentID: props.requestView.collectionID,
    })
  }
}

const handleDrop = (e: DragEvent) => {
  if (ordering.value) {
    updateRequestOrder(e)
  } else if (orderingLastItem.value) {
    updateLastItemOrder(e)
  } else {
    updateRequestOrder(e)
  }
}

// Trigger the re-ordering event when a request is dragged over another request's top section
const handleDragOver = (e: DragEvent) => {
  dragging.value = true
  if (e.offsetY < 10) {
    ordering.value = true
    dragging.value = false
    orderingLastItem.value = false
  } else if (e.offsetY > 18) {
    orderingLastItem.value = true
    dragging.value = false
    ordering.value = false
  } else {
    ordering.value = false
    orderingLastItem.value = false
  }
}

const resetDragState = () => {
  dragging.value = false
  ordering.value = false
  orderingLastItem.value = false
}

const selectRequest = () => emit("select-request", props.requestView.requestID)

const updateRequestOrder = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.stopPropagation()
    resetDragState()
    emit("update-request-order", e.dataTransfer)
  }
}

const updateLastItemOrder = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.stopPropagation()
    resetDragState()
    emit("update-last-request-order", e.dataTransfer)
  }
}
</script>
