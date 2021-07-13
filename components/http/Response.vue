<template>
  <AppSection label="response">
    <HttpResponseMeta v-if="!loading" :response="response" />
    <LensesResponseBodyRenderer v-if="!loading" :response="response" />
  </AppSection>
</template>

<script>
import { restResponse$ } from "~/newstore/RESTSession"

export default {
  subscriptions() {
    return {
      response: restResponse$,
    }
  },
  computed: {
    loading() {
      return this.response === null || this.response.type === "loading"
    },
  },
}
</script>
