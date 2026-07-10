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
import { clone, cloneDeep } from "lodash-es"
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
    // Deep-freeze the whole request at click time (like url/query/variables)
    // so edits during the run's awaits can't change what's sent — auth
    // editors mutate nested fields in place, so a shallow clone wouldn't hold
    const runRequest = cloneDeep(request.value) as HoppGQLRequest
    const runInheritedAuth = cloneDeep(
      props.inheritedProperties?.auth.inheritedAuth
    ) as HoppGQLAuth | undefined

    const inheritedHeaders = cloneDeep(
      props.inheritedProperties?.headers.map(
        (header) => header.inheritedHeader
      ) ?? []
    )
    const runInheritedVariables = cloneDeep(
      props.inheritedProperties?.variables
    )

    await gqlTabConn.runTabGQLOperation(props.tabId, {
      name: runRequest.name,
      url: runURL,
      request: runRequest,
      inheritedHeaders,
      inheritedAuth: runInheritedAuth,
      inheritedVariables: runInheritedVariables,
      query: runQueryStr,
      variables: runVariables,
      operationName: definition?.name?.value,
      operationType: definition?.operation ?? "query",
    })
    const duration = Date.now() - startTime
    completePageProgress()
    toast.success(`${t("state.finished_in", { duration })}`)
    // `auth` is always truthy (authType "none" included) — only toast when
    // auth actually rode the connection_init payload (same snapshot the
    // operation received)
    const auth = runRequest.auth
    const effectiveAuth = auth.authType === "inherit" ? runInheritedAuth : auth
    if (
      definition?.operation === "subscription" &&
      effectiveAuth &&
      effectiveAuth.authActive &&
      effectiveAuth.authType !== "none" &&
      effectiveAuth.authType !== "inherit"
    ) {
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

      if (!event) return

      try {
        // A subscription stream accumulates into the log; anything else —
        // query/mutation result or a run-level error — concludes a discrete
        // run and replaces the panel. Errors append only when a subscription
        // log is actually on screen: the renderers key off `response[0]`, so
        // appending an error after a query response would hide it behind the
        // stale result (blank body + old meta).
        const current = props.response ?? []
        const head = current[0]
        const appendsToLog =
          (event.type === "response" &&
            event.operationType === "subscription") ||
          (event.type === "error" &&
            head?.type === "response" &&
            head.operationType === "subscription")
        emit("update:response", appendsToLog ? [...current, event] : [event])
      } catch (error) {
        console.error(error)
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
