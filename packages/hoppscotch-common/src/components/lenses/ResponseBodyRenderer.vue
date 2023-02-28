<template>
  <HoppSmartTabs
    v-if="response"
    v-model="selectedLensTab"
    styles="sticky overflow-x-auto flex-shrink-0 z-10 bg-primary top-lowerPrimaryStickyFold"
  >
    <HoppSmartTab
      v-for="(lens, index) in validLenses"
      :id="lens.renderer"
      :key="`lens-${index}`"
      :label="t(lens.lensName)"
      class="flex flex-col flex-1 w-full h-full"
    >
      <component :is="lensRendererFor(lens.renderer)" :response="response" />
    </HoppSmartTab>
    <HoppSmartTab
      v-if="maybeHeaders"
      id="headers"
      :label="t('response.headers')"
      :info="`${maybeHeaders.length}`"
      class="flex flex-col flex-1"
    >
      <LensesHeadersRenderer :headers="maybeHeaders" />
    </HoppSmartTab>
    <HoppSmartTab
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
    </HoppSmartTab>
  </HoppSmartTabs>
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
import type { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { restTestResults$ } from "~/newstore/RESTSession"

const props = defineProps<{
  response: HoppRESTResponse | null
  selectedTabPreference: string | null
}>()

const emit = defineEmits<{
  (e: "update:selectedTabPreference", newTab: string): void
}>()

const allLensRenderers = getLensRenderers()

function lensRendererFor(name: string) {
  return allLensRenderers[name]
}

const testResults = useReadonlyStream(restTestResults$, null)

const t = useI18n()

const selectedLensTab = ref("")

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
  (newLenses: Lens[]) => {
    if (newLenses.length === 0) return

    const validRenderers = [
      ...newLenses.map((x) => x.renderer),
      "headers",
      "results",
    ]

    if (
      props.selectedTabPreference &&
      validRenderers.includes(props.selectedTabPreference)
    ) {
      selectedLensTab.value = props.selectedTabPreference
    } else {
      selectedLensTab.value = newLenses[0].renderer
    }
  },
  { immediate: true }
)

watch(selectedLensTab, (newLensID) => {
  emit("update:selectedTabPreference", newLensID)
})
</script>
