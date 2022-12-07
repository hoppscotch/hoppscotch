<template>
  <div class="flex flex-col flex-1 h-full">
    <HoppSmartTabs
      v-model="selectedOptionTab"
      styles="sticky bg-primary z-10"
      :render-inactive-tabs="true"
    >
      <HoppSmartTab
        :id="'query'"
        :label="`${t('tab.query')}`"
        :indicator="gqlQueryString && gqlQueryString.length > 0 ? true : false"
      >
        <GraphqlQuery
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
        <GraphqlAuthorization :request="request" />
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
import { GQLRequest } from "~/helpers/graphql/GQLRequest"
import { getCurrentStrategyID } from "~/helpers/network"
import {
  GQLCurrentTabId$,
  setResponseUnseen,
  GQLConnection$,
  setGQLConnection,
} from "~/newstore/GQLSession"
import { GQLConnection } from "~/helpers/graphql/GQLConnection"

type OptionTabs = "query" | "headers" | "variables" | "authorization"
const selectedOptionTab = ref<OptionTabs>("query")

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  request: GQLRequest
  tabId: string
}>()

const { subscribeToStream } = useStreamSubscriber()

const conn = useStream(GQLConnection$, new GQLConnection(), setGQLConnection)

const url = useReadonlyStream(props.request.url$, "")
const gqlQueryString = useStream(
  props.request.query$,
  "",
  props.request.setGQLQuery.bind(props.request)
)
const variableString = useStream(
  props.request.variables$,
  "",
  props.request.setGQLVariables.bind(props.request)
)
// The functional headers list (the headers actually in the system)
const headers = useStream(
  props.request.headers$,
  [],
  props.request.setGQLHeaders.bind(props.request)
)
const auth = useStream(
  props.request.auth$,
  { authType: "none", authActive: true },
  props.request.setGQLAuth.bind(props.request)
)
const response = useStream(
  props.request.response$,
  [],
  props.request.setGQLResponse.bind(props.request)
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

    await conn.value.runQuery({
      name: props.request.getName(),
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
  subscribeToStream(conn.value.event$, (event) => {
    if (event === "reset") {
      return (response.value = [])
    }

    try {
      if (event.operationType !== "subscription") {
        response.value = [event]
      } else {
        response.value = [...response.value, event]
        if (currentTabId.value !== props.tabId) {
          setResponseUnseen(props.tabId, true)
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
