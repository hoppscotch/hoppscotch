<template>
  <div class="flex flex-col flex-1">
    <HttpResponseMeta :response="response" />
    <LensesResponseBodyRenderer
      v-if="!loading && hasResponse"
      :response="response!"
      :saved-selected-lens-tab="savedSelectedLensTab"
      @changeSelectedLensTabPersistedOption="
        (tab) => (savedSelectedLensTab = tab)
      "
    />
  </div>
</template>

<script setup lang="ts">
import { computed, watch, ref } from "vue"
import { startPageProgress, completePageProgress } from "@modules/loadingbar"
import { useReadonlyStream } from "@composables/stream"
import { restResponse$ } from "~/newstore/RESTSession"

const response = useReadonlyStream(restResponse$, null)

const savedSelectedLensTab = ref<string | undefined>()

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
