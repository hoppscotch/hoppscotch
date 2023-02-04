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
import { computed, watch } from "vue"
import { startPageProgress, completePageProgress } from "@modules/loadingbar"
import { useReadonlyStream } from "@composables/stream"
import { RESTRequest } from "~/helpers/RESTRequest"

const props = defineProps<{
  request: RESTRequest
}>()

const response = useReadonlyStream(props.request.response$, null)

const hasResponse = computed(
  () => response.value?.type === "success" || response.value?.type === "fail"
)

const loading = computed(
  () => response.value === null || response.value.type === "loading"
)

watch(response, () => {
  if (response.value?.type === "loading") startPageProgress()
  else completePageProgress()
})
</script>
