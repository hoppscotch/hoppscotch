<template>
  <SmartTabs styles="sticky z-10 bg-primary top-lowerPrimaryStickyFold">
    <SmartTab
      v-for="(lens, index) in validLenses"
      :id="lens.renderer"
      :key="`lens-${index}`"
      :label="$t(lens.lensName)"
      :selected="index === 0"
      class="flex flex-col flex-1 w-full h-full"
    >
      <component :is="lens.renderer" :response="response" />
    </SmartTab>
    <SmartTab
      v-if="headerLength"
      id="headers"
      :label="$t('response.headers')"
      :info="`${headerLength}`"
      class="flex flex-col flex-1"
    >
      <LensesHeadersRenderer :headers="response.headers" />
    </SmartTab>
    <SmartTab
      id="results"
      :label="$t('test.results')"
      :indicator="
        testResults &&
        (testResults.expectResults.length || testResults.tests.length)
          ? true
          : false
      "
      class="flex flex-col flex-1"
    >
      <HttpTestResult />
    </SmartTab>
  </SmartTabs>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import { getSuitableLenses, getLensRenderers } from "~/helpers/lenses/lenses"
import { useReadonlyStream } from "~/helpers/utils/composables"
import { restTestResults$ } from "~/newstore/RESTSession"

export default defineComponent({
  components: {
    // Lens Renderers
    ...getLensRenderers(),
  },
  props: {
    response: { type: Object, default: () => {} },
  },
  setup() {
    const testResults = useReadonlyStream(restTestResults$, null)
    return {
      testResults,
    }
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
})
</script>
