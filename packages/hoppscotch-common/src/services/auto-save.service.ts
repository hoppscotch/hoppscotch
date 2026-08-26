import { computed, effectScope, ref, watch } from "vue"
import { watchDebounced } from "@vueuse/core"
import { Service } from "dioc"
import { RESTTabService } from "./tab/rest"
import { GQLTabService } from "./tab/graphql"
import { platform } from "~/platform"
import { useToast } from "@composables/toast"
import { getI18n } from "~/modules/i18n"
import { useSettingStatic } from "@composables/settings"
import { isValidUser } from "~/helpers/isValidUser"
import { handleTokenValidation } from "~/helpers/handleTokenValidation"
import { editRESTRequest, editGraphqlRequest } from "~/newstore/collections"
import { updateTeamRequest } from "~/helpers/backend/mutations/TeamRequest"
import { runMutation } from "~/helpers/backend/GQLClient"
import { UpdateRequestDocument } from "~/helpers/backend/graphql"
import * as E from "fp-ts/Either"
import { HoppTab } from "./tab"
import { HoppRequestDocument } from "~/helpers/rest/document"
import { HoppGQLDocument } from "~/helpers/graphql/document"

const MAX_RETRY_ATTEMPTS = 3
const BASE_RETRY_DELAY_MS = 2000

type TabDocument = HoppRequestDocument | HoppGQLDocument

export class AutoSaveService extends Service {
  public static readonly ID = "AUTO_SAVE_SERVICE"

  private restTabs = this.bind(RESTTabService)
  private gqlTabs = this.bind(GQLTabService)

  // Detached scope — survives component unmounts so watchers keep running
  // even when the user switches tabs and the component tree is torn down.
  private scope = effectScope(true)

  // Per-tab save-in-progress tracking instead of a single global flag.
  private saveInProgressMap = new Map<string, boolean>()

  // Keep a public reactive ref for backwards-compatible watcher guards in
  // components. It reflects whether *any* tab save is in progress.
  public saveInProgress = ref(false)

  private retryData = new Map<
    string,
    { count: number; timer: ReturnType<typeof setTimeout> | null }
  >()

  // Per-tab poll timers for manual saves that arrive while a mutation is
  // in-flight. Ensures at most one outstanding poll per tab.
  private manualSavePollTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >()

  // Per-tab auto-save watcher cleanup functions.
  private tabWatcherCleanups = new Map<string, () => void>()

  // Settings refs — useSettingStatic works outside component setup context.
  // The stopper functions are held so we can unsubscribe if the service is
  // ever torn down (not expected in practice, but correct).
  private autoSaveSettingCleanups: (() => void)[] = []

  override onServiceInit() {
    this.scope.run(() => {
      this.observeTabs("rest")
      this.observeTabs("gql")
    })
  }

  /**
   * Observe all active tabs of the given kind and set up / tear down
   * per-tab debounced auto-save watchers as tabs are added or removed.
   */
  private observeTabs(kind: "rest" | "gql") {
    const tabService = kind === "rest" ? this.restTabs : this.gqlTabs
    const activeTabs = tabService.getActiveTabs()

    // useSettingStatic is safe outside setup — it returns [ref, stopper]
    const [autoSaveEnabled, stopEnabled] =
      useSettingStatic("AUTO_SAVE_REQUESTS")
    const [autoSaveDelayMs, stopDelay] = useSettingStatic("AUTO_SAVE_DELAY_MS")
    this.autoSaveSettingCleanups.push(stopEnabled, stopDelay)

    const debounceMs = computed(() =>
      Math.min(10000, Math.max(500, Number(autoSaveDelayMs.value) || 2000))
    )

    watch(
      activeTabs,
      (tabs) => {
        const activeIds = new Set(tabs.map((tab) => `${kind}:${tab.id}`))

        // Set up watchers for newly-added tabs
        for (const tab of tabs) {
          const watcherKey = `${kind}:${tab.id}`
          if (this.tabWatcherCleanups.has(watcherKey)) continue

          // Create the per-tab watcher inside this.scope so it survives
          // any component unmounts. scope.run() is needed here because
          // this callback fires asynchronously (from watch), outside the
          // original scope.run() in onServiceInit.
          this.scope.run(() => {
            const stop = watchDebounced(
              () => tab.document.request,
              () => {
                try {
                  // New user edit — reset retry budget
                  this.resetRetryCount(tab.id)

                  const isDirty = tab.document.isDirty
                  const saveCtx = tab.document.saveContext

                  if (!autoSaveEnabled.value || !isDirty || !saveCtx) {
                    return
                  }

                  this.saveRequest(tab, { silent: true })
                } catch {
                  // Tab was removed between the watcher firing and
                  // execution — safe to ignore.
                }
              },
              { deep: true, debounce: debounceMs }
            )
            this.tabWatcherCleanups.set(watcherKey, stop)
          })
        }

        // Tear down watchers for removed tabs
        for (const [watcherKey, stop] of this.tabWatcherCleanups) {
          if (watcherKey.startsWith(`${kind}:`) && !activeIds.has(watcherKey)) {
            stop()
            this.tabWatcherCleanups.delete(watcherKey)

            // Also clean up any retry / poll timers for the removed tab
            const tabId = watcherKey.slice(kind.length + 1)
            this.clearRetryTimer(tabId)
          }
        }
      },
      { immediate: true }
    )
  }

