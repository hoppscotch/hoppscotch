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
      :draggable="!hasNoTeamAccess"
      @drop="handelDrop"
      @dragstart="dragStart"
      @dragover="handleDragOver($event)"
      @dragleave="resetDragState"
      @dragend="resetDragState"
      @contextmenu.prevent="options?.tippy?.show()"
    >
      <div
        class="pointer-events-auto flex min-w-0 flex-1 cursor-pointer items-center justify-center"
        @click="selectRequest()"
      >
        <span
          class="pointer-events-none flex w-16 items-center justify-center truncate px-2"
          :style="{ color: getMethodLabelColorClassOf(request) }"
        >
          <component
            :is="IconCheckCircle"
            v-if="isSelected"
            class="svg-icons"
            :class="{ 'text-accent': isSelected }"
          />
          <HoppSmartSpinner v-else-if="isRequestLoading" />
          <span v-else class="truncate text-tiny font-semibold">
            {{ request.method }}
          </span>
        </span>
        <span
          class="pointer-events-none flex min-w-0 flex-1 items-center py-2 pr-2 transition group-hover:text-secondaryDark"
        >
          <span class="truncate" :class="{ 'text-accent': isSelected }">
            {{ request.name }}
          </span>
          <span
            v-if="isActive"
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
      <div v-if="!hasNoTeamAccess" class="flex">
        <HoppButtonSecondary
          v-if="!saveRequest"
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconRotateCCW"
          :title="t('action.restore')"
          class="hidden group-hover:inline-flex"
          @click="selectRequest()"
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
                      emit('edit-request')
                      hide()
                    }
                  "
                />
                <HoppSmartItem
                  ref="duplicate"
                  :icon="IconCopy"
                  :label="t('action.duplicate')"
                  :loading="duplicateRequestLoading"
                  :shortcut="['D']"
                  @click="
                    () => {
                      emit('duplicate-request')
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
                      emit('remove-request')
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
                      emit('share-request')
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
          'h-1 ': isLastItem,
        },
      ]"
      @drop="handelDrop"
      @dragover.prevent="orderingLastItem = true"
      @dragleave="resetDragState"
      @dragend="resetDragState"
    ></div>
  </div>
</template>

<script setup lang="ts">
import IconCheckCircle from "~icons/lucide/check-circle"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconEdit from "~icons/lucide/edit"
import IconCopy from "~icons/lucide/copy"
import IconTrash2 from "~icons/lucide/trash-2"
import IconRotateCCW from "~icons/lucide/rotate-ccw"
import IconShare2 from "~icons/lucide/share-2"
import { ref, PropType, watch, computed } from "vue"
import { HoppRESTRequest } from "@hoppscotch/data"
import { useI18n } from "@composables/i18n"
import { TippyComponent } from "vue-tippy"
import {
  changeCurrentReorderStatus,
  currentReorderingStatus$,
} from "~/newstore/reordering"
import { useReadonlyStream } from "~/composables/stream"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"

type CollectionType = "my-collections" | "team-collections"

const t = useI18n()

const props = defineProps({
  request: {
    type: Object as PropType<HoppRESTRequest>,
    default: () => ({}),
    required: true,
  },
  requestID: {
    type: String,
    default: "",
    required: false,
  },
  parentID: {
    type: String as PropType<string | null>,
    default: null,
    required: true,
  },
  collectionsType: {
    type: String as PropType<CollectionType>,
    default: "my-collections",
    required: true,
  },
  duplicateRequestLoading: {
    type: Boolean,
    default: false,
    required: false,
  },
  saveRequest: {
    type: Boolean,
    default: false,
    required: false,
  },
  isActive: {
    type: Boolean,
    default: false,
    required: false,
  },
  hasNoTeamAccess: {
    type: Boolean,
    default: false,
    required: false,
  },
  isSelected: {
    type: Boolean as PropType<boolean | null>,
    default: false,
    required: false,
  },
  requestMoveLoading: {
    type: Array as PropType<string[]>,
    default: () => [],
    required: false,
  },
  isLastItem: {
    type: Boolean,
    default: false,
    required: false,
  },
})

const emit = defineEmits<{
  (event: "edit-request"): void
  (event: "duplicate-request"): void
  (event: "remove-request"): void
  (event: "select-request"): void
  (event: "share-request"): void
  (event: "drag-request", payload: DataTransfer): void
  (event: "update-request-order", payload: DataTransfer): void
  (event: "update-last-request-order", payload: DataTransfer): void
}>()

const tippyActions = ref<HTMLButtonElement | null>(null)
const edit = ref<HTMLButtonElement | null>(null)
const deleteAction = ref<HTMLButtonElement | null>(null)
const options = ref<TippyComponent | null>(null)
const duplicate = ref<HTMLButtonElement | null>(null)
const shareAction = ref<HTMLButtonElement | null>(null)

const dragging = ref(false)
const ordering = ref(false)
const orderingLastItem = ref(false)

const currentReorderingStatus = useReadonlyStream(currentReorderingStatus$, {
  type: "collection",
  id: "",
  parentID: "",
})

watch(
  () => props.duplicateRequestLoading,
  (val) => {
    if (!val) {
      options.value!.tippy?.hide()
    }
  }
)

const selectRequest = () => {
  emit("select-request")
}

const dragStart = ({ dataTransfer }: DragEvent) => {
  if (dataTransfer) {
    emit("drag-request", dataTransfer)
    dragging.value = !dragging.value
    changeCurrentReorderStatus({
      type: "request",
      id: props.requestID,
      parentID: props.parentID,
    })
  }
}

const isSameRequest = computed(() => {
  return currentReorderingStatus.value.id === props.requestID
})

const isCollectionDragging = computed(() => {
  return currentReorderingStatus.value.type === "collection"
})

const isSameParent = computed(() => {
  return currentReorderingStatus.value.parentID === props.parentID
})

const isReorderable = computed(() => {
  return (
    ordering.value &&
    !isCollectionDragging.value &&
    isSameParent.value &&
    !isSameRequest.value
  )
})

const isLastItemReorderable = computed(() => {
  return (
    orderingLastItem.value && isSameParent.value && !isCollectionDragging.value
  )
})

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

const handelDrop = (e: DragEvent) => {
  if (ordering.value) {
    updateRequestOrder(e)
  } else if (orderingLastItem.value) {
    updateLastItemOrder(e)
  } else {
    updateRequestOrder(e)
  }
}

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

const isRequestLoading = computed(() => {
  if (props.requestMoveLoading.length > 0 && props.requestID) {
    return props.requestMoveLoading.includes(props.requestID)
  }
  return false
})

const resetDragState = () => {
  dragging.value = false
  ordering.value = false
  orderingLastItem.value = false
}
</script>
