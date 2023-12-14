<template>
  <div class="flex items-stretch group ml-4">
    <button
      @click="selectRequest()"
      class="w-full rounded px-6 py-3 transition cursor-pointer focus:outline-none hover:active hover:bg-primaryLight hover:text-secondaryDark"
    >
      <div class="flex gap-4 mb-1">
        <span
          class="flex items-center justify-center truncate pointer-events-none"
          :style="{ color: requestLabelColor }"
        >
          <span class="font-bold truncate">
            {{ request.method }}
          </span>
        </span>
        <span class="truncate text-sm text-secondaryDark">
          {{ request.name }}
        </span>
      </div>

      <p class="text-left text-secondaryLight text-sm">
        {{ request.endpoint }}
      </p>
    </button>
  </div>

  <HttpTestResult
    :show-empty-message="false"
    v-if="request.testResults"
    v-model="request.testResults"
  />
</template>

<script setup lang="ts">
import { computed } from "vue"
import { HoppRESTRequest } from "@hoppscotch/data"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"

const props = withDefaults(
  defineProps<{
    request: HoppRESTRequest
    requestID?: string
    parentID: string | null
    isActive?: boolean
    isSelected?: boolean
    showSelection?: boolean
  }>(),
  {
    parentID: null,
    isActive: false,
    isSelected: false,
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

const requestLabelColor = computed(() =>
  getMethodLabelColorClassOf(props.request)
)

const selectRequest = () => {
  emit("select-request")
}
</script>

<style lang="scss" scoped>
.active {
  @apply after:bg-accentLight;
}
</style>
