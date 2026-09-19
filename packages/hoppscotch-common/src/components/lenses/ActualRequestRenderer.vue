<template>
  <div class="flex flex-1 flex-col overflow-y-auto">
    <!-- Request Method and URL -->
    <div class="flex items-center border-b border-dividerLight p-4">
      <span
        class="font-semibold"
        :style="{ color: getMethodLabelColorClassOf(response.req.method) }"
      >
        {{ response.req.method }}
      </span>
      <span class="ml-4 truncate text-secondaryDark font-mono text-tiny">
        {{ response.req.effectiveFinalURL }}
      </span>
    </div>

    <!-- Headers -->
    <div class="flex flex-col border-b border-dividerLight pb-4">
      <h3 class="px-4 pt-4 font-semibold text-secondaryLight">
        {{ t("response.request_headers") }}
      </h3>
      <div v-if="headers.length > 0" class="mt-2">
        <div
          v-for="(header, index) in headers"
          :key="index"
          class="flex px-4 py-1 font-mono text-tiny"
        >
          <span class="w-1/3 truncate text-secondary">
            {{ header.key }}
          </span>
          <span class="w-2/3 break-words">
            {{ header.value }}
          </span>
        </div>
      </div>
      <div v-else class="px-4 pt-2 text-secondaryLight">
        {{ t("state.nothing_found") }}
      </div>
    </div>

    <!-- Body -->
    <div class="flex flex-col pb-4">
      <h3 class="px-4 pt-4 font-semibold text-secondaryLight">
        {{ t("response.body") }}
      </h3>
      <div v-if="hasBody" class="mt-2 px-4">
        <div class="rounded border border-dividerLight bg-primaryLight p-4 font-mono text-tiny">
          <pre class="whitespace-pre-wrap break-words text-secondary">{{ bodyString }}</pre>
        </div>
      </div>
      <div v-else class="px-4 pt-2 text-secondaryLight">
        {{ t("state.nothing_found") }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useI18n } from "@composables/i18n"
import { getMethodLabelColorClassOf } from "~/helpers/rest/labelColoring"
import type { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import type { EffectiveHoppRESTRequest } from "~/helpers/utils/EffectiveURL"

const t = useI18n()

const props = defineProps<{
  response: HoppRESTResponse
}>()

const req = computed(() => props.response.req as EffectiveHoppRESTRequest)

const headers = computed(() => {
  return req.value.effectiveFinalHeaders?.filter((h) => h.active && h.key) || []
})

const hasBody = computed(() => !!req.value.effectiveFinalBody)

const bodyString = computed(() => {
  const body = req.value.effectiveFinalBody
  if (!body) return ""
  if (typeof body === "string") return body
  if (body instanceof FormData) {
    const entries = []
    for (const [key, value] of body.entries()) {
      entries.push(`${key}: ${value instanceof File ? "[File]" : value}`)
    }
    return entries.join("\n")
  }
  return "[Blob or File]"
})
</script>
