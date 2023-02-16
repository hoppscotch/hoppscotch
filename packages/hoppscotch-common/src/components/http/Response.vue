<template>
  <div class="flex flex-col flex-1">
    <HttpResponseMeta :response="response!" />
    <LensesResponseBodyRenderer
      v-if="!loading && hasResponse"
      v-model:selected-tab-preference="selectedTabPreference"
      :response="response"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { startPageProgress, completePageProgress } from "@modules/loadingbar"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"

const props = defineProps<{
  response: HoppRESTResponse | null
}>()

const selectedTabPreference = ref<string | null>(null)

const hasResponse = computed(
  () => props.response?.type === "success" || props.response?.type === "fail"
)

const loading = computed(
  () => props.response === null || props.response.type === "loading"
)

watch(props, () => {
  if (props.response?.type === "loading") startPageProgress()
  else completePageProgress()
})
</script>
