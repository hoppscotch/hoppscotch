<template>
  <div
    class="sticky top-0 z-20 flex-none flex-shrink-0 bg-primary p-4 sm:flex sm:flex-shrink-0 sm:space-x-2"
  >
    <div
      class="min-w-[12rem] flex flex-1 whitespace-nowrap rounded border border-divider"
    >
      <div class="relative flex">
        <label for="method">
          <tippy
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => methodTippyActions.focus()"
          >
            <HoppSmartSelectWrapper>
              <input
                id="method"
                class="flex w-26 cursor-pointer rounded-l bg-primaryLight px-4 py-2 font-semibold text-secondaryDark transition"
                :value="tab.document.request.method"
                :readonly="!isCustomMethod"
                :placeholder="`${t('request.method')}`"
                :style="{
                  color: getMethodLabelColor(tab.document.request.method),
                }"
                @input="onSelectMethod($event)"
              />
            </HoppSmartSelectWrapper>
            <template #content="{ hide }">
              <div
                ref="methodTippyActions"
                class="flex flex-col focus:outline-none"
                tabindex="0"
                @keyup.escape="hide()"
              >
                <HoppSmartItem
                  v-for="(method, index) in methods"
                  :key="`method-${index}`"
                  :label="method"
                  :style="{
                    color: getMethodLabelColor(method),
                  }"
                  @click="
                    () => {
                      updateMethod(method)
                      hide()
                    }
                  "
                />
              </div>
            </template>
          </tippy>
        </label>
      </div>
      <div
        class="flex flex-1 whitespace-nowrap rounded-r border-l border-divider bg-primaryLight transition"
      >
        <SmartEnvInput
          ref="urlInput"
          v-model="tab.document.request.endpoint"
          :placeholder="`${t('request.url_placeholder')}`"
          :auto-complete-source="userHistories"
          :auto-complete-env="true"
          :inspection-results="tabResults"
          @paste="onPasteUrl($event)"
          @enter="newSendRequest"
        />
      </div>
    </div>
    <div class="mt-2 flex sm:mt-0">
      <HoppButtonPrimary
        id="send"
        v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
        :title="`${t('action.send')} <kbd>${getSpecialKey()}</kbd><kbd>↩</kbd>`"
        :label="`${
          !isTabResponseLoading ? t('action.send') : t('action.cancel')
        }`"
        class="min-w-[5rem] flex-1 rounded-r-none"
        @click="!isTabResponseLoading ? newSendRequest() : cancelRequest()"
      />
      <span class="flex">
        <tippy
          interactive
          trigger="click"
          theme="popover"
          :on-shown="() => sendTippyActions.focus()"
        >
          <HoppButtonPrimary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('app.options')"
            :icon="IconChevronDown"
            filled
            class="rounded-l-none"
          />
          <template #content="{ hide }">
            <div
              ref="sendTippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.c="curl.$el.click()"
              @keyup.s="show.$el.click()"
              @keyup.delete="clearAll.$el.click()"
              @keyup.escape="hide()"
            >
              <HoppSmartItem
                ref="curl"
                :label="`${t('import.curl')}`"
                :icon="IconFileCode"
                :shortcut="['C']"
                @click="
                  () => {
                    showCurlImportModal = !showCurlImportModal
                    hide()
                  }
                "
              />
              <HoppSmartItem
                ref="show"
                :label="`${t('show.code')}`"
                :icon="IconCode2"
                :shortcut="['S']"
                @click="
                  () => {
                    showCodegenModal = !showCodegenModal
                    hide()
                  }
                "
              />
              <HoppSmartItem
                ref="clearAll"
                :label="`${t('action.clear_all')}`"
                :icon="IconRotateCCW"
                :shortcut="['⌫']"
                @click="
                  () => {
                    clearContent()
                    hide()
                  }
                "
              />
            </div>
          </template>
        </tippy>
      </span>
      <span class="ml-2 flex rounded border border-divider transition">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
          :title="`${t(
            'request.save'
          )} <kbd>${getSpecialKey()}</kbd><kbd>S</kbd>`"
          :label="COLUMN_LAYOUT ? `${t('request.save')}` : ''"
          filled
          :icon="IconSave"
          class="flex-1 rounded rounded-r-none"
          @click="saveRequest()"
        />
        <span class="flex">
          <tippy
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => saveTippyActions.focus()"
          >
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('app.options')"
              :icon="IconChevronDown"
              filled
              class="rounded rounded-l-none"
            />
            <template #content="{ hide }">
              <div
                ref="saveTippyActions"
                class="flex flex-col focus:outline-none"
                tabindex="0"
                @keyup.escape="hide()"
              >
                <input
                  id="request-name"
                  v-model="tab.document.request.name"
                  :placeholder="`${t('request.name')}`"
                  name="request-name"
                  type="text"
                  autocomplete="off"
                  class="input mb-2 !bg-primaryContrast"
                  @keyup.enter="hide()"
                />
                <HoppSmartItem
                  ref="saveRequestAction"
                  :label="`${t('request.save_as')}`"
                  :icon="IconFolderPlus"
                  @click="
                    () => {
                      showSaveRequestModal = true
                      hide()
                    }
                  "
                />
                <hr />
                <HoppSmartItem
                  ref="copyRequestAction"
                  :label="t('request.share_request')"
                  :icon="IconShare2"
                  :loading="fetchingShareLink"
                  @click="
                    () => {
                      shareRequest()
                      hide()
                    }
                  "
                />
              </div>
            </template>
          </tippy>
        </span>
      </span>
    </div>
    <HttpImportCurl
      :text="curlText"
      :show="showCurlImportModal"
      @hide-modal="showCurlImportModal = false"
    />
    <HttpCodegenModal
      v-if="showCodegenModal"
      :show="showCodegenModal"
      @hide-modal="showCodegenModal = false"
    />
    <CollectionsSaveRequest
      v-if="showSaveRequestModal"
      mode="rest"
      :show="showSaveRequestModal"
      :request="saveAsRequest"
      @hide-modal="showSaveRequestModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useSetting } from "@composables/settings"
import { useReadonlyStream, useStreamSubscriber } from "@composables/stream"
import { useToast } from "@composables/toast"
import { useVModel } from "@vueuse/core"
import { watchDebounced } from "@vueuse/core"
import * as E from "fp-ts/Either"
import { computed, ref, onUnmounted, watch } from "vue"
import { defineActionHandler, invokeAction } from "~/helpers/actions"
import { runMutation } from "~/helpers/backend/GQLClient"
import { UpdateRequestDocument } from "~/helpers/backend/graphql"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { runRESTRequest$ } from "~/helpers/RequestRunner"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { editRESTRequest } from "~/newstore/collections"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconCode2 from "~icons/lucide/code-2"
import IconFileCode from "~icons/lucide/file-code"
import IconFolderPlus from "~icons/lucide/folder-plus"
import IconRotateCCW from "~icons/lucide/rotate-ccw"
import IconSave from "~icons/lucide/save"
import IconShare2 from "~icons/lucide/share-2"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { RESTHistoryEntry, restHistory$ } from "~/newstore/history"
import { platform } from "~/platform"
import { HoppRESTRequest } from "@hoppscotch/data"
import { useService } from "dioc/vue"
import { InspectionService } from "~/services/inspection"
import { HoppTab } from "~/services/tab"
import { HoppRequestDocument } from "~/helpers/rest/document"
import { RESTTabService } from "~/services/tab/rest"
import { getMethodLabelColor } from "~/helpers/rest/labelColoring"
import { WorkspaceService } from "~/services/workspace.service"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { isValidUser } from "~/helpers/isValidUser"
import { handleTokenValidation } from "~/helpers/handleTokenValidation"

const t = useI18n()
const interceptorService = useService(KernelInterceptorService)

const methods = [
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "CONNECT",
  "TRACE",
  "CUSTOM",
]

const toast = useToast()
const { subscribeToStream } = useStreamSubscriber()

const props = defineProps<{ modelValue: HoppTab<HoppRequestDocument> }>()
const emit = defineEmits(["update:modelValue"])

const tab = useVModel(props, "modelValue", emit)

const newEndpoint = computed(() => tab.value.document.request.endpoint)
const newMethod = computed(() => tab.value.document.request.method)

const curlText = ref("")
const loading = ref(false)

const isTabResponseLoading = computed(
  () => loading.value || tab.value.document.response?.type === "loading"
)

const showCurlImportModal = ref(false)
const showCodegenModal = ref(false)
const showSaveRequestModal = ref(false)

const methodTippyActions = ref<any | null>(null)
const sendTippyActions = ref<any | null>(null)
const saveTippyActions = ref<any | null>(null)
const curl = ref<any | null>(null)
const show = ref<any | null>(null)
const clearAll = ref<any | null>(null)
const copyRequestAction = ref<any | null>(null)
const saveRequestAction = ref<any | null>(null)
const urlInput = ref<{ focus: () => void } | null>(null)

const history = useReadonlyStream<RESTHistoryEntry[]>(restHistory$, [])

const userHistories = computed(() =>
  history.value.map((h) => h.request.endpoint).slice(0, 10)
)

const inspectionService = useService(InspectionService)
const tabs = useService(RESTTabService)
const workspaceService = useService(WorkspaceService)

const newSendRequest = async () => {
  if (newEndpoint.value === "" || /^\s+$/.test(newEndpoint.value)) {
    toast.error(`${t("empty.endpoint")}`)
    return
  }
  ensureMethodInEndpoint()

  tab.value.document.response = {
    type: "loading",
    req: tab.value.document.request,
  }

  // Clear test results to ensure loading state persists until new results arrive
  tab.value.document.testResults = null
  loading.value = true

  platform.analytics?.logEvent({
    type: "HOPP_REQUEST_RUN",
    platform: "rest",
    strategy: interceptorService.current.value!.id,
    workspaceType: workspaceService.currentWorkspace.value.type,
  })

  const [cancel, streamPromise] = runRESTRequest$(tab)
  const streamResult = await streamPromise

  tab.value.document.cancelFunction = cancel

  if (E.isRight(streamResult)) {
    subscribeToStream(
      streamResult.right,
      (responseState) => {
        if (loading.value) {
          updateRESTResponse(responseState)

          if (
            responseState.type === "network_fail" ||
            responseState.type === "extension_error" ||
            responseState.type === "interceptor_error"
          ) {
            tab.value.document.testResults = {
              description: "",
              expectResults: [],
              tests: [],
              envDiff: {
                global: { additions: [], deletions: [], updations: [] },
                selected: { additions: [], deletions: [], updations: [] },
              },
              scriptError: false,
              consoleEntries: [],
            }
          }
        }
      },
      (error: unknown) => {
        console.error("Stream error:", error)
        if (tab.value.document.testResults === null) {
          tab.value.document.testResults = {
            description: "",
            expectResults: [],
            tests: [],
            envDiff: {
              global: { additions: [], deletions: [], updations: [] },
              selected: { additions: [], deletions: [], updations: [] },
            },
            scriptError: false,
            consoleEntries: [],
          }
        }
      },
      () => {}
    )
  } else {
    toast.error(`${t("error.script_fail")}`)
    let error: Error
    if (typeof streamResult.left === "string") {
      error = { name: "RequestFailure", message: streamResult.left }
    } else {
      error = streamResult.left
    }
    updateRESTResponse({ type: "script_fail", error })
    tab.value.document.testResults = {
      description: "",
      expectResults: [],
      tests: [],
      envDiff: {
        global: { additions: [], deletions: [], updations: [] },
        selected: { additions: [], deletions: [], updations: [] },
      },
      scriptError: true,
      consoleEntries: [],
    }
  }
}

const ensureMethodInEndpoint = () => {
  const endpoint = newEndpoint.value.trim()
  tab.value.document.request.endpoint = endpoint
  if (!/^http[s]?:\/\//.test(endpoint) && !endpoint.startsWith("<<")) {
    const domain = endpoint.split(/[/:#?]+/)[0]
    if (domain === "localhost" || /([0-9]+\.)*[0-9]/.test(domain)) {
      tab.value.document.request.endpoint = "http://" + endpoint
    } else {
      tab.value.document.request.endpoint = "https://" + endpoint
    }
  }
}

const onPasteUrl = (e: { pastedValue: string; prevValue: string }) => {
  if (!e) return
  const pastedData = e.pastedValue
  if (isCURL(pastedData)) {
    showCurlImportModal.value = true
    curlText.value = pastedData
    tab.value.document.request.endpoint = e.prevValue
  }
}

function isCURL(curl: string) {
  return curl.includes("curl ")
}

// Intentionally captured (not reactive) — used in onUnmounted to check
// whether this specific tab was removed vs. just deactivated
const currentTabID = tabs.currentTabID.value

// Clear loading state when test results are set
watch(
  () => tab.value.document.testResults,
  (newTestResults, oldTestResults) => {
    if (oldTestResults === null && newTestResults !== null && loading.value) {
      loading.value = false
    }
  }
)

onUnmounted(() => {
  const isCurrentTabRemoved = !tabs
    .getActiveTabs()
    .value.some((t) => t.id === currentTabID)
  if (isCurrentTabRemoved) cancelRequest()
  // Clear any pending retry timer to avoid callbacks firing on stale refs
  if (retryTimer !== null) {
    clearTimeout(retryTimer)
    retryTimer = null
  }
})

const cancelRequest = () => {
  tab.value.document.cancelFunction?.()
  updateRESTResponse(null)

  if (tab.value.document.testResults === null) {
    tab.value.document.testResults = {
      description: "",
      expectResults: [],
      tests: [],
      envDiff: {
        global: { additions: [], deletions: [], updations: [] },
        selected: { additions: [], deletions: [], updations: [] },
      },
      scriptError: false,
      consoleEntries: [],
    }
  }
}

const updateMethod = (method: string) => {
  tab.value.document.request.method = method
}

const onSelectMethod = (e: Event | any) => {
  updateMethod(e.target.value)
}

const clearContent = () => {
  tab.value.document.request = getDefaultRESTRequest()
}

const updateRESTResponse = (response: HoppRESTResponse | null) => {
  tab.value.document.response = response
}

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

const fetchingShareLink = ref(false)

const shareRequest = () => {
  if (currentUser.value) {
    invokeAction("share.request", { request: tab.value.document.request })
  } else {
    invokeAction("modals.login.toggle")
  }
}

const cycleUpMethod = () => {
  const currentIndex = methods.indexOf(newMethod.value)
  if (currentIndex === -1) updateMethod("PATCH")
  else if (currentIndex === 0) updateMethod("CUSTOM")
  else updateMethod(methods[currentIndex - 1])
}

const cycleDownMethod = () => {
  const currentIndex = methods.indexOf(newMethod.value)
  if (currentIndex === -1) updateMethod("GET")
  else if (currentIndex === methods.length - 1) updateMethod("GET")
  else updateMethod(methods[currentIndex + 1])
}

// Tracks whether a team-collection async mutation is currently in-flight.
// Blocks ALL concurrent saves (both silent and manual) to prevent
// out-of-order mutations that could overwrite newer content with older snapshots.
const saveInProgress = ref(false)

// Separate ref for the "Save As" modal request
const saveAsRequest = ref<HoppRESTRequest | null>(null)

// Retry state for failed saves where content hasn't changed.
// Uses exponential backoff: 2s → 4s → 8s, max 3 attempts.
// Reset on any successful save or when new user edits arrive (debounce watcher).
const MAX_RETRY_ATTEMPTS = 3
const BASE_RETRY_DELAY_MS = 2000
let retryCount = 0
let retryTimer: ReturnType<typeof setTimeout> | null = null

const scheduleRetry = (tabSnapshot: HoppTab<HoppRequestDocument>) => {
  if (retryCount >= MAX_RETRY_ATTEMPTS) return
  if (retryTimer !== null) clearTimeout(retryTimer)
  const delay = BASE_RETRY_DELAY_MS * Math.pow(2, retryCount)
  retryCount++
  retryTimer = setTimeout(() => {
    retryTimer = null
    // Guard against retries for tabs that have been removed from the service.
    const stillExists = tabs
      .getActiveTabs()
      .value.some((t) => t.id === tabSnapshot.id)
    if (
      !stillExists ||
      !tabSnapshot.document.isDirty ||
      !tabSnapshot.document.saveContext
    ) {
      return
    }

    saveRequest({ silent: true })
  }, delay)
}

const saveRequest = async (options?: { silent?: boolean }) => {
  const silent = options?.silent === true

  // Block ALL concurrent saves — both silent and manual — while a mutation
  // is in-flight. This prevents out-of-order updates where a manual save
  // races an auto-save and overwrites newer content with an older snapshot.
  if (saveInProgress.value) {
    if (!silent) {
      // For a manual save blocked by an in-flight mutation, poll until
      // the in-flight save completes then re-invoke so the user's intent
      // is never silently dropped.
      const waitAndRetry = () => {
        if (saveInProgress.value) setTimeout(waitAndRetry, 100)
        else saveRequest({ silent: false })
      }
      setTimeout(waitAndRetry, 100)
    }
    return
  }

  // For manual saves, only proceed if this is the active tab.
  // invokeAction fires all registered handlers — guard against non-active instances.
  if (!silent && tabs.currentActiveTab.value.id !== tab.value.id) return

  // Capture saveCtx before any await so we can verify it hasn't changed afterward
  const saveCtx = tab.value.document.saveContext

  if (!saveCtx) {
    if (!silent) showSaveRequestModal.value = true
    return
  }

  if (saveCtx.originLocation === "user-collection") {
    const req = tab.value.document.request
    try {
      if (saveCtx.requestIndex === undefined) {
        if (!silent) showSaveRequestModal.value = true
        return
      }
      editRESTRequest(saveCtx.folderPath, saveCtx.requestIndex, req)
      tab.value.document.isDirty = false
      retryCount = 0
      if (!silent) {
        platform.analytics?.logEvent({
          type: "HOPP_SAVE_REQUEST",
          platform: "rest",
          createdNow: false,
          workspaceType: "personal",
        })
        toast.success(`${t("request.saved")}`)
      }
    } catch (_e) {
      // saveContext is stale — clear it and re-prompt the user on next manual save
      tab.value.document.saveContext = undefined
      if (!silent) await saveRequest()
    }
  } else if (saveCtx.originLocation === "team-collection") {
    // Capture a direct reference BEFORE any await. This ref remains valid even
    // if the tab is closed while the network call is in-flight — unlike tab.value
    // which throws "Invalid tab id" after the tab is removed from the service.
    const tabSnapshot = tab.value

    // Set saveInProgress BEFORE the first await to close the race window
    // where a second debounced auto-save could slip through the guard above.
    saveInProgress.value = true

    // Hoisted above try so it's in scope for finally.
    // Empty string signals the mutation was never attempted (early return / auth fail).
    let requestSnapshot = ""

    try {
      // Auth pre-flight — avoids a wasted network round-trip when the session
      // is expired. Silent saves use a lightweight token check; manual saves
      // run the full token-validation flow.
      const tokenCheck = silent
        ? (await isValidUser()).valid
        : await handleTokenValidation()

      if (!tokenCheck) return

      // Re-verify saveContext after the async auth gap.
      // If a "Save As" ran during the auth check, the context points to a
      // different request — abort to avoid overwriting the wrong backend record.
      if (tabSnapshot.document.saveContext !== saveCtx) return

      if (!silent) {
        platform.analytics?.logEvent({
          type: "HOPP_SAVE_REQUEST",
          platform: "rest",
          createdNow: false,
          workspaceType: "team",
        })
      }

      // Snapshot the request before the mutation so we can detect edits
      // that arrive while the network call is in-flight.
      requestSnapshot = JSON.stringify(tabSnapshot.document.request)

      const result = await runMutation(UpdateRequestDocument, {
        requestID: saveCtx.requestID,
        data: {
          title: tabSnapshot.document.request.name,
          request: requestSnapshot,
        },
      })()

      if (E.isLeft(result)) {
        if (!silent) toast.error(`${t("profile.no_permission")}`)
        // Mutation reached the server but was rejected — only schedule a
        // backoff retry when the request snapshot hasn't diverged. If the
        // user edited during the in-flight mutation, the follow-up path in
        // finally will handle saving the newer content.
        if (
          requestSnapshot &&
          JSON.stringify(tabSnapshot.document.request) === requestSnapshot
        ) {
          scheduleRetry(tabSnapshot)
        }
      } else {
        // Only clear isDirty if no new edits arrived during the mutation.
        if (JSON.stringify(tabSnapshot.document.request) === requestSnapshot) {
          tabSnapshot.document.isDirty = false
          retryCount = 0
        }
        if (!silent) toast.success(`${t("request.saved")}`)
      }
    } catch (error) {
      if (!silent) {
        showSaveRequestModal.value = true
        toast.error(`${t("error.something_went_wrong")}`)
      }
      console.error(error)
      // Network or unexpected error — only schedule a backoff retry when
      // the request snapshot hasn't diverged. If edits arrived during the
      // failed mutation, the finally block will pick up and save the new
      // content instead of retrying the stale snapshot.
      if (
        requestSnapshot &&
        JSON.stringify(tabSnapshot.document.request) === requestSnapshot
      ) {
        scheduleRetry(tabSnapshot)
      }
    } finally {
      saveInProgress.value = false
      // Only trigger an immediate follow-up save if new content arrived
      // *during* the in-flight mutation (snapshot diverged).
      // requestSnapshot === "" means the mutation was never attempted —
      // no retry needed in that case.
      // Failure-driven retries are handled by scheduleRetry with backoff,
      // so we never hammer the endpoint on persistent errors.
      const newSnapshot = JSON.stringify(tabSnapshot.document.request)
      if (
        requestSnapshot &&
        tabSnapshot.document.isDirty &&
        tabSnapshot.document.saveContext &&
        newSnapshot !== requestSnapshot
      ) {
        const stillExists = tabs
          .getActiveTabs()
          .value.some((t) => t.id === tabSnapshot.id)
        if (stillExists) {
          saveRequest({ silent: true })
        }
      }
    }
  }
}

defineActionHandler("request.send-cancel", () => {
  if (!loading.value) newSendRequest()
  else cancelRequest()
})
defineActionHandler("request.reset", clearContent)
defineActionHandler("request.share-request", shareRequest)
defineActionHandler("request.method.next", cycleDownMethod)
defineActionHandler("request.method.prev", cycleUpMethod)
defineActionHandler("request-response.save", saveRequest)
defineActionHandler("request.save-as", (req) => {
  showSaveRequestModal.value = true
  if (req?.requestType === "rest" && req.request) {
    saveAsRequest.value = req.request
  }
})
defineActionHandler("request.method.get", () => updateMethod("GET"))
defineActionHandler("request.method.post", () => updateMethod("POST"))
defineActionHandler("request.method.put", () => updateMethod("PUT"))
defineActionHandler("request.method.delete", () => updateMethod("DELETE"))
defineActionHandler("request.method.head", () => updateMethod("HEAD"))
defineActionHandler("request.import-curl", () => {
  showCurlImportModal.value = true
})
defineActionHandler("request.show-code", () => {
  showCodegenModal.value = true
})
defineActionHandler("request.focus-url", () => {
  urlInput.value?.focus()
})

const isCustomMethod = computed(
  () =>
    tab.value.document.request.method === "CUSTOM" ||
    !methods.includes(newMethod.value)
)

const COLUMN_LAYOUT = useSetting("COLUMN_LAYOUT")
const AUTO_SAVE_REQUESTS = useSetting("AUTO_SAVE_REQUESTS")
const AUTO_SAVE_DELAY_MS = useSetting("AUTO_SAVE_DELAY_MS")

// Stop the watcher on unmount to prevent debounce callbacks firing on a
// stale/destroyed component instance.
const stopAutoSave = watchDebounced(
  () => tab.value.document.request,
  () => {
    try {
      // New user edit arrived — reset retry state so the fresh content gets a
      // full retry budget rather than inheriting an exhausted counter.
      retryCount = 0
      if (retryTimer !== null) {
        clearTimeout(retryTimer)
        retryTimer = null
      }

      const isDirty = tab.value.document.isDirty
      const saveCtx = tab.value.document.saveContext
      const autoSaveEnabled = AUTO_SAVE_REQUESTS.value

      if (
        !autoSaveEnabled ||
        !isDirty ||
        !saveCtx ||
        saveInProgress.value ||
        tab.value.document.type !== "request"
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
    debounce: computed(() =>
      Math.min(10000, Math.max(500, Number(AUTO_SAVE_DELAY_MS.value) || 2000))
    ),
  }
)

onUnmounted(() => {
  stopAutoSave()
})

const tabResults = inspectionService.getResultViewFor(tab.value.id)
</script>
