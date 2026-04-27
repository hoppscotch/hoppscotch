import { ref } from "vue"
import { Service } from "dioc"
import { RESTTabService } from "./tab/rest"
import { GQLTabService } from "./tab/graphql"
import { platform } from "~/platform"
import { useToast } from "@composables/toast"
import { getI18n } from "~/modules/i18n"
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

  public saveInProgress = ref(false)

  private retryData = new Map<
    string,
    { count: number; timer: ReturnType<typeof setTimeout> | null }
  >()

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
    const t = getI18n()
    const toast = useToast()

    // Block ALL concurrent saves — both silent and manual — while a mutation
    // is in-flight. This prevents out-of-order updates where a manual save
    // races an auto-save and overwrites newer content with an older snapshot.
    if (this.saveInProgress.value) {
      if (!silent) {
        // For a manual save blocked by an in-flight mutation, poll until
        // the in-flight save completes then re-invoke so the user's intent
        // is never silently dropped.
        const waitAndRetry = () => {
          if (this.saveInProgress.value) setTimeout(waitAndRetry, 100)
          else
            this.saveRequest(tab, {
              silent: false,
              onTriggerModal: options?.onTriggerModal,
            })
        }
        setTimeout(waitAndRetry, 100)
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
      this.saveInProgress.value = true

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
          if (!silent) toast.error(`${t("profile.no_permission")}`)
          if (
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
        console.error(error)
        if (
          requestSnapshot &&
          JSON.stringify(tab.document.request) === requestSnapshot
        ) {
          this.scheduleRetry(tab)
        }
      } finally {
        this.saveInProgress.value = false
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
      tabRetryData.timer = null
    }
  }
}
