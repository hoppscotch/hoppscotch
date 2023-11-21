<template>
  <div class="flex flex-col">
    <div class="h-1 w-full transition"></div>
    <div class="flex items-stretch group">
      <div
        class="flex items-center justify-center flex-1 min-w-0 cursor-pointer pointer-events-auto"
        @click="selectRequest()"
      >
        <span
          class="flex items-center justify-center px-2 truncate pointer-events-none"
          :class="requestLabelColor"
        >
          <HoppSmartCheckbox
            v-if="showSelection"
            :on="isSelected"
            class="mx-2 ml-4"
          />
          <span class="font-semibold truncate text-tiny">
            {{ request.method }}
          </span>
        </span>
        <span
          class="flex items-center flex-1 min-w-0 py-2 pr-2 pointer-events-none transition group-hover:text-secondaryDark"
        >
          <span class="truncate">
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
    </div>
    <div
      class="w-full transition"
      :class="[
        {
          'bg-accentDark': isLastItemReorderable,
          'h-1 ': isLastItem,
        },
      ]"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { HoppRESTRequest } from "@hoppscotch/data"
import { useI18n } from "@composables/i18n"
import { currentReorderingStatus$ } from "~/newstore/reordering"
import { useReadonlyStream } from "~/composables/stream"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"

const t = useI18n()

const props = withDefaults(
  defineProps<{
    request: HoppRESTRequest
    requestID?: string
    parentID: string | null
    duplicateLoading?: boolean
    saveRequest?: boolean
    isActive?: boolean
    hasNoTeamAccess?: boolean
    isSelected?: boolean
    requestMoveLoading?: string[]
    isLastItem?: boolean
    showSelection?: boolean
  }>(),
  {
    parentID: null,
    duplicateLoading: false,
    saveRequest: false,
    isActive: false,
    hasNoTeamAccess: false,
    isSelected: false,
    isLastItem: false,
    showSelection: false,
  }
)

const emit = defineEmits<{
  (event: "edit-request"): void
  (event: "duplicate-request"): void
  (event: "remove-request"): void
  (event: "select-request"): void
  (event: "drag-request", payload: DataTransfer): void
  (event: "update-request-order", payload: DataTransfer): void
  (event: "update-last-request-order", payload: DataTransfer): void
}>()

const orderingLastItem = ref(false)

const currentReorderingStatus = useReadonlyStream(currentReorderingStatus$, {
  type: "collection",
  id: "",
  parentID: "",
})

const requestLabelColor = computed(() =>
  getMethodLabelColorClassOf(props.request)
)

const selectRequest = () => {
  emit("select-request")
}

const isCollectionDragging = computed(() => {
  return currentReorderingStatus.value.type === "collection"
})

const isSameParent = computed(() => {
  return currentReorderingStatus.value.parentID === props.parentID
})

const isLastItemReorderable = computed(() => {
  return (
    orderingLastItem.value && isSameParent.value && !isCollectionDragging.value
  )
})
</script>
