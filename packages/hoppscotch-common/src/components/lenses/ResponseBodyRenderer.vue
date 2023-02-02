<template>
  <SmartTabs
    v-if="response"
    v-model="selectedLensTab"
    styles="sticky overflow-x-auto flex-shrink-0 z-10 bg-primary top-lowerPrimaryStickyFold"
  >
    <SmartTab
      v-for="(lens, index) in validLenses"
      :id="lens.renderer"
      :key="`lens-${index}`"
      :label="t(lens.lensName)"
      class="flex flex-col flex-1 w-full h-full"
    >
      <component :is="lens.renderer" :response="response" />
    </SmartTab>
    <SmartTab
      v-if="headerLength"
      id="headers"
      :label="t('response.headers')"
      :info="`${headerLength}`"
      class="flex flex-col flex-1"
    >
      <LensesHeadersRenderer :headers="response.headers" />
    </SmartTab>
    <SmartTab
      id="results"
      :label="t('test.results')"
      :indicator="
        testResults &&
        (testResults.expectResults.length ||
          testResults.tests.length ||
          testResults.envDiff.selected.additions.length ||
          testResults.envDiff.selected.updations.length ||
          testResults.envDiff.global.updations.length)
          ? true
          : false
      "
      class="flex flex-col flex-1"
    >
      <HttpTestResult />
    </SmartTab>
  </SmartTabs>
</template>

<script lang="ts">
import { defineComponent } from "vue"
import {
  getSuitableLenses,
  getLensRenderers,
  Lens,
} from "~/helpers/lenses/lenses"
import { useReadonlyStream } from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { restTestResults$ } from "~/newstore/RESTSession"

export default defineComponent({
  components: {
    ...getLensRenderers(),
  },
  props: {
    response: { type: Object, default: () => ({}) },
    savedSelectedLensTab: { type: String },
  },
  setup() {
    const testResults = useReadonlyStream(restTestResults$, null)

    return {
      testResults,
      t: useI18n(),
    }
  },
  data() {
    return {
      selectedLensTab: "",
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
  watch: {
    validLenses: {
      handler(newValue: Lens[]) {
        if (newValue.length === 0) return
        const allRenderers = [
          ...newValue.map((x) => x.renderer),
          "headers",
          "results",
        ]
        if (
          this.savedSelectedLensTab &&
          allRenderers.includes(this.savedSelectedLensTab)
        ) {
          this.selectedLensTab = this.savedSelectedLensTab
        } else {
          this.selectedLensTab = newValue[0].renderer
        }
      },
      immediate: true,
    },
    selectedLensTab: {
      handler(newValue) {
        this.$emit("changeSelectedLensTabPersistedOption", newValue)
      },
    },
  },
})
</script>
