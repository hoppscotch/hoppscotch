<template>
  <HoppSmartTabs
    v-model="selectedOptionTab"
    styles="sticky bg-primary top-0 z-10 border-b-0"
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
        @save-request="() => invokeAction('request-response.save')"
        @cursor-position="updateCursorPos"
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
        @save-request="() => invokeAction('request-response.save')"
      />
    </HoppSmartTab>
    <HoppSmartTab
      :id="'headers'"
      :label="`${t('tab.headers')}`"
      :info="activeGQLHeadersCount === 0 ? null : `${activeGQLHeadersCount}`"
    >
      <GraphqlHeaders
        v-model="request"
        :inherited-properties="inheritedProperties"
        @change-tab="changeOptionTab"
      />
    </HoppSmartTab>
    <HoppSmartTab :id="'authorization'" :label="`${t('tab.authorization')}`">
      <GraphqlAuthorization
        v-model="request.auth"
        :inherited-properties="inheritedProperties"
      />
    </HoppSmartTab>
  </HoppSmartTabs>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { HoppGQLAuth, HoppGQLRequest } from "@hoppscotch/data"
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

const interceptorService = useService(KernelInterceptorService)
const gqlTabConn = useService(GQLTabConnectionService)

const t = useI18n()
const toast = useToast()

const props = withDefaults(
  defineProps<{
    modelValue: HoppGQLRequest
    response?: GQLResponseEvent[] | null
    optionTab?: GQLOptionTabs
    tabId: string
    url: string
    inheritedProperties?: HoppInheritedProperty
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
  (e: "cursor-position", pos: number): void
}>()

const selectedOptionTab = useVModel(props, "optionTab", emit)
const request = useVModel(props, "modelValue", emit)

const activeGQLHeadersCount = computed(
  () =>
    request.value.headers.filter(
      (x) => x.active && (x.key !== "" || x.value !== "")
    ).length
)

const runQuery = async (
  definition: gql.OperationDefinitionNode | null = null
) => {
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
      request: request.value,
      inheritedHeaders,
      inheritedAuth: props.inheritedProperties?.auth.inheritedAuth as
        | HoppGQLAuth
        | undefined,
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

// Watch per-tab message event for responses routed to this specific tab
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

// Watch per-tab connection state for errors
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

const updateCursorPos = (pos: number) => {
  emit("cursor-position", pos)
}

const clearGQLQuery = () => {
  request.value.query = ""
}

const changeOptionTab = (e: GQLOptionTabs) => {
  selectedOptionTab.value = e
}

defineActionHandler("request.send-cancel", runQuery)
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
