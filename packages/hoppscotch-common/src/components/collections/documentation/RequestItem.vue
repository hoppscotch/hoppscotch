<template>
  <div
    class="py-1.5 space-x-2 flex items-center group cursor-pointer"
    @click.stop="$emit('request-select', actualRequest)"
  >
    <span
      class="text-tiny px-1 rounded-sm"
      :class="getMethodClass(requestMethod)"
    >
      {{ requestMethod }}
    </span>
    <span
      class="text-secondaryLight text-xs truncate transition-colors group-hover:text-secondaryDark"
    >
      {{ requestName }}
    </span>
  </div>
</template>

<script lang="ts" setup>
import { HoppRESTRequest } from "@hoppscotch/data"
import { computed } from "vue"

type HoppRequest = HoppRESTRequest

const props = defineProps<{
  request: HoppRequest
  depth?: number
}>()

defineEmits<{
  (e: "request-select", request: HoppRESTRequest): void
}>()

const actualRequest = computed<HoppRESTRequest>(() => {
  return props.request
})

const requestName = computed<string>(() => {
  return props.request.name || "Untitled Request"
})

const requestMethod = computed<string>(() => {
  return props.request.method
})

/**
 * Returns the appropriate CSS class for styling the request method badge
 * @param method The HTTP method
 * @returns CSS class string for the method badge
 */
function getMethodClass(method: string): string {
  const methodLower: string = method?.toLowerCase() || ""

  switch (methodLower) {
    case "get":
      return "bg-green-500/10 text-green-500"
    case "post":
      return "bg-blue-500/10 text-blue-500"
    case "put":
      return "bg-orange-500/10 text-orange-500"
    case "delete":
      return "bg-red-500/10 text-red-500"
    case "patch":
      return "bg-teal-500/10 text-teal-500"
    default:
      return "bg-gray-500/10 text-secondaryLight"
  }
}
</script>
