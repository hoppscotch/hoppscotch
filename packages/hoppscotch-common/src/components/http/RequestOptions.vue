<template>
  <HoppSmartTabs
    v-model="selectedRealtimeTab"
    styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-upperMobilePrimaryStickyFold sm:top-upperPrimaryStickyFold z-10"
    render-inactive-tabs
  >
    <HoppSmartTab
      :id="'params'"
      :label="`${t('tab.parameters')}`"
      :info="`${newActiveParamsCount$}`"
    >
      <HttpParameters />
    </HoppSmartTab>
    <HoppSmartTab :id="'bodyParams'" :label="`${t('tab.body')}`">
      <HttpBody @change-tab="changeTab" />
    </HoppSmartTab>
    <HoppSmartTab
      :id="'headers'"
      :label="`${t('tab.headers')}`"
      :info="`${newActiveHeadersCount$}`"
    >
      <HttpHeaders @change-tab="changeTab" />
    </HoppSmartTab>
    <HoppSmartTab :id="'authorization'" :label="`${t('tab.authorization')}`">
      <HttpAuthorization />
    </HoppSmartTab>
    <HoppSmartTab
      :id="'preRequestScript'"
      :label="`${t('tab.pre_request_script')}`"
      :indicator="
        preRequestScript && preRequestScript.length > 0 ? true : false
      "
    >
      <HttpPreRequestScript />
    </HoppSmartTab>
    <HoppSmartTab
      :id="'tests'"
      :label="`${t('tab.tests')}`"
      :indicator="testScript && testScript.length > 0 ? true : false"
    >
      <HttpTests />
    </HoppSmartTab>
  </HoppSmartTabs>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { map } from "rxjs/operators"
import { useReadonlyStream, useStream } from "@composables/stream"
import {
  restActiveHeadersCount$,
  restActiveParamsCount$,
} from "~/newstore/RESTSession"
import { useI18n } from "@composables/i18n"
import { RESTRequest } from "~/helpers/RESTRequest"

export type RequestOptionTabs =
  | "params"
  | "bodyParams"
  | "headers"
  | "authorization"

const t = useI18n()

const props = defineProps<{
  request: RESTRequest
}>()

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

const preRequestScript = useStream(
  props.request.preRequestScript$,
  "",
  props.request.setPreRequestScript.bind(props.request)
)

const testScript = useStream(
  props.request.testScript$,
  "",
  props.request.setTestScript.bind(props.request)
)
</script>
