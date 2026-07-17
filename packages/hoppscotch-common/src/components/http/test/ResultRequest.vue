<template>
  <div class="flex items-stretch group ml-4 flex-col">
    <button
      class="w-full rounded px-4 py-3 transition cursor-pointer focus:outline-none hover:bg-primaryLight hover:text-secondaryDark"
      :class="{ 'bg-primaryLight': isSelected }"
      @click="selectRequest()"
    >
      <div class="flex gap-4 mb-1 items-center">
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
          v-if="request.response?.statusCode"
          :class="[
            statusCategory.className,
            'outlined text-[10px] rounded px-2 flex items-center',
          ]"
        >
          {{ `${request.response?.statusCode}` }}
        </span>
        <span
          v-if="responseDuration !== null"
          class="text-[10px] text-secondaryLight flex items-center"
        >
          {{ `${responseDuration} ms` }}
        </span>
        <span
          v-if="responseSize !== null"
          class="text-[10px] text-secondaryLight flex items-center"
        >
          {{ responseSize }}
        </span>
        <span v-if="isLoading" class="flex flex-col items-center">
          <HoppSmartSpinner />
        </span>
      </div>

      <p class="text-left text-secondaryLight text-sm">
        {{ request.endpoint }}
      </p>
    </button>

    <div
      v-if="request.error"
      class="py-2 pl-4 ml-4 mb-2 border-l"
      :style="{
        color: 'var(--status-critical-error-color)',
        borderColor: 'var(--status-critical-error-color)',
      }"
    >
      <span> {{ request.error }} </span>
    </div>
    <HttpTestTestResult
      v-if="request.testResults"
      :model-value="request.testResults"
      :show-test-type="showTestType"
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
    showTestType: "all" | "passed" | "failed"
  }>(),
  {
    parentID: null,
    isActive: false,
    isSelected: false,
    requestID: "",
  }
)

const isLoading = computed(() => props.request?.isLoading)

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
      className: "critical-error-response",
    }
  return findStatusGroup(props.request?.response.statusCode)
})

// Only success/fail responses carry meta (duration + size).
const responseMeta = computed(() => {
  const response = props.request?.response
  if (response?.type === "success" || response?.type === "fail")
    return response.meta
  return null
})

const responseDuration = computed(
  () => responseMeta.value?.responseDuration ?? null
)

const responseSize = computed(() => {
  const size = responseMeta.value?.responseSize
  if (size === undefined) return null
  if (size >= 100000) return `${(size / 1000000).toFixed(2)} MB`
  if (size >= 1000) return `${(size / 1000).toFixed(2)} KB`
  return `${size} B`
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
