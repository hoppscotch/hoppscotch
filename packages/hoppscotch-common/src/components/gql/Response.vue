<template>
  <div class="flex flex-1 flex-col overflow-auto whitespace-nowrap">
    <GqlResponseMeta
      v-if="!isSubscriptionView"
      :response="response"
      :tab-id="tabId"
      :is-loading="isTestResultsLoading"
    />
    <HoppSmartTabs
      v-if="
        !isTestResultsLoading &&
        response &&
        response.length === 1 &&
        response[0].type === 'response' &&
        response[0].operationType !== 'subscription'
      "
      v-model="selectedResponseTab"
      styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-0 z-10"
      render-inactive-tabs
    >
      <HoppSmartTab :id="'response'" :label="`${t('response.title')}`">
        <div class="flex flex-1 flex-col">
          <div
            class="sticky top-0 z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
          >
            <label class="truncate font-semibold text-secondaryLight">
              {{ t("response.body") }}
            </label>
            <div class="flex items-center">
              <HoppButtonSecondary
                v-if="document"
                v-tippy="{ theme: 'tooltip', allowHTML: true }"
                :title="
                  isSavable
                    ? `${t(
                        'response.save_as_example'
                      )} <kbd>${getSpecialKey()}</kbd><kbd>E</kbd>`
                    : t('response.please_save_request')
                "
                :icon="IconSave"
                :class="{
                  'opacity-75 cursor-not-allowed select-none': !isSavable,
                }"
                @click="isSavable ? onSaveAsExampleClick() : null"
              />
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('state.linewrap')"
                :class="{ '!text-accent': WRAP_LINES }"
                :icon="IconWrapText"
                @click.prevent="
                  toggleNestedSetting('WRAP_LINES', 'graphqlResponseBody')
                "
              />
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip', allowHTML: true }"
                :title="`${t(
                  'action.download_file'
                )} <kbd>${getSpecialKey()}</kbd><kbd>J</kbd>`"
                :icon="downloadIcon"
                @click="downloadResponse"
              />
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip', allowHTML: true }"
                :title="`${t(
                  'action.copy'
                )} <kbd>${getSpecialKey()}</kbd><kbd>.</kbd>`"
                :icon="copyIcon"
                @click="copyResponse"
              />
              <tippy
                interactive
                trigger="click"
                theme="popover"
                :on-shown="() => copyInterfaceTippyActions.focus()"
              >
                <HoppButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('action.more')"
                  :icon="IconMore"
                />
                <template #content="{ hide }">
                  <div
                    ref="copyInterfaceTippyActions"
                    class="flex flex-col focus:outline-none"
                    tabindex="0"
                    @keyup.escape="hide()"
                  >
                    <HoppSmartItem
                      :label="t('response.generate_data_schema')"
                      :icon="IconNetwork"
                      @click="
                        () => {
                          invokeAction('response.schema.toggle')
                          hide()
                        }
                      "
                    />
                  </div>
                </template>
              </tippy>
            </div>
          </div>
          <div class="h-full relative overflow-auto flex flex-col flex-1">
            <div ref="schemaEditor" class="absolute inset-0 h-full"></div>
          </div>
        </div>
      </HoppSmartTab>
      <HoppSmartTab
        v-if="document !== undefined"
        :id="'results'"
        :label="`${t('test.results')}`"
        :indicator="testResultsIndicator"
      >
        <HttpTestResult
          v-model="testResultsModel"
          :is-loading="isTestResultsLoading"
        />
      </HoppSmartTab>
      <HoppSmartTab
        v-if="showConsoleTab"
        id="console"
        label="Console"
        class="flex flex-1 flex-col"
      >
        <ConsolePanel :messages="consoleEntries" />
      </HoppSmartTab>
    </HoppSmartTabs>
    <div
      v-else-if="
        response &&
        response.length > 0 &&
        response[0].type === 'response' &&
        response[0].operationType === 'subscription'
      "
      class="flex flex-1 flex-col"
    >
      <GqlSubscriptionLog :log="response" @delete="clearSubscriptionLog" />
    </div>
    <div
      v-else-if="subscriptionPending"
      class="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-secondaryLight"
    >
      <HoppSmartSpinner />
      <span>{{ subscriptionPendingLabel }}</span>
    </div>
  </div>
  <HttpSaveResponseName
    v-model:response-name="responseName"
    :has-same-name-response="hasSameNameResponse"
    :show="showSaveResponseName"
    @submit="onSaveAsExample"
    @hide-modal="showSaveResponseName = false"
  />
</template>

<script setup lang="ts">
import IconWrapText from "~icons/lucide/wrap-text"
import IconNetwork from "~icons/lucide/network"
import IconMore from "~icons/lucide/more-horizontal"
import IconSave from "~icons/lucide/save"
import { computed, reactive, ref, watch } from "vue"
import { useVModel } from "@vueuse/core"
import { useService } from "dioc/vue"
import {
  HoppGQLRequestResponse,
  HoppGQLResponseOriginalRequest,
  makeHoppGQLResponseOriginalRequest,
} from "@hoppscotch/data"
import { useCodemirror } from "@composables/codemirror"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { defineActionHandler, invokeAction } from "~/helpers/actions"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import {
  GQLResponseEvent,
  GQLTabConnectionService,
} from "~/services/gql-tab-connection.service"
import { useNestedSetting, useSetting } from "~/composables/settings"
import { toggleNestedSetting } from "~/newstore/settings"
import {
  useCopyResponse,
  useDownloadResponse,
} from "~/composables/lens-actions"
import { editRESTRequest } from "~/newstore/collections"
import { HoppGQLRequestDocument } from "~/helpers/rest/document"
import { runMutation } from "~/helpers/backend/GQLClient"
import { UpdateRequestDocument } from "~/helpers/backend/graphql"
import * as E from "fp-ts/Either"

const t = useI18n()
const toast = useToast()

const props = withDefaults(
  defineProps<{
    response: GQLResponseEvent[] | null
    tabId?: string
    document?: HoppGQLRequestDocument
  }>(),
  {
    response: null,
    tabId: undefined,
    document: undefined,
  }
)

const emit = defineEmits<{
  (e: "update:document", val: HoppGQLRequestDocument): void
}>()

const doc = useVModel(props, "document", emit)

const gqlTabConn = useService(GQLTabConnectionService)

// --- Test results tab ---

const selectedResponseTab = ref<string>(
  props.document?.responseTabPreference ?? "response"
)
watch(selectedResponseTab, (tab) => {
  if (doc.value) doc.value.responseTabPreference = tab
})

const testResultsModel = computed({
  get: () => doc.value?.testResults,
  // `null` is reserved for "run in flight" — the clear button's null write
  // maps to undefined so it shows the empty state, not an eternal spinner
  set: (val) => {
    if (doc.value) doc.value.testResults = val === null ? undefined : val
  },
})

const isTestResultsLoading = computed(() => doc.value?.testResults === null)

// Save-as-example needs a persisted request to write into — mirror the REST
// renderer's disabled affordance for unsaved requests
const isSavable = computed(() => !!doc.value?.saveContext)

const EXPERIMENTAL_SCRIPTING_SANDBOX = useSetting(
  "EXPERIMENTAL_SCRIPTING_SANDBOX"
)

const showConsoleTab = computed(() => {
  const entries = doc.value?.testResults?.consoleEntries
  return !!entries && entries.length > 0 && EXPERIMENTAL_SCRIPTING_SANDBOX.value
})

const consoleEntries = computed(() => {
  const entries = doc.value?.testResults?.consoleEntries ?? []
  return entries.filter(({ type }) =>
    ["log", "warn", "debug", "error", "info"].includes(type)
  )
})

// The Console tab unmounts when a run produces no console output — a stale
// "console" selection (in-session or restored via responseTabPreference)
// would leave the panel blank
watch(
  showConsoleTab,
  (visible) => {
    if (!visible && selectedResponseTab.value === "console") {
      selectedResponseTab.value = "response"
    }
  },
  { immediate: true }
)

const testResultsIndicator = computed(() => {
  const results = doc.value?.testResults
  if (!results) return false
  return Boolean(
    results.expectResults.length ||
    results.tests.length ||
    results.envDiff.selected.additions.length ||
    results.envDiff.selected.updations.length ||
    results.envDiff.global.updations.length
  )
})

// `subscriptionPending` is true when a subscription has been initiated and
// the server hasn't pushed any data yet — covers both the SUBSCRIBING window
// (waiting for connection_ack) and the post-ack idle window (subscribed but
// no events yet). Used to render a loading state instead of a blank panel.
const subscriptionPending = computed(() => {
  if (!props.tabId) return false
  const state = gqlTabConn.getTabSubscriptionState(props.tabId).value
  if (state !== "SUBSCRIBING" && state !== "SUBSCRIBED") return false
  // Already have data → let the subscription log render.
  if (props.response && props.response.length > 0) return false
  return true
})

const subscriptionPendingLabel = computed(() => {
  const state = props.tabId
    ? gqlTabConn.getTabSubscriptionState(props.tabId).value
    : undefined
  return state === "SUBSCRIBING"
    ? t("graphql.subscribing")
    : t("graphql.waiting_for_events")
})

// True whenever the response panel is in any subscription-specific state —
// loading, waiting for events, or rendering the subscription log. Used to
// hide the REST/query-style response meta header bar that doesn't apply.
const isSubscriptionView = computed(() => {
  if (subscriptionPending.value) return true
  const first = props.response?.[0]
  return (
    !!first &&
    first.type === "response" &&
    first.operationType === "subscription"
  )
})

const clearSubscriptionLog = () => {
  if (!doc.value) return
  // Empty array (not null) keeps the loading/waiting branch active when the
  // subscription is still live — a fresh `[]` lets the post-ack idle state
  // render "Waiting for events…" instead of dropping to a blank panel.
  doc.value.response = []
}

const responseString = computed(() => {
  const response = props.response
  if (!response || response.length === 0) return ""
  if (response[0].type === "error") return ""
  if (
    response.length === 1 &&
    response[0].type === "response" &&
    response[0].data
  ) {
    return JSON.stringify(JSON.parse(response[0].data), null, 2)
  }
  return ""
})

const schemaEditor = ref<any | null>(null)
const WRAP_LINES = useNestedSetting("WRAP_LINES", "graphqlResponseBody")
const copyInterfaceTippyActions = ref<any | null>(null)

useCodemirror(
  schemaEditor,
  responseString,
  reactive({
    extendedEditorConfig: {
      mode: "application/ld+json",
      readOnly: true,
      lineWrapping: WRAP_LINES,
    },
    linter: null,
    completer: null,
    environmentHighlights: false,
  })
)

const { copyIcon, copyResponse } = useCopyResponse(responseString)
const { downloadIcon, downloadResponse } = useDownloadResponse(
  "application/json",
  responseString,
  t("filename.graphql_response")
)

defineActionHandler(
  "response.file.download",
  () => downloadResponse(),
  computed(() => !!props.response && props.response.length > 0)
)
defineActionHandler(
  "response.copy",
  () => copyResponse(),
  computed(() => !!props.response && props.response.length > 0)
)
defineActionHandler(
  "response.save-as-example",
  () => onSaveAsExampleClick(),
  computed(() => !!doc.value && !!responseString.value && isSavable.value)
)

const responseName = ref("")
const showSaveResponseName = ref(false)

const hasSameNameResponse = computed(() => {
  if (!responseName.value || !doc.value) return false
  return responseName.value in doc.value.request.responses
})

const onSaveAsExampleClick = () => {
  if (!doc.value) return
  showSaveResponseName.value = true
  responseName.value = doc.value.request.name
}

const onSaveAsExample = () => {
  if (!doc.value || !props.response || props.response.length !== 1) return

  const event = props.response[0]
  if (event.type !== "response") return

  const req = doc.value.request

  const originalRequest: HoppGQLResponseOriginalRequest =
    makeHoppGQLResponseOriginalRequest({
      name: req.name,
      url: req.url,
      query: req.query,
      variables: req.variables,
      headers: req.headers,
      auth: req.auth,
    })

  const resName = responseName.value.trim()

  const responseObj: HoppGQLRequestResponse = {
    name: resName,
    originalRequest,
    status: event.document?.statusText ?? "",
    code: event.document?.statusCode ?? null,
    // GQL response transport headers are not currently surfaced by the
    // tab-connection service; persist an empty list. If the service later
    // exposes them, this is where they'd land.
    headers: [],
    body: event.data,
    // Operation identity for the mock server's GraphQL matcher — the
    // DB trigger projects these into `mockExamples`
    operationName: event.operationName,
    operationType: event.operationType,
  }

  doc.value.request.responses = {
    ...doc.value.request.responses,
    [resName]: responseObj,
  }

  showSaveResponseName.value = false

  const saveCtx = doc.value.saveContext
  if (!saveCtx) {
    responseName.value = ""
    return
  }

  // Unified workspace: GQL request bodies are stored in REST collection rows,
  // so personal-workspace saves go through the REST store / REST mutation
  // (mirrors `editRequest` in the personal sync layer).
  if (saveCtx.originLocation === "user-collection") {
    try {
      editRESTRequest(
        saveCtx.folderPath,
        saveCtx.requestIndex,
        doc.value.request
      )
      toast.success(`${t("response.saved")}`)
    } catch (e) {
      console.error(e)
    }
    responseName.value = ""
    return
  }

  if (saveCtx.originLocation === "team-collection") {
    runMutation(UpdateRequestDocument, {
      requestID: saveCtx.requestID,
      data: {
        title: doc.value.request.name,
        request: JSON.stringify(doc.value.request),
      },
    })().then((result) => {
      if (E.isLeft(result)) {
        toast.error(`${t("profile.no_permission")}`)
      } else {
        // The example is persisted — clear the dirty flag like the REST
        // sibling (http/Response.vue) does
        if (doc.value) doc.value.isDirty = false
        toast.success(`${t("response.saved")}`)
      }
      responseName.value = ""
    })
    return
  }

  responseName.value = ""
}
</script>
