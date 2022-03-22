<template>
  <SmartTabs
    :selected-tab="selectedTab"
    styles="sticky bg-primary top-upperPrimaryStickyFold z-10"
  >
    <SmartTab
      :id="'params'"
      :label="`${$t('tab.parameters')}`"
      :info="`${newActiveParamsCount$}`"
    >
      <HttpParameters />
    </SmartTab>
    <SmartTab :id="'bodyParams'" :label="`${$t('tab.body')}`">
      <HttpBody @changeTab="changeTab" />
    </SmartTab>
    <SmartTab
      :id="'headers'"
      :label="`${$t('tab.headers')}`"
      :info="`${newActiveHeadersCount$}`"
    >
      <HttpHeaders :header-key="headerKey" />
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
import { ref } from "@vue/composition-api"
import { map } from "rxjs/operators"
import { useReadonlyStream } from "~/helpers/utils/composables"
import {
  restActiveHeadersCount$,
  restActiveParamsCount$,
  usePreRequestScript,
  useTestScript,
} from "~/newstore/RESTSession"

const selectedTab = ref<string>(`params`)
const headerKey = ref<string>("")

const changeTab = (e: string) => {
  selectedTab.value = e
  headerKey.value = "Content-Type"
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
