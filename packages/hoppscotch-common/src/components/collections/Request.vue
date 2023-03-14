<template>
  <div class="flex flex-col">
    <div
      class="h-1"
      :class="[
        {
          'bg-accentDark': isReorderable,
        },
      ]"
      @drop="dropEvent"
      @dragover.prevent="ordering = true"
      @dragleave="resetDragState"
      @dragend="resetDragState"
    ></div>
    <div
      class="flex items-stretch group"
      :draggable="!hasNoTeamAccess"
      @drop="dropEvent"
      @dragstart="dragStart"
      @dragover="handleDragOver($event)"
      @dragleave="resetDragState"
      @dragend="resetDragState"
      @contextmenu.prevent="options?.tippy.show()"
    >
      <div
        class="flex items-center justify-center flex-1 min-w-0 cursor-pointer pointer-events-auto"
        @click="selectRequest()"
      >
        <span
          class="flex items-center justify-center w-16 px-2 truncate pointer-events-none"
          :class="requestLabelColor"
        >
          <component
            :is="IconCheckCircle"
            v-if="isSelected"
            class="svg-icons"
            :class="{ 'text-accent': isSelected }"
          />
          <HoppSmartSpinner v-else-if="isRequestLoading" />
          <span v-else class="font-semibold truncate text-tiny">
            {{ request.method }}
          </span>
        </span>
        <span
          class="flex items-center flex-1 min-w-0 py-2 pr-2 pointer-events-none transition group-hover:text-secondaryDark"
        >
          <span class="truncate" :class="{ 'text-accent': isSelected }">
            {{ request.name }}
          </span>
          <span
            v-if="isActive"
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
                  :loading="duplicateLoading"
                  :shortcut="['D']"
                  @click="
                    () => {
                      emit('duplicate-request'),
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
                      emit('remove-request')
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
</template>

<script setup lang="ts">
import IconCheckCircle from "~icons/lucide/check-circle"
import IconMoreVertical from "~icons/lucide/more-vertical"
import IconEdit from "~icons/lucide/edit"
import IconCopy from "~icons/lucide/copy"
import IconTrash2 from "~icons/lucide/trash-2"
import IconRotateCCW from "~icons/lucide/rotate-ccw"
import { ref, PropType, watch, computed } from "vue"
import { HoppRESTRequest } from "@hoppscotch/data"
import { useI18n } from "@composables/i18n"
import { TippyComponent } from "vue-tippy"
import { pipe } from "fp-ts/function"
import * as RR from "fp-ts/ReadonlyRecord"
import * as O from "fp-ts/Option"
import {
  changeCurrentReorderStatus,
  currentReorderingStatus$,
} from "~/newstore/reordering"
import { useReadonlyStream } from "~/composables/stream"

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
  duplicateLoading: {
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
})

const emit = defineEmits<{
  (event: "edit-request"): void
  (event: "duplicate-request"): void
  (event: "remove-request"): void
  (event: "select-request"): void
  (event: "drag-request", payload: DataTransfer): void
  (event: "update-request-order", payload: DataTransfer): void
}>()

const tippyActions = ref<TippyComponent | null>(null)
const edit = ref<HTMLButtonElement | null>(null)
const deleteAction = ref<HTMLButtonElement | null>(null)
const options = ref<TippyComponent | null>(null)
const duplicate = ref<HTMLButtonElement | null>(null)

const dragging = ref(false)
const ordering = ref(false)

const currentReorderingStatus = useReadonlyStream(currentReorderingStatus$, {
  type: "collection",
  id: "",
  parentID: "",
})

const requestMethodLabels = {
  get: "text-green-500",
  post: "text-yellow-500",
  put: "text-blue-500",
  delete: "text-red-500",
  default: "text-gray-500",
} as const

const requestLabelColor = computed(() =>
  pipe(
    requestMethodLabels,
    RR.lookup(props.request.method.toLowerCase()),
    O.getOrElseW(() => requestMethodLabels.default)
  )
)

watch(
  () => props.duplicateLoading,
  (val) => {
    if (!val) {
      options.value!.tippy.hide()
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

const isCollectionDragging = computed(() => {
  return currentReorderingStatus.value.type === "collection"
})

const isSameParent = computed(() => {
  return currentReorderingStatus.value.parentID === props.parentID
})

const isReorderable = computed(() => {
  return ordering.value && !isCollectionDragging.value && isSameParent.value
})

// Trigger the re-ordering event when a request is dragged over another request's top section
const handleDragOver = (e: DragEvent) => {
  dragging.value = true
  if (e.offsetY < 10) {
    ordering.value = true
    dragging.value = false
  } else {
    ordering.value = false
  }
}

const dropEvent = (e: DragEvent) => {
  if (e.dataTransfer) {
    e.stopPropagation()
    resetDragState()
    emit("update-request-order", e.dataTransfer)
  }
}

const isRequestLoading = computed(() => {
  if (props.requestMoveLoading.length > 0 && props.requestID) {
    return props.requestMoveLoading.includes(props.requestID)
  } else {
    return false
  }
})

const resetDragState = () => {
  dragging.value = false
  ordering.value = false
}
</script>
