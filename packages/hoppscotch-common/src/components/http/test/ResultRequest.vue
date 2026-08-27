<template>
  <div class="flex items-stretch group ml-4 flex-col">
    <button
      class="w-full rounded px-4 py-3 transition cursor-pointer focus:outline-none hover:bg-primaryLight hover:text-secondaryDark"
      :class="{ 'bg-primaryLight': isSelected }"
      @click="selectRequest()"
    >
      <div class="flex gap-4 mb-1 items-center">
        <!-- Results are flat, so the folder shows here instead of by nesting. -->
        <span
          v-if="request.folderPath?.length"
          v-tippy="{ theme: 'tooltip' }"
          :title="request.folderPath.join(' / ')"
          class="flex items-center flex-shrink-0 text-secondaryLight"
        >
          <template v-for="(folder, depth) in request.folderPath" :key="depth">
            <component :is="IconFolder" class="svg-icons" />
            <component :is="IconChevronRight" class="svg-icons opacity-60" />
          </template>
        </span>
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

        <span class="flex-1" />

        <div class="flex flex-shrink-0 items-center gap-2">
          <span
            v-if="request.response?.statusCode"
            v-tippy="{ theme: 'tooltip' }"
            :title="statusTooltip"
            :class="statusCategory.className"
            class="outlined rounded px-1.5 py-0.5 text-tiny font-semibold tabular-nums leading-none flex items-center"
          >
            {{ request.response.statusCode }}
          </span>
          <span
            v-if="responseDuration !== null"
            class="text-tiny text-secondaryLight tabular-nums"
          >
            {{ `${responseDuration} ms` }}
          </span>
          <span
            v-if="responseSize !== null"
            class="text-tiny text-secondaryLight tabular-nums"
          >
            {{ responseSize }}
          </span>
          <span v-if="isLoading" class="flex items-center">
            <HoppSmartSpinner />
          </span>
        </div>
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
import { getStatusCodePhrase } from "~/helpers/utils/statusCodes"
import { TestRunnerRequest } from "~/services/test-runner/test-runner.service"
import IconChevronRight from "~icons/lucide/chevron-right"
import IconFolder from "~icons/lucide/folder"

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

// The badge stays a bare code; the reason phrase rides along on hover.
const statusTooltip = computed(() => {
  const response = props.request?.response
  if (response?.type !== "success" && response?.type !== "fail") return ""

  return getStatusCodePhrase(response.statusCode, response.statusText)
})

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
