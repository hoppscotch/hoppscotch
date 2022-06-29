<template>
  <SmartTabs
    v-model="selectedRealtimeTab"
    styles="sticky bg-primary top-upperMobilePrimaryStickyFold sm:top-upperPrimaryStickyFold z-10"
    render-inactive-tabs
  >
    <SmartTab
      :id="'params'"
      :label="`${$t('tab.parameters')}`"
      :info="`${newActiveParamsCount$}`"
    >
      <HttpParameters />
    </SmartTab>
    <SmartTab :id="'bodyParams'" :label="`${$t('tab.body')}`">
      <HttpBody @change-tab="changeTab" />
    </SmartTab>
    <SmartTab
      :id="'headers'"
      :label="`${$t('tab.headers')}`"
      :info="`${newActiveHeadersCount$}`"
    >
      <HttpHeaders @change-tab="changeTab" />
    </SmartTab>
    <SmartTab :id="'authorization'" :label="`${$t('tab.authorization')}`">
      <HttpAuthorization />
    </SmartTab>
    <SmartTab
      :id="'preRequestScript'"
      :label="`${$t('tab.pre_request_script')}`"
      :indicator="
        preRequestScript && preRequestScript.length > 0 ? true : false
      "
    >
      <HttpPreRequestScript />
    </SmartTab>
    <SmartTab
      :id="'tests'"
      :label="`${$t('tab.tests')}`"
      :indicator="testScript && testScript.length > 0 ? true : false"
    >
      <HttpTests />
    </SmartTab>
  </SmartTabs>
</template>

<script setup lang="ts">
import { ref } from "@nuxtjs/composition-api"
import { map } from "rxjs/operators"
import { useReadonlyStream } from "~/helpers/utils/composables"
import {
  restActiveHeadersCount$,
  restActiveParamsCount$,
  usePreRequestScript,
  useTestScript,
} from "~/newstore/RESTSession"

export type RequestOptionTabs =
  | "params"
  | "bodyParams"
  | "headers"
  | "authorization"

const selectedRealtimeTab = ref<RequestOptionTabs>("params")

const changeTab = (e: RequestOptionTabs) => {
  selectedRealtimeTab.value = e
}

const newActiveParamsCount$ = useReadonlyStream(
  restActiveParamsCount$.pipe(
    map((e) => {
      if (e === 0) return null
      return `${e}`
    })
  ),
  null
)

const newActiveHeadersCount$ = useReadonlyStream(
  restActiveHeadersCount$.pipe(
    map((e) => {
      if (e === 0) return null
      return `${e}`
    })
  ),
  null
)

const preRequestScript = usePreRequestScript()

const testScript = useTestScript()
</script>
