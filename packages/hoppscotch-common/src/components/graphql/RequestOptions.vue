<template>
  <div class="flex flex-col flex-1 h-full">
    <HoppSmartTabs
      v-model="selectedOptionTab"
      styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-upperPrimaryStickyFold z-10"
      render-inactive-tabs
    >
      <HoppSmartTab
        :id="'query'"
        :label="`${t('tab.query')}`"
        :indicator="gqlQueryString && gqlQueryString.length > 0 ? true : false"
      >
        <GraphqlQuery
          :conn="props.conn"
          @run-query="runQuery"
          @save-request="saveRequest"
        />
      </SmartTab>
      <SmartTab
        :id="'variables'"
        :label="`${t('tab.variables')}`"
        :indicator="variableString && variableString.length > 0 ? true : false"
      >
        <GraphqlVariable :conn="conn" />
      </SmartTab>
      <SmartTab
        :id="'headers'"
        :label="`${t('tab.headers')}`"
        :info="activeGQLHeadersCount === 0 ? null : `${activeGQLHeadersCount}`"
      >
        <GraphqlHeaders />
      </SmartTab>
      <SmartTab :id="'authorization'" :label="`${t('tab.authorization')}`">
        <GraphqlAuthorization />
      </HoppSmartTab>
    </HoppSmartTabs>
    <CollectionsSaveRequest
      mode="graphql"
      :show="showSaveRequestModal"
      @hide-modal="hideRequestModal"
    />
  </div>
</template>

<script setup lang="ts">
import { Ref, computed, ref, onMounted } from "vue"
import * as gql from "graphql"
import { GQLHeader } from "@hoppscotch/data"
import { clone } from "lodash-es"
import {
  useReadonlyStream,
  useStream,
  useStreamSubscriber,
} from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { startPageProgress, completePageProgress } from "@modules/loadingbar"
import {
  getGQLResponse,
  gqlAuth$,
  GQLCurrentTabId$,
  gqlHeaders$,
  gqlQuery$,
  gqlURL$,
  gqlVariables$,
  setGQLAuth,
  setGQLHeaders,
  setGQLQuery,
  setGQLResponse,
  setGQLVariables,
  setResponseUnseen,
} from "~/newstore/GQLSession"
import { GQLConnection } from "~/helpers/GQLConnection"
import { makeGQLHistoryEntry, addGraphqlHistoryEntry } from "~/newstore/history"
import { platform } from "~/platform"
import { getCurrentStrategyID } from "~/helpers/network"
import { defineActionHandler } from "~/helpers/actions"
type OptionTabs = "query" | "headers" | "variables" | "authorization"
const selectedOptionTab = ref<OptionTabs>("query")
const t = useI18n()
const props = defineProps<{
  conn: GQLConnection
  tabId: string
}>()
const toast = useToast()
const { subscribeToStream } = useStreamSubscriber()
const url = useReadonlyStream(gqlURL$, "")
const gqlQueryString = useStream(gqlQuery$, "", setGQLQuery)
const variableString = useStream(gqlVariables$, "", setGQLVariables)
// The functional headers list (the headers actually in the system)
const headers = useStream(gqlHeaders$, [], setGQLHeaders) as Ref<GQLHeader[]>
const auth = useStream(
  gqlAuth$,
  { authType: "none", authActive: true },
  setGQLAuth
)
const currentTabId = useReadonlyStream(GQLCurrentTabId$, "")
const activeGQLHeadersCount = computed(
  () =>
    headers.value.filter((x) => x.active && (x.key !== "" || x.value !== ""))
      .length
)
const showSaveRequestModal = ref(false)
const runQuery = async (
  definition: gql.OperationDefinitionNode | null = null
) => {
  const startTime = Date.now()
  startPageProgress()
  try {
    const runURL = clone(url.value)
    const runHeaders = clone(headers.value)
    const runQuery = clone(gqlQueryString.value)
    const runVariables = clone(variableString.value)
    const runAuth = clone(auth.value)

    await props.conn.runQuery({
      url: runURL,
      headers: runHeaders,
      query: runQuery,
      variables: runVariables,
      auth: runAuth,
      operationName: definition?.name?.value,
      operationType: definition?.operation ?? "query",
    })
    const duration = Date.now() - startTime
    completePageProgress()
    toast.success(`${t("state.finished_in", { duration })}`)
  } catch (e: any) {
    console.log(e)
    // response.value = [`${e}`]
    completePageProgress()
    toast.error(
      `${t("error.something_went_wrong")}. ${t("error.check_console_details")}`,
      {}
    )
    console.error(e)
  }

  platform.analytics?.logEvent({
    type: "HOPP_REQUEST_RUN",
    platform: "graphql-query",
    strategy: getCurrentStrategyID(),
  })
}
onMounted(() => {
  subscribeToStream(props.conn.event$, (event) => {
    if (event === "reset") {
      return setGQLResponse(props.tabId, [])
    }

    try {
      if (event.operationType !== "subscription") {
        setGQLResponse(props.tabId, [event])
      } else {
        setGQLResponse(props.tabId, [...getGQLResponse(props.tabId), event])
        if (currentTabId.value !== props.tabId) {
          setResponseUnseen(props.tabId, false)
        }
      }
    } catch (error) {
      console.log(error)
    }
  })
})
const hideRequestModal = () => {
  showSaveRequestModal.value = false
}
const saveRequest = () => {
  showSaveRequestModal.value = true
}
const clearGQLQuery = () => {
  gqlQueryString.value = ""
}
defineActionHandler("request.send-cancel", runQuery)
defineActionHandler("request.save", saveRequest)
defineActionHandler("request.reset", clearGQLQuery)
</script>
