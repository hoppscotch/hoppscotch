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
        :indicator="request.query && request.query.length > 0 ? true : false"
      >
        <GraphqlQuery
          v-model="request.query"
          @run-query="runQuery"
          @save-request="saveRequest"
        />
      </SmartTab>
      <SmartTab
        :id="'variables'"
        :label="`${t('tab.variables')}`"
        :indicator="
          request.variables && request.variables.length > 0 ? true : false
        "
      >
        <GraphqlVariable
          v-model="request.variables"
          @run-query="runQuery"
          @save-request="saveRequest"
        />
      </SmartTab>
      <SmartTab
        :id="'headers'"
        :label="`${t('tab.headers')}`"
        :info="activeGQLHeadersCount === 0 ? null : `${activeGQLHeadersCount}`"
      >
        <GraphqlHeaders v-model="request" />
      </SmartTab>
      <SmartTab :id="'authorization'" :label="`${t('tab.authorization')}`">
        <GraphqlAuthorization v-model="request.auth" />
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
import { computed, onMounted, ref, watch } from "vue"
import { defineActionHandler } from "~/helpers/actions"
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"
import { getCurrentStrategyID } from "~/helpers/network"
import {
  GQLCurrentTabId$,
  setResponseUnseen,
  GQLConnection$,
  setGQLConnection,
  GQLConnectionURL$,
} from "~/newstore/GQLSession"
import { GQLConnection, GQLEvent } from "~/helpers/graphql/GQLConnection"
import { HoppGQLRequest } from "@hoppscotch/data"

type OptionTabs = "query" | "headers" | "variables" | "authorization"
const selectedOptionTab = ref<OptionTabs>("query")

const t = useI18n()
const toast = useToast()

// v-model integration with props and emit
const props = defineProps<{
  modelValue: HoppGQLRequest
  response: GQLEvent[]
  tabId: string
}>()
const emit = defineEmits(["update:modelValue", "update:response"])

const request = ref(props.modelValue)

watch(
  () => request.value,
  (newVal) => {
    emit("update:modelValue", newVal)
  },
  { deep: true }
)

const { subscribeToStream } = useStreamSubscriber()

const conn = useStream(GQLConnection$, new GQLConnection(), setGQLConnection)

const url = useReadonlyStream(GQLConnectionURL$, "")

const currentTabId = useReadonlyStream(GQLCurrentTabId$, "")
const activeGQLHeadersCount = computed(
  () =>
    request.value.headers.filter(
      (x) => x.active && (x.key !== "" || x.value !== "")
    ).length
)
const showSaveRequestModal = ref(false)
const runQuery = async (
  definition: gql.OperationDefinitionNode | null = null
) => {
  const startTime = Date.now()
  startPageProgress()
  try {
    const runURL = clone(url.value)
    const runHeaders = clone(request.value.headers)
    const runQuery = clone(request.value.query)
    const runVariables = clone(request.value.variables)
    const runAuth = clone(request.value.auth)

    await conn.value.runQuery({
      name: request.value.name,
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
      emit("update:response", [])
      return
    }

    try {
      if (event.operationType !== "subscription") {
        // response.value = [event]
        emit("update:response", [event])
      } else {
        emit("update:response", [...props.response, event])
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
  request.value.query = ""
}
defineActionHandler("request.send-cancel", runQuery)
defineActionHandler("request.save", saveRequest)
defineActionHandler("request.reset", clearGQLQuery)
</script>
