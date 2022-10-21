<template>
  <div class="flex flex-col flex-1 h-full">
    <HoppSmartTabs
      v-model="selectedOptionTab"
      styles="sticky bg-primary top-upperPrimaryStickyFold z-10"
      :render-inactive-tabs="true"
    >
      <HoppSmartTab
        :id="'query'"
        :label="`${t('tab.query')}`"
        :indicator="gqlQueryString && gqlQueryString.length > 0 ? true : false"
      >
        <GraphqlQuery
          :conn="props.conn"
          :request="request"
          @run-query="runQuery"
          @save-request="saveRequest"
        />
      </SmartTab>
      <SmartTab
        :id="'variables'"
        :label="`${t('tab.variables')}`"
        :indicator="variableString && variableString.length > 0 ? true : false"
      >
        <GraphqlVariable
          :conn="conn"
          :request="request"
          @run-query="runQuery"
          @save-request="saveRequest"
        />
      </SmartTab>
      <SmartTab
        :id="'headers'"
        :label="`${t('tab.headers')}`"
        :info="activeGQLHeadersCount === 0 ? null : `${activeGQLHeadersCount}`"
      >
        <GraphqlHeaders :request="request" />
      </SmartTab>
      <SmartTab :id="'authorization'" :label="`${t('tab.authorization')}`">
        Under construction
        <!-- <GraphqlAuthorization :request="request" /> -->
      </SmartTab>
    </SmartTabs>
    <CollectionsSaveRequest
      mode="graphql"
      :show="showSaveRequestModal"
      @hide-modal="hideRequestModal"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import {
  useReadonlyStream,
  useStream,
  useStreamSubscriber,
} from "@composables/stream"
import { useToast } from "@composables/toast"
import { completePageProgress, startPageProgress } from "@modules/loadingbar"
import * as gql from "graphql"
import { clone } from "lodash-es"
import { computed, onMounted, ref } from "vue"
import { defineActionHandler } from "~/helpers/actions"
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"
import { GQLConnection } from "~/helpers/graphql/GQLConnection"
import { GQLRequest } from "~/helpers/graphql/GQLRequest"
import { getCurrentStrategyID } from "~/helpers/network"
import { GQLCurrentTabId$, setResponseUnseen } from "~/newstore/GQLSession"
type OptionTabs = "query" | "headers" | "variables" | "authorization"
const selectedOptionTab = ref<OptionTabs>("query")
const t = useI18n()
const props = defineProps<{
  conn: GQLConnection
  request: GQLRequest
  tabId: string
}>()
const toast = useToast()
const { subscribeToStream } = useStreamSubscriber()
const url = useReadonlyStream(props.request.url$, "")
const gqlQueryString = useStream(
  props.request.query$,
  "",
  props.request.setGQLQuery
)
const variableString = useStream(
  props.request.variables$,
  "",
  props.request.setGQLVariables
)
// The functional headers list (the headers actually in the system)
const headers = useStream(
  props.request.headers$,
  [],
  props.request.setGQLHeaders
)
const auth = useStream(
  props.request.auth$,
  { authType: "none", authActive: true },
  props.request.setGQLAuth
)
const response = useStream(
  props.request.response$,
  [],
  props.request.setGQLResponse
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
      return props.request.setGQLResponse([])
    }

    try {
      if (event.operationType !== "subscription") {
        props.request.setGQLResponse([event])
      } else {
        props.request.setGQLResponse([...response.value, event])
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
