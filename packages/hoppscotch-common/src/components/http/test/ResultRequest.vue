<template>
  <div class="flex items-stretch group ml-4 flex-col">
    <button
      @click="selectRequest()"
      class="w-full rounded px-4 py-3 transition cursor-pointer focus:outline-none hover:active hover:bg-primaryLight hover:text-secondaryDark"
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
        <span
          :class="[
            statusCategory.className,
            'outlined text-xs rounded-md px-2 flex items-center',
          ]"
          v-if="request.response?.statusCode"
        >
          {{ `${request.response?.statusCode}` }}
        </span>
        <span
          v-if="request.response?.isLoading"
          class="flex flex-col items-center"
        >
          <HoppSmartSpinner />
        </span>
      </div>

      <p class="text-left text-secondaryLight text-sm">
        {{ request.endpoint }}
      </p>
    </button>
    <HttpTestTestResult
      :show-empty-message="false"
      v-if="request.testResults"
      :model-value="request.testResults"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import findStatusGroup from "~/helpers/findStatusGroup"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"
import { TestRunnerRequest } from "~/services/test-runner/test-runner.service"

const props = withDefaults(
  defineProps<{
    request: TestRunnerRequest
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

const statusCategory = computed(() => {
  if (
    props.request?.response === null ||
    props.request?.response === undefined ||
    props.request?.response.type === "loading" ||
    props.request?.response.type === "network_fail" ||
    props.request?.response.type === "script_fail" ||
    props.request?.response.type === "fail" ||
    props.request?.response.type === "extension_error"
  )
    return {
      name: "error",
      className: "text-red-500",
    }
  return findStatusGroup(props.request?.response.statusCode)
})

const emit = defineEmits<{
  (event: "select-request"): void
}>()

const requestLabelColor = computed(() =>
  getMethodLabelColorClassOf(props.request.method)
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
