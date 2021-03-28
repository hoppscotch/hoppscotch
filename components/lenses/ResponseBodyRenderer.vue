<template>
  <SmartTabs styles="m-4">
    <SmartTab
      v-for="(lens, index) in validLenses"
      :key="lens.lensName"
      :id="lens.lensName"
      :label="lens.lensName"
      :selected="index === 0"
    >
      <component :is="lens.renderer" :response="response" />
    </SmartTab>
    <SmartTab
      v-if="Object.keys(response.headers).length !== 0"
      id="headers"
      :label="`Headers \xA0 • \xA0 ${Object.keys(response.headers).length}`"
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
    response: {},
  },
  computed: {
    validLenses() {
      return getSuitableLenses(this.response)
    },
  },
}
</script>
