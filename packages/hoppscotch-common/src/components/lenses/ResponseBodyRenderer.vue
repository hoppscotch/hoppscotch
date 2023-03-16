<template>
  <HoppSmartTabs
    v-if="tab.response"
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
      <component
        :is="lensRendererFor(lens.renderer)"
        :response="tab.response"
      />
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
        tab.testResults &&
        (tab.testResults.expectResults.length ||
          tab.testResults.tests.length ||
          tab.testResults.envDiff.selected.additions.length ||
          tab.testResults.envDiff.selected.updations.length ||
          tab.testResults.envDiff.global.updations.length)
          ? true
          : false
      "
      class="flex flex-col flex-1"
    >
      <HttpTestResult v-model="tab.testResults" />
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
import { useI18n } from "@composables/i18n"
import { useVModel } from "@vueuse/core"
import { HoppRESTTab } from "~/helpers/rest/tab"

const props = defineProps<{
  tab: HoppRESTTab
  selectedTabPreference: string | null
}>()

const emit = defineEmits<{
  (e: "update:tab", val: HoppRESTTab): void
  (e: "update:selectedTabPreference", newTab: string): void
}>()

const tab = useVModel(props, "tab", emit)
const selectedTabPreference = useVModel(props, "selectedTabPreference", emit)

const allLensRenderers = getLensRenderers()

function lensRendererFor(name: string) {
  return allLensRenderers[name]
}

const t = useI18n()

const selectedLensTab = ref("")

const maybeHeaders = computed(() => {
  if (
    !tab.value.response ||
    !(
      tab.value.response.type === "success" ||
      tab.value.response.type === "fail"
    )
  )
    return null
  return tab.value.response.headers
})

const validLenses = computed(() => {
  if (!tab.value.response) return []
  return getSuitableLenses(tab.value.response)
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
      selectedTabPreference.value &&
      validRenderers.includes(selectedTabPreference.value)
    ) {
      selectedLensTab.value = selectedTabPreference.value
    } else {
      selectedLensTab.value = newLenses[0].renderer
    }
  },
  { immediate: true }
)

watch(selectedLensTab, (newLensID) => {
  selectedTabPreference.value = newLensID
})
</script>
