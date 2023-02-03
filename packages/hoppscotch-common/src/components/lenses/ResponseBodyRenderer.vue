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
      <component :is="lensRendererFor(lens.renderer)" :response="response" />
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

<script setup lang="ts">
import { computed, ref, watch } from "vue"
import {
  getSuitableLenses,
  getLensRenderers,
  Lens,
} from "~/helpers/lenses/lenses"
import { useReadonlyStream } from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { restTestResults$ } from "~/newstore/RESTSession"
import { setLocalConfig, getLocalConfig } from "~/newstore/localpersistence"

const props = defineProps({
  response: { type: Object, default: () => ({}) },
})

const allLensRenderers = getLensRenderers()

function lensRendererFor(name: string) {
  return allLensRenderers[name]
}

const testResults = useReadonlyStream(restTestResults$, null)

const t = useI18n()

const selectedLensTab = ref("")

const headerLength = computed(() => {
  if (!props.response || !props.response.headers) return 0
  return Object.keys(props.response.headers).length
})

const validLenses = computed(() => {
  if (!props.response) return []
  return getSuitableLenses(props.response)
})

watch(
  validLenses,
  (newValue: Lens[]) => {
    if (newValue.length === 0) return
    const allRenderers = [
      ...newValue.map((x) => x.renderer),
      "headers",
      "results",
    ]
    const savedLensTabPreference =
      getLocalConfig("response_selected_lens_tab") ?? ""
    if (allRenderers.includes(savedLensTabPreference)) {
      selectedLensTab.value = savedLensTabPreference
    } else {
      selectedLensTab.value = newValue[0].renderer
    }
  },
  { immediate: true }
)

watch(selectedLensTab, (newValue) => {
  setLocalConfig("response_selected_lens_tab", newValue)
})
</script>
