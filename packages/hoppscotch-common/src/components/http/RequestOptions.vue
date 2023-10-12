<template>
  <HoppSmartTabs
    v-model="selectedOptionTab"
    styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-upperMobilePrimaryStickyFold sm:top-upperPrimaryStickyFold z-10"
    render-inactive-tabs
  >
    <HoppSmartTab
      :id="'params'"
      :label="`${t('tab.parameters')}`"
      :info="`${newActiveParamsCount$}`"
    >
      <HttpParameters v-model="request.params" />
    </HoppSmartTab>
    <HoppSmartTab :id="'bodyParams'" :label="`${t('tab.body')}`">
      <HttpBody
        v-model:headers="request.headers"
        v-model:body="request.body"
        @change-tab="changeOptionTab"
      />
    </HoppSmartTab>
    <HoppSmartTab
      :id="'headers'"
      :label="`${t('tab.headers')}`"
      :info="`${newActiveHeadersCount$}`"
    >
      <HttpHeaders v-model="request" @change-tab="changeOptionTab" />
    </HoppSmartTab>
    <HoppSmartTab :id="'authorization'" :label="`${t('tab.authorization')}`">
      <HttpAuthorization v-model="request.auth" />
    </HoppSmartTab>
    <HoppSmartTab
      :id="'preRequestScript'"
      :label="`${t('tab.pre_request_script')}`"
      :indicator="
        request.preRequestScript && request.preRequestScript.length > 0
          ? true
          : false
      "
    >
      <HttpPreRequestScript v-model="request.preRequestScript" />
    </HoppSmartTab>
    <HoppSmartTab
      :id="'tests'"
      :label="`${t('tab.tests')}`"
      :indicator="
        request.testScript && request.testScript.length > 0 ? true : false
      "
    >
      <HttpTests v-model="request.testScript" />
    </HoppSmartTab>
  </HoppSmartTabs>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { HoppRESTRequest } from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import { computed } from "vue"
import { defineActionHandler } from "~/helpers/actions"

const VALID_OPTION_TABS = [
  "params",
  "bodyParams",
  "headers",
  "authorization",
  "preRequestScript",
  "tests",
] as const

export type RESTOptionTabs = (typeof VALID_OPTION_TABS)[number]

const t = useI18n()

// v-model integration with props and emit
const props = withDefaults(
  defineProps<{
    modelValue: HoppRESTRequest
    optionTab: RESTOptionTabs
  }>(),
  {
    optionTab: "params",
  }
)

const emit = defineEmits<{
  (e: "update:modelValue", value: HoppRESTRequest): void
  (e: "update:optionTab", value: RESTOptionTabs): void
}>()

const request = useVModel(props, "modelValue", emit)
const selectedOptionTab = useVModel(props, "optionTab", emit)

const changeOptionTab = (e: RESTOptionTabs) => {
  selectedOptionTab.value = e
}

const newActiveParamsCount$ = computed(() => {
  const e = request.value.params.filter(
    (x) => x.active && (x.key !== "" || x.value !== "")
  ).length

  if (e === 0) return null
  return `${e}`
})

const newActiveHeadersCount$ = computed(() => {
  const e = request.value.headers.filter(
    (x) => x.active && (x.key !== "" || x.value !== "")
  ).length

  if (e === 0) return null
  return `${e}`
})

defineActionHandler("request.open-tab", ({ tab }) => {
  selectedOptionTab.value = tab as RESTOptionTabs
})
</script>
