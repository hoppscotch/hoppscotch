<template>
  <HoppSmartTabs
    v-if="doc.response"
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
        :response="doc.response"
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
      :indicator="showIndicator"
      class="flex flex-col flex-1"
    >
      <HttpTestResult v-model="doc.testResults" />
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
import { HoppRESTDocument } from "~/helpers/rest/document"

const props = defineProps<{
  document: HoppRESTDocument
}>()

const emit = defineEmits<{
  (e: "update:document", document: HoppRESTDocument): void
}>()

const doc = useVModel(props, "document", emit)

const showIndicator = computed(() => {
  if (!doc.value.testResults) return false

  const { expectResults, tests, envDiff } = doc.value.testResults
  return Boolean(
    expectResults.length ||
      tests.length ||
      envDiff.selected.additions.length ||
      envDiff.selected.updations.length ||
      envDiff.global.updations.length
  )
})

const allLensRenderers = getLensRenderers()

function lensRendererFor(name: string) {
  return allLensRenderers[name]
}

const t = useI18n()

const selectedLensTab = ref("")

const maybeHeaders = computed(() => {
  if (
    !doc.value.response ||
    !(
      doc.value.response.type === "success" ||
      doc.value.response.type === "fail"
    )
  )
    return null
  return doc.value.response.headers
})

const validLenses = computed(() => {
  if (!doc.value.response) return []
  return getSuitableLenses(doc.value.response)
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

    const { responseTabPreference } = doc.value

    if (
      responseTabPreference &&
      validRenderers.includes(responseTabPreference)
    ) {
      selectedLensTab.value = responseTabPreference
    } else {
      selectedLensTab.value = newLenses[0].renderer
    }
  },
  { immediate: true }
)

watch(selectedLensTab, (newLensID) => {
  doc.value.responseTabPreference = newLensID
})
</script>
