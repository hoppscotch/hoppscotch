<template>
  <SmartTabs styles="sticky z-10 top-13">
    <SmartTab
      v-for="(lens, index) in validLenses"
      :id="lens.lensName"
      :key="`lens-${index}`"
      :label="lens.lensName"
      :selected="index === 0"
    >
      <component :is="lens.renderer" :response="response" />
    </SmartTab>
    <SmartTab
      v-if="Object.keys(response.headers).length !== 0"
      id="headers"
      :label="$t('Headers')"
      :info="Object.keys(response.headers).length.toString()"
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
    validLenses() {
      return getSuitableLenses(this.response)
    },
  },
}
</script>
