<template>
  <div class="flex items-stretch group ml-4 flex-col">
    <button
      class="w-full rounded px-4 py-3 transition cursor-pointer focus:outline-none hover:bg-primaryLight hover:text-secondaryDark"
      :class="{ 'bg-primaryLight': isSelected }"
      @click="selectRequest()"
    >
      <div class="flex gap-4 mb-1 items-center">
        <span
          v-if="requestChip.kind === 'rest'"
          class="flex items-center justify-center truncate pointer-events-none"
          :style="{ color: requestLabelColor }"
        >
          <span class="font-bold truncate">
            {{ requestChip.method }}
          </span>
        </span>
        <span
          v-else
          class="flex items-center justify-center pointer-events-none text-accent"
        >
          <component :is="IconGraphql" class="h-4 w-4" />
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
        <span v-if="isLoading" class="flex flex-col items-center">
          <HoppSmartSpinner />
        </span>
      </div>

      <p class="text-left text-secondaryLight text-sm">
        {{ requestTarget }}
      </p>
    </button>

    <div
      v-if="request.error"
      class="py-2 pl-4 ml-4 mb-2 border-l text-red-500 border-red-500"
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
import { isRESTRequest } from "~/helpers/request-type"
import { TestRunnerRequest } from "~/services/test-runner/test-runner.service"
import IconGraphql from "~icons/hopp/graphql"

const props = withDefaults(
  defineProps<{
    request: TestRunnerRequest
    requestID?: string
    parentID: string | null
    isActive?: boolean
    isSelected?: boolean
    showSelection?: boolean
    showTestType: "all" | "passed" | "failed"
  }>(),
  {
    parentID: null,
    isActive: false,
    isSelected: false,
    showSelection: false,
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
      className: "text-red-500",
    }
  return findStatusGroup(props.request?.response.statusCode)
})

const emit = defineEmits<{
  (event: "select-request"): void
}>()

// Per-entry protocol discrimination — unified collections mix REST and
// GraphQL requests in the same run.
const requestChip = computed(() =>
  isRESTRequest(props.request)
    ? { kind: "rest" as const, method: props.request.method }
    : { kind: "gql" as const }
)

const requestTarget = computed(() =>
  isRESTRequest(props.request) ? props.request.endpoint : props.request.url
)

const requestLabelColor = computed(() =>
  requestChip.value.kind === "rest"
    ? getMethodLabelColorClassOf(requestChip.value.method)
    : ""
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