  private isSaveInProgress(tabId: string): boolean {
    return this.saveInProgressMap.get(tabId) ?? false
  }

  private setSaveInProgress(tabId: string, value: boolean) {
    this.saveInProgressMap.set(tabId, value)
    // Keep the global reactive ref in sync for watcher guards in components
    this.saveInProgress.value = [...this.saveInProgressMap.values()].some(
      Boolean
    )
  }

  private getTabService(doc: TabDocument) {
    if ("type" in doc && doc.type === "request") {
      return this.restTabs
    }
    return this.gqlTabs
  }

  public saveRequest = async (
    tab: HoppTab<TabDocument>,
    options?: { silent?: boolean; onTriggerModal?: () => void }
  ) => {
    const silent = options?.silent ?? false
    // getI18n() bypasses the Vue setup-context requirement (see modules/i18n)
    const t = getI18n()
    // useToast() is safe outside setup: it returns a module-level singleton
    // created at plugin install time, not a composable that relies on inject()
    const toast = useToast()

    // Block concurrent saves for THIS tab only. Saves on other tabs are
    // unaffected (fixes the global-flag cross-tab blocking bug).
    if (this.isSaveInProgress(tab.id)) {
      if (!silent) {
        // Track the poll timer per-tab so we can cancel it on
        // unmount and guarantee at most one outstanding poll per tab.
        const existingTimer = this.manualSavePollTimers.get(tab.id)
        if (existingTimer) clearTimeout(existingTimer)

        const waitAndRetry = () => {
          if (this.isSaveInProgress(tab.id)) {
            this.manualSavePollTimers.set(tab.id, setTimeout(waitAndRetry, 100))
          } else {
            this.manualSavePollTimers.delete(tab.id)
            this.saveRequest(tab, {
              silent: false,
              onTriggerModal: options?.onTriggerModal,
            })
          }
        }
        this.manualSavePollTimers.set(tab.id, setTimeout(waitAndRetry, 100))
      }
      return
    }

    const tabs = this.getTabService(tab.document)

    // For manual saves, only proceed if this is the active tab.
    if (!silent && tabs.currentActiveTab.value.id !== tab.id) return

    const saveCtx = tab.document.saveContext

    if (!saveCtx) {
      if (!silent) options?.onTriggerModal?.()
      return
    }

    if (saveCtx.originLocation === "user-collection") {
      try {
        if ("type" in tab.document && tab.document.type === "request") {
          const doc = tab.document
          const ctx = saveCtx as any // avoid precise union type mismatch inside branching
          if (ctx.requestIndex === undefined) {
            if (!silent) options?.onTriggerModal?.()
            return
          }
          editRESTRequest(ctx.folderPath, ctx.requestIndex, doc.request)
        } else {
          const doc = tab.document as HoppGQLDocument
          const ctx = saveCtx as any
          editGraphqlRequest(ctx.folderPath, ctx.requestIndex, doc.request)
        }

        tab.document.isDirty = false
        this.resetRetryCount(tab.id)

        if (!silent) {
          platform.analytics?.logEvent({
            type: "HOPP_SAVE_REQUEST",
            platform:
              "type" in tab.document && tab.document.type === "request"
                ? "rest"
                : "gql",
            createdNow: false,
            workspaceType: "personal",
          })
          toast.success(`${t("request.saved")}`)
        }
      } catch (_e) {
        // saveContext is stale — clear it and re-prompt the user on next manual save
        tab.document.saveContext = undefined
        if (!silent)
          await this.saveRequest(tab, {
            onTriggerModal: options?.onTriggerModal,
          })
      }
    } else if (saveCtx.originLocation === "team-collection") {
      this.setSaveInProgress(tab.id, true)

      let requestSnapshot = ""

      try {
        const tokenCheck = silent
          ? (await isValidUser()).valid
          : await handleTokenValidation()

        if (!tokenCheck) return

        // Verify saveContext hasn't changed during auth check
        if (tab.document.saveContext !== saveCtx) return

        if (!silent) {
          platform.analytics?.logEvent({
            type: "HOPP_SAVE_REQUEST",
            platform:
              "type" in tab.document && tab.document.type === "request"
                ? "rest"
                : "gql",
            createdNow: false,
            workspaceType: "team",
          })
        }

        requestSnapshot = JSON.stringify(tab.document.request)

        const result = await (
          "type" in tab.document && tab.document.type === "request"
            ? runMutation(UpdateRequestDocument, {
                requestID: saveCtx.requestID,
                data: {
                  title: tab.document.request.name,
                  request: requestSnapshot,
                },
              })
            : updateTeamRequest(saveCtx.requestID, {
                request: requestSnapshot,
                title: tab.document.request.name,
              })
        )()

        if (E.isLeft(result)) {
          // Distinguish transient network errors from permanent permission
          // errors so the user sees an appropriate message and we only retry
          // on errors that are likely to recover.
          const leftError = result.left as any
          const isNetworkError = leftError?.type === "network_error"
          const gqlMessage: string =
            leftError?.type === "gql_error"
              ? typeof leftError.error === "string"
                ? leftError.error
                : ((leftError.error?.message as string | undefined) ?? "")
              : ""
          const isPermissionError =
            !isNetworkError &&
            /permission|unauthorized|forbidden|access denied|not allowed/i.test(
              gqlMessage
            )

          if (!silent) {
            toast.error(
              `${t(
                isPermissionError
                  ? "profile.no_permission"
                  : "error.something_went_wrong"
              )}`
            )
          }

          // Only schedule retries for transient (network) errors.
          // Permanent errors like insufficient permissions will never recover
          // and retrying them would generate unnecessary background traffic.
          if (
            isNetworkError &&
            requestSnapshot &&
            JSON.stringify(tab.document.request) === requestSnapshot
          ) {
            this.scheduleRetry(tab)
          }
        } else {
          if (JSON.stringify(tab.document.request) === requestSnapshot) {
            tab.document.isDirty = false
            this.resetRetryCount(tab.id)
          }
          if (!silent) toast.success(`${t("request.saved")}`)
        }
      } catch (error) {
        if (!silent) {
          options?.onTriggerModal?.()
          toast.error(`${t("error.something_went_wrong")}`)
        }
        // Only log errors for manual saves; silent auto-save failures
        // should not spam the console on every retry attempt.
        if (!silent) console.error(error)
        if (
          requestSnapshot &&
          JSON.stringify(tab.document.request) === requestSnapshot
        ) {
          this.scheduleRetry(tab)
        }
      } finally {
        this.setSaveInProgress(tab.id, false)
        const newSnapshot = JSON.stringify(tab.document.request)
        if (
          requestSnapshot &&
          tab.document.isDirty &&
          tab.document.saveContext &&
          newSnapshot !== requestSnapshot
        ) {
          const stillExists = tabs
            .getActiveTabs()
            .value.some((t) => t.id === tab.id)
          if (stillExists) {
            this.saveRequest(tab, { silent: true })
          }
        }
      }
    }
  }

