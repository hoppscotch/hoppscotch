<template>
  <div class="flex flex-col flex-1">
    <HttpResponseMeta :response="response" />
    <LensesResponseBodyRenderer
      v-if="!loading && hasResponse"
      :response="response"
    />
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, watch } from "@nuxtjs/composition-api"
import { useNuxt, useReadonlyStream } from "~/helpers/utils/composables"
import { restResponse$ } from "~/newstore/RESTSession"

export default defineComponent({
  setup() {
    const response = useReadonlyStream(restResponse$, null)

    const hasResponse = computed(
      () =>
        response.value?.type === "success" || response.value?.type === "fail"
    )

    const loading = computed(
      () => response.value === null || response.value.type === "loading"
    )

    const nuxt = useNuxt()

    watch(response, () => {
      if (response.value?.type === "loading") nuxt.value.$loading.start()
      else nuxt.value.$loading.finish()
    })

    return {
      hasResponse,
      response,
      loading,
    }
  },
})
</script>
