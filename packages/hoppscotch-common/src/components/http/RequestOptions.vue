<template>
  <HoppSmartTabs
    v-model="selectedOptionTab"
    styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-upperMobilePrimaryStickyFold sm:top-upperPrimaryStickyFold z-10"
    render-inactive-tabs
  >
    <HoppSmartTab
      v-if="properties?.includes('params') ?? true"
      :id="'params'"
      :label="`${t('tab.parameters')}`"
      :info="`${newActiveParamsCount}`"
    >
      <HttpParameters v-model="request.params" :envs="envs" />
    </HoppSmartTab>
    <HoppSmartTab
      v-if="properties?.includes('bodyParams') ?? true"
      :id="'bodyParams'"
      :label="`${t('tab.body')}`"
      :indicator="isBodyFilled"
    >
      <HttpBody
        v-model:headers="request.headers"
        v-model:body="request.body"
        :envs="envs"
        @change-tab="changeOptionTab"
      />
    </HoppSmartTab>
    <HoppSmartTab
      v-if="properties?.includes('headers') ?? true"
      :id="'headers'"
      :label="`${t('tab.headers')}`"
      :info="`${newActiveHeadersCount}`"
    >
      <HttpHeaders
        v-model="request"
        :inherited-properties="inheritedProperties"
        :envs="envs"
        @change-tab="changeOptionTab"
      />
    </HoppSmartTab>
    <HoppSmartTab
      v-if="properties?.includes('authorization') ?? true"
      :id="'authorization'"
      :label="`${t('tab.authorization')}`"
    >
      <HttpAuthorization
        v-model="request.auth"
        :inherited-properties="inheritedProperties"
        :envs="envs"
      />
    </HoppSmartTab>
    <HoppSmartTab
      v-if="showPreRequestScriptTab"
      :id="'preRequestScript'"
      :label="`${t('tab.pre_request_script')}`"
      :indicator="
        'preRequestScript' in request &&
        request.preRequestScript &&
        request.preRequestScript.length > 0
          ? true
          : false
      "
    >
      <HttpPreRequestScript
        v-if="'preRequestScript' in request"
        v-model="request.preRequestScript"
        :is-active="selectedOptionTab === 'preRequestScript'"
      />
    </HoppSmartTab>
    <HoppSmartTab
      v-if="showTestsTab"
      :id="'tests'"
      :label="`${t('tab.post_request_script')}`"
      :indicator="
        'testScript' in request &&
        request.testScript &&
        request.testScript.length > 0
          ? true
          : false
      "
    >
      <HttpTests
        v-if="'testScript' in request"
        v-model="request.testScript"
        :is-active="selectedOptionTab === 'tests'"
      />
    </HoppSmartTab>
    <HoppSmartTab
      v-if="properties?.includes('requestVariables') ?? true"
      :id="'requestVariables'"
      :label="`${t('tab.variables')}`"
      :info="`${newActiveRequestVariablesCount}`"
      :align-last="true"
    >
      <HttpRequestVariables v-model="request.requestVariables" />
    </HoppSmartTab>
  </HoppSmartTabs>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import {
  HoppRESTRequest,
  HoppRESTResponseOriginalRequest,
} from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import * as monaco from "monaco-editor"
import { computed, onUnmounted, watch } from "vue"

import { defineActionHandler } from "~/helpers/actions"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import { AggregateEnvironment } from "~/newstore/environments"

import postRequestPWModDefn from "~/types/post-request.d.ts?raw"
import preRequestPWModDefn from "~/types/pre-request.d.ts?raw"

const VALID_OPTION_TABS = [
  "params",
  "bodyParams",
  "headers",
  "authorization",
  "preRequestScript",
  "tests",
  "requestVariables",
] as const

export type RESTOptionTabs = (typeof VALID_OPTION_TABS)[number]

const t = useI18n()

// v-model integration with props and emit
const props = withDefaults(
  defineProps<{
    modelValue: HoppRESTRequest | HoppRESTResponseOriginalRequest
    optionTab: RESTOptionTabs
    properties?: string[]
    inheritedProperties?: HoppInheritedProperty
    envs?: AggregateEnvironment[]
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

let extraLibRef: monaco.IDisposable | null = null

const libDefs = {
  "pre-request": preRequestPWModDefn,
  "post-request": postRequestPWModDefn,
}

const scriptEditorTabs = ["preRequestScript", "tests"]

onUnmounted(() => extraLibRef?.dispose())

watch(
  () => selectedOptionTab.value,
  (newTab) => {
    if (!scriptEditorTabs.includes(newTab)) {
      return
    }

    extraLibRef?.dispose()

    monaco.languages.typescript.typescriptDefaults.setExtraLibs([])

    extraLibRef = monaco.languages.typescript.typescriptDefaults.addExtraLib(
      libDefs[newTab === "preRequestScript" ? "pre-request" : "post-request"],
      `inmemory://lib/pw-${newTab}.d.ts`
    )
  },
  { immediate: true }
)

const showPreRequestScriptTab = computed(() => {
  return (
    props.properties?.includes("preRequestScript") ??
    "preRequestScript" in request.value
  )
})

const showTestsTab = computed(() => {
  return props.properties?.includes("tests") ?? "testScript" in request.value
})

const changeOptionTab = (e: RESTOptionTabs) => {
  selectedOptionTab.value = e
}

const newActiveParamsCount = computed(() => {
  const count = request.value.params.filter(
    (x) => x.active && (x.key || x.value)
  ).length

  return count ? count : null
})

const newActiveHeadersCount = computed(() => {
  const count = request.value.headers.filter(
    (x) => x.active && (x.key || x.value)
  ).length

  return count ? count : null
})

const newActiveRequestVariablesCount = computed(() => {
  const count = request.value.requestVariables.filter(
    (x) => x.active && (x.key || x.value)
  ).length
  return count ? count : null
})

const isBodyFilled = computed(() => {
  return Boolean(request.value.body.body && request.value.body.body.length > 0)
})

defineActionHandler("request.open-tab", ({ tab }) => {
  selectedOptionTab.value = tab as RESTOptionTabs
})
</script>
