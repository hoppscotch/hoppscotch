<template>
  <AppSection label="response">
    <HttpResponseMeta :response="response" />
    <LensesResponseBodyRenderer
      v-if="!loading && hasResponse"
      :response="response"
    />
  </AppSection>
</template>

<script lang="ts">
import { computed, defineComponent } from "@nuxtjs/composition-api"
import { useReadonlyStream } from "~/helpers/utils/composables"
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

    return {
      hasResponse,
      response,
      loading,
    }
  },
})
</script>
