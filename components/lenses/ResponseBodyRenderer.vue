<template>
  <SmartTabs styles="m-4">
    <SmartTab
      v-for="(lens, index) in validLenses"
      :id="lens.lensName"
      :key="lens.lensName"
      :label="lens.lensName"
      :selected="index === 0"
    >
      <component :is="lens.renderer" :response="response" />
    </SmartTab>
    <SmartTab
      v-if="headerLength"
      id="headers"
      :label="`Headers \xA0 • \xA0 ${headerLength}`"
    >
      <LensesHeadersRenderer :headers="response.headers" />
    </SmartTab>
  </SmartTabs>
</template>

<script>
import { getSuitableLenses, getLensRenderers } from "~/helpers/lenses/lenses"

export default {
  components: {
    // Lens Renderers
    ...getLensRenderers(),
  },
  props: {
    response: { type: Object, default: () => {} },
  },
  computed: {
    headerLength() {
      if (!this.response || !this.response.headers) return 0

      return Object.keys(this.response.headers).length
    },
    validLenses() {
      if (!this.response) return []

      return getSuitableLenses(this.response)
    },
  },
}
</script>
