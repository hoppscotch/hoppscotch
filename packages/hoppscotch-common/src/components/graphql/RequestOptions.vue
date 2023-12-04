<template>
  <div class="flex h-full flex-1 flex-col">
    <HoppSmartTabs
      v-model="selectedOptionTab"
      styles="sticky top-0 bg-primary z-10 border-b-0"
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
      </HoppSmartTab>
      <HoppSmartTab
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
      </HoppSmartTab>
      <HoppSmartTab
        :id="'headers'"
        :label="`${t('tab.headers')}`"
        :info="activeGQLHeadersCount === 0 ? null : `${activeGQLHeadersCount}`"
      >
        <GraphqlHeaders v-model="request" />
      </HoppSmartTab>
      <HoppSmartTab :id="'authorization'" :label="`${t('tab.authorization')}`">
        <GraphqlAuthorization v-model="request.auth" />
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
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { completePageProgress, startPageProgress } from "~/modules/loadingbar"
import * as gql from "graphql"
import { clone } from "lodash-es"
import { computed, ref, watch } from "vue"
import { defineActionHandler } from "~/helpers/actions"
import { HoppGQLRequest } from "@hoppscotch/data"
import { platform } from "~/platform"
import { computedWithControl, useVModel } from "@vueuse/core"
import {
  GQLResponseEvent,
  runGQLOperation,
  gqlMessageEvent,
  connection,
} from "~/helpers/graphql/connection"
import { useService } from "dioc/vue"
import { InterceptorService } from "~/services/interceptor.service"
import { editGraphqlRequest } from "~/newstore/collections"
import { GQLTabService } from "~/services/tab/graphql"

const VALID_GQL_OPERATIONS = [
  "query",
  "headers",
  "variables",
  "authorization",
] as const

export type GQLOptionTabs = (typeof VALID_GQL_OPERATIONS)[number]

const interceptorService = useService(InterceptorService)

const t = useI18n()
const toast = useToast()

const tabs = useService(GQLTabService)

// v-model integration with props and emit
const props = withDefaults(
  defineProps<{
    modelValue: HoppGQLRequest
    response?: GQLResponseEvent[] | null
    optionTab?: GQLOptionTabs
    tabId: string
  }>(),
  {
    response: null,
    optionTab: "query",
  }
)
const emit = defineEmits<{
  (e: "update:modelValue", value: HoppGQLRequest): void
  (e: "update:optionTab", value: GQLOptionTabs): void
  (e: "update:response", value: GQLResponseEvent[]): void
}>()

const selectedOptionTab = useVModel(props, "optionTab", emit)

const request = useVModel(props, "modelValue", emit)

const url = computedWithControl(
  () => tabs.currentActiveTab.value,
  () => tabs.currentActiveTab.value.document.request.url
)

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

    await runGQLOperation({
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
    if (definition?.operation === "subscription" && request.value.auth) {
      toast.success(t("authorization.graphql_headers"))
    }
  } catch (e: any) {
    completePageProgress()
    console.error(e)
  }
  platform.analytics?.logEvent({
    type: "HOPP_REQUEST_RUN",
    platform: "graphql-query",
    strategy: interceptorService.currentInterceptorID.value!,
  })
}

watch(
  () => gqlMessageEvent.value,
  (event) => {
    if (event === "reset") {
      emit("update:response", [])
      return
    }

    try {
      if (
        event?.type === "response" &&
        event?.operationType !== "subscription"
      ) {
        // response.value = [event]
        emit("update:response", [event])
      } else {
        emit("update:response", [...(props.response ?? []), event])

        // TODO: subscription indicator??
      }
    } catch (error) {
      console.log(error)
    }
  },
  { deep: true }
)

watch(
  () => connection,
  (newVal) => {
    if (newVal.error && newVal.state === "DISCONNECTED") {
      const response = [
        {
          type: "error",
          error: {
            message: newVal.error.message(t),
            type: newVal.error.type,
            component: newVal.error.component,
          },
        },
      ]
      emit("update:response", response)
    }
  },
  { deep: true }
)

const hideRequestModal = () => {
  showSaveRequestModal.value = false
}
const saveRequest = () => {
  if (
    tabs.currentActiveTab.value.document.saveContext &&
    tabs.currentActiveTab.value.document.saveContext.originLocation ===
      "user-collection"
  ) {
    editGraphqlRequest(
      tabs.currentActiveTab.value.document.saveContext.folderPath,
      tabs.currentActiveTab.value.document.saveContext.requestIndex,
      tabs.currentActiveTab.value.document.request
    )

    tabs.currentActiveTab.value.document.isDirty = false
  } else {
    showSaveRequestModal.value = true
  }
}
const clearGQLQuery = () => {
  request.value.query = ""
}
defineActionHandler("request.send-cancel", runQuery)
defineActionHandler("request.save", saveRequest)
defineActionHandler("request.save-as", () => {
  showSaveRequestModal.value = true
})
defineActionHandler("request.reset", clearGQLQuery)

defineActionHandler("request.open-tab", ({ tab }) => {
  selectedOptionTab.value = tab as GQLOptionTabs
})
</script>

<style lang="scss" scoped>
:deep(.cm-panels) {
  @apply top-upperPrimaryStickyFold #{!important};
}
</style>
