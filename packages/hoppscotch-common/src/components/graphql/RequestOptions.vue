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
        @save-request="saveRequest"
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
        @save-request="saveRequest"
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
  <CollectionsSaveRequest
    mode="graphql"
    :show="showSaveRequestModal"
    @hide-modal="hideRequestModal"
  />
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { HoppGQLAuth, HoppGQLRequest } from "@hoppscotch/data"
import { computedWithControl, useVModel } from "@vueuse/core"
import { watchDebounced } from "@vueuse/core"
import { useService } from "dioc/vue"
import * as gql from "graphql"
import { clone } from "lodash-es"
import { computed, ref, watch, onUnmounted } from "vue"
import { defineActionHandler } from "~/helpers/actions"
import {
  connection,
  gqlMessageEvent,
  GQLResponseEvent,
  runGQLOperation,
} from "~/helpers/graphql/connection"
import { HoppInheritedProperty } from "~/helpers/types/HoppInheritedProperties"
import { completePageProgress, startPageProgress } from "~/modules/loadingbar"
import { useSetting } from "@composables/settings"
import { platform } from "~/platform"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { GQLTabService } from "~/services/tab/graphql"
import { AutoSaveService } from "~/services/auto-save.service"

const _VALID_GQL_OPERATIONS = [
  "query",
  "headers",
  "variables",
  "authorization",
] as const

export type GQLOptionTabs = (typeof _VALID_GQL_OPERATIONS)[number]

const interceptorService = useService(KernelInterceptorService)

const t = useI18n()
const toast = useToast()

const tabs = useService(GQLTabService)
const autoSaveService = useService(AutoSaveService)

const props = withDefaults(
  defineProps<{
    modelValue: HoppGQLRequest
    response?: GQLResponseEvent[] | null
    optionTab?: GQLOptionTabs
    tabId: string
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
}>()

const selectedOptionTab = useVModel(props, "optionTab", emit)
const request = useVModel(props, "modelValue", emit)

// Scoped to this component's tab — never reads currentActiveTab
const tab = tabs.getTabRef(props.tabId)

const url = computedWithControl(
  () => tab.value,
  () => tab.value?.document.request.url ?? ""
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
    const runQuery = clone(request.value.query)
    const runVariables = clone(request.value.variables)

    const inheritedHeaders =
      tab.value?.document.inheritedProperties?.headers.map(
        (header) => header.inheritedHeader
      ) ?? []

    await runGQLOperation({
      name: request.value.name,
      url: runURL,
      request: request.value,
      inheritedHeaders,
      inheritedAuth: tab.value?.document.inheritedProperties?.auth
        .inheritedAuth as HoppGQLAuth | undefined,
      query: runQuery,
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
  () => connection,
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
  if (tab.value) tab.value.document.cursorPosition = pos
}

const hideRequestModal = () => {
  showSaveRequestModal.value = false
}

// Tracks the polling timer used to honor a user's manual save request that
// arrives while a mutation is already in-flight. Ensures we never have more
// than one outstanding poll and that pending polls are cancelled on unmount.
let manualSavePollTimer: ReturnType<typeof setTimeout> | null = null

// Declared as async to match REST and allow callers to await completion.
const saveRequest = (options?: { silent?: boolean }) =>
  autoSaveService.saveRequest(tab.value, {
    ...options,
    onTriggerModal: () => {
      showSaveRequestModal.value = true
    },
  })

const clearGQLQuery = () => {
  request.value.query = ""
}

const changeOptionTab = (e: GQLOptionTabs) => {
  selectedOptionTab.value = e
}

defineActionHandler("request.send-cancel", runQuery)
defineActionHandler("request-response.save", saveRequest)
defineActionHandler("request.save-as", () => {
  showSaveRequestModal.value = true
})
defineActionHandler("request.reset", clearGQLQuery)
defineActionHandler("request.open-tab", ({ tab }) => {
  selectedOptionTab.value = tab as GQLOptionTabs
})

const AUTO_SAVE_REQUESTS = useSetting("AUTO_SAVE_REQUESTS")
const AUTO_SAVE_DELAY_MS = useSetting("AUTO_SAVE_DELAY_MS")

// Stop the watcher on unmount to prevent debounce callbacks firing on a
// stale/destroyed component instance.
const stopAutoSave = watchDebounced(
  request,
  () => {
    try {
      // New user edit arrived — reset retry state so the fresh content gets a
      // full retry budget rather than inheriting an exhausted counter.
      if (tab.value) autoSaveService.resetRetryCount(tab.value.id)

      const tabToSave = tab.value
      if (!tabToSave) return

      const isDirty = tabToSave.document.isDirty
      const saveCtx = tabToSave.document.saveContext
      const autoSaveEnabled = AUTO_SAVE_REQUESTS.value

      if (
        !autoSaveEnabled ||
        !isDirty ||
        !saveCtx ||
        autoSaveService.saveInProgress.value
      ) {
        return
      }

      saveRequest({ silent: true })
    } catch {
      // Tab was removed between the watcher firing and execution — safe to ignore.
    }
  },
  {
    deep: true,
    // Clamp delay between 500 ms and 10 000 ms, default 2 000 ms
    debounce: computed(() =>
      Math.min(10000, Math.max(500, Number(AUTO_SAVE_DELAY_MS.value) || 2000))
    ),
  }
)

onUnmounted(() => {
  // Cancel any pending debounced auto-save and retry timers
  stopAutoSave()
  if (tab.value) autoSaveService.clearRetryTimer(tab.value.id)
  if (manualSavePollTimer !== null) {
    clearTimeout(manualSavePollTimer)
    manualSavePollTimer = null
  }
})
</script>

<style lang="scss" scoped>
:deep(.cm-panels) {
  @apply top-upperPrimaryStickyFold #{!important};
}
</style>
