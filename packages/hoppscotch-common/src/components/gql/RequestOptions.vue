<template>
  <HoppSmartTabs
    v-model="selectedOptionTab"
    styles="sticky bg-primary top-upperMobilePrimaryStickyFold sm:top-upperPrimaryStickyFold z-10 border-b-0"
    :render-inactive-tabs="true"
  >
    <HoppSmartTab
      v-if="showTab('query')"
      :id="'query'"
      :label="`${t('tab.query')}`"
      :indicator="request.query && request.query.length > 0 ? true : false"
    >
      <GqlQuery
        v-model="request.query"
        :show-run-actions="showRunActions"
        :subscription-state="subscriptionState"
        @run-query="runQuery"
        @stop-query="stopQuery"
        @save-request="() => invokeAction('request-response.save')"
        @cursor-position="updateCursorPos"
      />
    </HoppSmartTab>
    <HoppSmartTab
      v-if="showTab('variables')"
      :id="'variables'"
      :label="`${t('tab.variables')}`"
      :indicator="
        request.variables && request.variables.length > 0 ? true : false
      "
    >
      <GqlVariable
        v-model="request.variables"
        :show-run-actions="showRunActions"
        :subscription-state="subscriptionState"
        @run-query="runQuery"
        @stop-query="stopQuery"
        @save-request="() => invokeAction('request-response.save')"
      />
    </HoppSmartTab>
    <HoppSmartTab
      v-if="showTab('headers')"
      :id="'headers'"
      :label="`${t('tab.headers')}`"
      :info="activeGQLHeadersCount === 0 ? null : `${activeGQLHeadersCount}`"
    >
      <GqlHeaders
        v-model="request"
        :inherited-properties="inheritedProperties"
        @change-tab="changeOptionTab"
      />
    </HoppSmartTab>
    <HoppSmartTab
      v-if="showTab('authorization')"
      :id="'authorization'"
      :label="`${t('tab.authorization')}`"
    >
      <GqlAuthorization
        v-model="request.auth"
        :inherited-properties="inheritedProperties"
      />
    </HoppSmartTab>
  </HoppSmartTabs>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import {
  HoppGQLAuth,
  HoppGQLRequest,
  HoppGQLResponseOriginalRequest,
} from "@hoppscotch/data"
import { useVModel } from "@vueuse/core"
import * as gql from "graphql"
import { clone } from "lodash-es"
import { computed, watch } from "vue"
import { defineActionHandler, invokeAction } from "~/helpers/actions"
import {
  GQLTabConnectionService,
  type GQLResponseEvent,
} from "~/services/gql-tab-connection.service"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import { completePageProgress, startPageProgress } from "~/modules/loadingbar"
import { platform } from "~/platform"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { useService } from "dioc/vue"
import { GQLOptionTabs } from "~/components/graphql/RequestOptions.vue"

type GqlRequestOptionsModel = HoppGQLRequest | HoppGQLResponseOriginalRequest

const interceptorService = useService(KernelInterceptorService)
const gqlTabConn = useService(GQLTabConnectionService)

const t = useI18n()
const toast = useToast()

const props = withDefaults(
  defineProps<{
    modelValue: GqlRequestOptionsModel
    response?: GQLResponseEvent[] | null
    optionTab?: GQLOptionTabs
    tabId?: string
    url?: string
    inheritedProperties?: HoppInheritedProperty
    showRunActions?: boolean
    /**
     * Filter which sub-tabs are visible. Used by the embed renderer to
     * honour the share-er's customize selections. `undefined` shows all
     * tabs (default for the live editor).
     */
    properties?: string[]
  }>(),
  {
    response: null,
    optionTab: "query",
    tabId: "",
    url: "",
    showRunActions: true,
    properties: undefined,
  }
)

const emit = defineEmits<{
  (e: "update:modelValue", value: GqlRequestOptionsModel): void
  (e: "update:optionTab", value: GQLOptionTabs): void
  (e: "update:response", value: GQLResponseEvent[]): void
  (e: "cursor-position", pos: number): void
}>()

const selectedOptionTab = useVModel(props, "optionTab", emit)
const request = useVModel(props, "modelValue", emit)

// Show a tab when `properties` is absent (live editor — all four) OR the tab
// is explicitly listed. An empty `properties` array would otherwise hide every
// tab — `.includes(...)` returns false for all queries, and the `?? true`
// short-circuit on the v-if only catches `undefined`/`null`. That edge case
// happens when the share-er disables every customize toggle.
const showTab = (id: "query" | "variables" | "headers" | "authorization") => {
  if (props.properties === undefined) return true
  if (props.properties.length === 0) return true
  return props.properties.includes(id)
}

const subscriptionState = computed(() =>
  props.tabId
    ? gqlTabConn.getTabSubscriptionState(props.tabId).value
    : undefined
)

const stopQuery = () => {
  if (!props.tabId) return
  gqlTabConn.unsubscribeTab(props.tabId)
}

const activeGQLHeadersCount = computed(
  () =>
    request.value.headers.filter(
      (x) => x.active && (x.key !== "" || x.value !== "")
    ).length
)

const runQuery = async (
  definition: gql.OperationDefinitionNode | null = null
) => {
  if (!props.tabId) return
  const startTime = Date.now()
  startPageProgress()
  try {
    const runURL = clone(props.url)
    const runQueryStr = clone(request.value.query)
    const runVariables = clone(request.value.variables)

    const inheritedHeaders =
      props.inheritedProperties?.headers.map(
        (header) => header.inheritedHeader
      ) ?? []

    await gqlTabConn.runTabGQLOperation(props.tabId, {
      name: request.value.name,
      url: runURL,
      request: request.value as HoppGQLRequest,
      inheritedHeaders,
      inheritedAuth: props.inheritedProperties?.auth.inheritedAuth as
        | HoppGQLAuth
        | undefined,
      inheritedVariables: props.inheritedProperties?.variables,
      query: runQueryStr,
      variables: runVariables,
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
    strategy: interceptorService.current.value!.id,
  })
}

if (props.tabId) {
  const tabMessageEvent = gqlTabConn.getTabMessageEvent(props.tabId)
  watch(
    () => tabMessageEvent.value,
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
          emit("update:response", [event])
        } else {
          emit("update:response", [...(props.response ?? []), event])
        }
      } catch (error) {
        console.log(error)
      }
    },
    { deep: true }
  )

  watch(
    () => {
      const ctx = gqlTabConn.getTabConnectionState(props.tabId)
      return { error: ctx.error, state: ctx.state }
    },
    (newVal) => {
      if (
        newVal.error &&
        (newVal.state === "DISCONNECTED" || newVal.state === "ERROR")
      ) {
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
}

const updateCursorPos = (pos: number) => {
  emit("cursor-position", pos)
}

const clearGQLQuery = () => {
  request.value.query = ""
}

const changeOptionTab = (e: GQLOptionTabs) => {
  selectedOptionTab.value = e
}

const runActionsActive = computed(() => props.showRunActions)
defineActionHandler("request.send-cancel", runQuery, runActionsActive)
defineActionHandler("request.reset", clearGQLQuery, runActionsActive)

defineActionHandler("request.open-tab", ({ tab }) => {
  selectedOptionTab.value = tab as GQLOptionTabs
})
</script>

<style lang="scss" scoped>
:deep(.cm-panels) {
  @apply top-upperPrimaryStickyFold #{!important};
}
</style>