  public scheduleRetry = (tabSnapshot: HoppTab<TabDocument>) => {
    const tabRetryData = this.retryData.get(tabSnapshot.id) ?? {
      count: 0,
      timer: null,
    }

    if (tabRetryData.count >= MAX_RETRY_ATTEMPTS) return

    if (tabRetryData.timer !== null) clearTimeout(tabRetryData.timer)

    const delay = BASE_RETRY_DELAY_MS * Math.pow(2, tabRetryData.count)
    tabRetryData.count++

    tabRetryData.timer = setTimeout(() => {
      tabRetryData.timer = null
      const tabs = this.getTabService(tabSnapshot.document)
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

      this.saveRequest(tabSnapshot, { silent: true })
    }, delay)

    this.retryData.set(tabSnapshot.id, tabRetryData)
  }

  public resetRetryCount = (tabId: string) => {
    const tabRetryData = this.retryData.get(tabId)
    if (tabRetryData) {
      tabRetryData.count = 0
      if (tabRetryData.timer) {
        clearTimeout(tabRetryData.timer)
        tabRetryData.timer = null
      }
    }
  }

  public clearRetryTimer = (tabId: string) => {
    const tabRetryData = this.retryData.get(tabId)
    if (tabRetryData?.timer) {
      clearTimeout(tabRetryData.timer)
    }
    // Remove the entry entirely to prevent tombstone accumulation over long
    // sessions. scheduleRetry re-creates it on demand.
    this.retryData.delete(tabId)

    // Also cancel any outstanding manual-save poll timer for this tab
    const pollTimer = this.manualSavePollTimers.get(tabId)
    if (pollTimer !== undefined) {
      clearTimeout(pollTimer)
      this.manualSavePollTimers.delete(tabId)
    }
  }
}
