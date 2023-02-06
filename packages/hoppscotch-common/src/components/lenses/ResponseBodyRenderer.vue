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
      v-if="maybeHeaders"
      id="headers"
      :label="t('response.headers')"
      :info="`${maybeHeaders.length}`"
      class="flex flex-col flex-1"
    >
      <LensesHeadersRenderer :headers="maybeHeaders" />
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
import { computed, PropType, ref, watch } from "vue"
import {
  getSuitableLenses,
  getLensRenderers,
  Lens,
} from "~/helpers/lenses/lenses"
import { useReadonlyStream } from "@composables/stream"
import { useI18n } from "@composables/i18n"
import type { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { restTestResults$ } from "~/newstore/RESTSession"
import { setLocalConfig, getLocalConfig } from "~/newstore/localpersistence"

const props = defineProps({
  response: { type: Object as PropType<HoppRESTResponse> | null },
})

const allLensRenderers = getLensRenderers()

function lensRendererFor(name: string) {
  return allLensRenderers[name]
}

const testResults = useReadonlyStream(restTestResults$, null)

const t = useI18n()

const selectedLensTab = ref("")

// This is `HoppRESTResponseHeaderKV[] | null`, so tsc can correctly infer a `maybeHeaders` in `v-if="maybeHeaders"` block is not null array of headers
const maybeHeaders = computed(() => {
  if (
    !props.response ||
    !(props.response.type === "success" || props.response.type === "fail")
  )
    return null
  return props.response.headers
})

const validLenses = computed(() => {
  if (!props.response) return []
  return getSuitableLenses(props.response)
})

watch(
  validLenses,
  (newValue: Lens[]) => {
    if (newValue.length === 0) return
    const validRenderers = [
      ...newValue.map((x) => x.renderer),
      "headers",
      "results",
    ]
    const savedLensTabPreference = getLocalConfig("response_selected_lens_tab")
    if (
      savedLensTabPreference &&
      validRenderers.includes(savedLensTabPreference)
    ) {
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
