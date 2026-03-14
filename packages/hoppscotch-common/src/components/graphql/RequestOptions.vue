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
import * as E from "fp-ts/Either"
import { updateTeamRequest } from "~/helpers/backend/mutations/TeamRequest"
import { editGraphqlRequest } from "~/newstore/collections"
import { useSetting } from "@composables/settings"
import { platform } from "~/platform"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { GQLTabService } from "~/services/tab/graphql"

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

// Tracks whether a team-collection async mutation is currently in-flight.
// Only blocks concurrent silent auto-saves — manual saves always proceed.
const saveInProgress = ref(false)

const saveRequest = (options?: { silent?: boolean }) => {
  const silent = options?.silent ?? false

  // Block concurrent silent auto-saves only.
  // Manual saves always proceed so the user is never silently ignored.
  if (silent && saveInProgress.value) return

  // For manual saves, only proceed if this is the active tab
  if (!silent && tabs.currentActiveTab.value.id !== props.tabId) {
    return
  }

  // Always use the component-scoped tab ref — never currentActiveTab
  const tabToSave = tab.value
  if (!tabToSave) return

  const saveCtx = tabToSave.document.saveContext

  if (!saveCtx) {
    // Only open the Save modal for manual saves — auto-save must never open modals
    if (!silent) showSaveRequestModal.value = true
    return
  }

  if (saveCtx.originLocation === "user-collection") {
    // Pure in-memory operation — no auth check needed
    try {
      editGraphqlRequest(
        saveCtx.folderPath,
        saveCtx.requestIndex,
        tabToSave.document.request
      )
      tabToSave.document.isDirty = false
      // Only toast for manual saves — auto-save must never show toasts
      if (!silent) toast.success(`${t("request.saved")}`)
    } catch (_e) {
      // saveContext may be stale (e.g. collection restructured) — clear it
      // so the user is re-prompted on the next manual save
      tabToSave.document.saveContext = undefined
      if (!silent) showSaveRequestModal.value = true
    }
    return
  }

  if (saveCtx.originLocation === "team-collection") {
    saveInProgress.value = true

    // Only log analytics for deliberate user-initiated saves
    if (!silent) {
      platform.analytics?.logEvent({
        type: "HOPP_SAVE_REQUEST",
        platform: "graphql",
        createdNow: false,
        workspaceType: "team",
      })
    }

    // Snapshot the request before the mutation so we can detect edits
    // that arrive while the network call is in-flight
    const requestSnapshot = JSON.stringify(tabToSave.document.request)

    updateTeamRequest(saveCtx.requestID, {
      request: requestSnapshot,
      title: tabToSave.document.request.name,
    })()
      .then((result) => {
        if (E.isLeft(result)) {
          // Only toast for manual saves — auto-save must never show toasts
          if (!silent) toast.error(`${t("profile.no_permission")}`)
        } else {
          // Only clear isDirty if no new edits arrived during the mutation.
          // If the request changed while in-flight, leave isDirty=true so the
          // next debounce cycle picks it up and saves the newer content.
          if (JSON.stringify(tabToSave.document.request) === requestSnapshot) {
            tabToSave.document.isDirty = false
          }
          if (!silent) toast.success(`${t("request.saved")}`)
        }
      })
      .catch((error) => {
        // Only toast for manual saves — auto-save must never show toasts
        if (!silent) toast.error(`${t("error.something_went_wrong")}`)
        console.error(error)
      })
      .finally(() => {
        saveInProgress.value = false
      })
    return
  }

  // saveCtx.originLocation is unrecognised — only open modal for manual saves
  if (!silent) showSaveRequestModal.value = true
}

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
// stale/destroyed component instance
const stopAutoSave = watchDebounced(
  request,
  () => {
    // getTabRef throws (not returns null) when the tab is not in the map.
    // This can happen in the narrow race between the debounce firing and
    // onUnmounted running. Wrap in try/catch so it fails silently.
    try {
      const tabToSave = tab.value

      const isDirty = tabToSave.document.isDirty
      const saveCtx = tabToSave.document.saveContext
      const autoSaveEnabled = AUTO_SAVE_REQUESTS.value

      if (!autoSaveEnabled || !isDirty || !saveCtx || saveInProgress.value) {
        return
      }

      saveRequest({ silent: true })
    } catch {
      // Tab was removed between the watcher firing and execution — safe to ignore
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
  // Cancel any pending debounced auto-save to avoid callbacks on stale refs
  stopAutoSave()
})
</script>

<style lang="scss" scoped>
:deep(.cm-panels) {
  @apply top-upperPrimaryStickyFold #{!important};
}
</style>
