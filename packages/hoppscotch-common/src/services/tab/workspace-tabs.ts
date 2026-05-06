import { Container } from "dioc"
import { computed, ref, readonly, type Ref } from "vue"
import { cloneDeep } from "lodash-es"
import type { HoppGQLRequest, HoppRESTRequest } from "@hoppscotch/data"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { HoppRESTSaveContext, HoppTabDocument } from "~/helpers/rest/document"
import { getService } from "~/modules/dioc"
import { PersistenceService, STORE_KEYS } from "../persistence"
import type { Workspace } from "../workspace.service"
import { TabService } from "./tab"
import { HoppTab, PersistableTabState, ProtocolDrafts } from "."

export type { ProtocolDrafts }

/**
 * Tab service for the unified workspace tab system.
 *
 * Hosts both REST request tabs (`type: "request"`) and GraphQL request tabs
 * (`type: "gql-request"`) alongside other unified document types
 * (`example-response`, `test-runner`, ...). The standalone `/graphql` page
 * keeps its own `GQLTabService`; do not route unified flows through that.
 *
 * `attachedWorkspace` records the workspace these tabs belong to so future
 * features can scope/filter tabs per workspace. Today it is purely
 * informational — kept in sync with `WorkspaceService.currentWorkspace`.
 */
export class WorkspaceTabsService extends TabService<HoppTabDocument> {
  public static readonly ID = "WORKSPACE_TABS_SERVICE"

  // Workspace this tab service is attached to. Mirrors `WorkspaceService.currentWorkspace`.
  // Forward-looking: future tab features may scope tabs by workspace.
  private readonly _attachedWorkspace: Ref<Workspace> = ref<Workspace>({
    type: "personal",
  })
  public readonly attachedWorkspace = readonly(this._attachedWorkspace)

  // TODO: Moving this to `onServiceInit` breaks `persistableTabState`
  // Figure out how to fix this
  constructor(c: Container) {
    super(c)

    this.tabMap.set("test", {
      id: "test",
      document: {
        type: "request",
        request: getDefaultRESTRequest(),
        isDirty: false,
        optionTabPreference: "params",
      },
    })

    this.watchCurrentTabID()
  }

  /**
   * Attach the given workspace to this tab service. Called by the workspace
   * switcher whenever the current workspace changes.
   *
   * Semantics — IMPORTANT, fidelity is best-effort by design:
   * - **New tabs** created after this call are tagged with `workspace`.
   * - **Existing tabs WITH** an explicit `workspaceHandle` keep it (a tab
   *   created in workspace A doesn't silently rebrand when switching to B).
   * - **Existing tabs WITHOUT** a `workspaceHandle` (e.g. restored from
   *   persistence before any workspace was attached) get back-filled with
   *   `workspace`.
   *
   * `workspaceHandle` is intentionally NOT persisted: if the user reloads
   * with team-A tabs persisted, those tabs come back tagged with whatever
   * workspace is active at restore time — typically `personal` since
   * `WorkspaceService` doesn't currently persist `_currentWorkspace`.
   * Cross-workspace tab fidelity across cold boots is therefore
   * approximate. If full fidelity becomes a requirement, persist
   * `workspaceHandle` alongside the tab document and migrate the schema.
   */
  public attachToWorkspace(workspace: Workspace) {
    this._attachedWorkspace.value = workspace
    for (const id of this.tabMap.keys()) {
      const stored = this.tabMap.get(id)
      if (stored && !stored.workspaceHandle) {
        stored.workspaceHandle = workspace
      }
    }
  }

  /**
   * Override to tag newly-created tabs with the currently attached workspace.
   *
   * The assignment must go through the reactive proxy in `tabMap` (not the raw
   * `tab` reference returned by `super.createNewTab`) so Vue consumers reading
   * via `tabMap.get(id).workspaceHandle` actually see the change.
   */
  public override createNewTab(
    document: HoppTabDocument,
    switchToIt = true
  ): HoppTab<HoppTabDocument> {
    const tab = super.createNewTab(document, switchToIt)
    const stored = this.tabMap.get(tab.id)
    if (stored) stored.workspaceHandle = this._attachedWorkspace.value
    return tab
  }

  /**
   * Override to tag restored tabs with the currently attached workspace.
   * `workspaceHandle` is intentionally not persisted — fidelity across boots
   * is best-effort and tabs adopt whatever workspace is active at restore time.
   *
   * Iterates via `tabMap` so writes go through the reactive proxy.
   */
  public override loadTabsFromPersistedState(
    data: PersistableTabState<HoppTabDocument>
  ): void {
    super.loadTabsFromPersistedState(data)

    const workspace = this._attachedWorkspace.value
    for (const id of this.tabMap.keys()) {
      const stored = this.tabMap.get(id)
      if (stored) stored.workspaceHandle = workspace
    }
  }

  /**
   * Read the protocol drafts for a given tab. Returns `undefined` if no drafts
   * have been stored for the tab yet. Drafts live on the tab object, so they
   * automatically survive `closeTab` → `reopenClosedTab` and are garbage-
   * collected when the tab is permanently destroyed.
   */
  public getProtocolDraft(tabID: string): ProtocolDrafts | undefined {
    return this.tabMap.get(tabID)?.protocolDrafts
  }

  /**
   * Snapshot a request as the draft for one protocol. Stored as a deep clone
   * so subsequent mutations to the original request don't leak into the draft.
   */
  public setProtocolDraft(
    tabID: string,
    kind: "rest",
    request: HoppRESTRequest
  ): void
  public setProtocolDraft(
    tabID: string,
    kind: "gql",
    request: HoppGQLRequest
  ): void
  public setProtocolDraft(
    tabID: string,
    kind: "rest" | "gql",
    request: HoppRESTRequest | HoppGQLRequest
  ): void {
    const tab = this.tabMap.get(tabID)
    if (!tab) return
    const drafts = tab.protocolDrafts ?? {}
    if (kind === "rest") {
      drafts.rest = cloneDeep(request as HoppRESTRequest)
    } else {
      drafts.gql = cloneDeep(request as HoppGQLRequest)
    }
    tab.protocolDrafts = drafts
  }

  /**
   * Drop both protocol drafts for a tab. NOT called automatically on save —
   * round-trip preservation is the point of drafts, so successful saves leave
   * the opposite-protocol draft intact. Intended for an explicit user action
   * (e.g. a future "reset to defaults" affordance) or programmatic cleanup.
   */
  public clearProtocolDrafts(tabID: string): void {
    const tab = this.tabMap.get(tabID)
    if (tab) tab.protocolDrafts = undefined
  }

  // override persistableTabState to remove response from the document
  public override persistableTabState = computed(() => ({
    lastActiveTabID: this.currentTabID.value,
    orderedDocs: this.tabOrdering.value.map((tabID) => {
      const tab = this.tabMap.get(tabID)! // tab ordering is guaranteed to have value for this key

      if (tab.document.type === "example-response") {
        return {
          tabID: tab.id,
          doc: tab.document,
        }
      }

      if (tab.document.type === "test-runner") {
        return {
          tabID: tab.id,
          doc: {
            ...tab.document,
            request: null,
            response: null,
          },
        }
      }

      if (tab.document.type === "gql-request") {
        return {
          tabID: tab.id,
          doc: { ...tab.document, response: null },
        }
      }

      return {
        tabID: tab.id,
        doc: {
          ...tab.document,
          response: null,
        },
      }
    }),
  }))

  protected async loadPersistedState(): Promise<PersistableTabState<HoppTabDocument> | null> {
    const persistenceService = getService(PersistenceService)
    const savedState = await persistenceService.getNullable<
      PersistableTabState<HoppTabDocument>
    >(STORE_KEYS.REST_TABS)
    return savedState
  }

  public getTabRefWithSaveContext(ctx: HoppRESTSaveContext) {
    for (const tab of this.tabMap.values()) {
      // For `team-collection` request id can be considered unique
      if (tab.document.type === "test-runner") continue

      if (ctx?.originLocation === "team-collection") {
        if (
          tab.document.saveContext?.originLocation === "team-collection" &&
          tab.document.saveContext.requestID === ctx.requestID &&
          tab.document.saveContext.exampleID === ctx.exampleID
        ) {
          return this.getTabRef(tab.id)
        }
      } else if (
        tab.document.saveContext?.originLocation === "user-collection" &&
        tab.document.saveContext.folderPath === ctx?.folderPath &&
        tab.document.saveContext.requestIndex === ctx?.requestIndex &&
        tab.document.saveContext.exampleID === ctx?.exampleID &&
        (ctx?.requestRefID != null
          ? tab.document.saveContext.requestRefID === ctx.requestRefID
          : true)
      ) {
        return this.getTabRef(tab.id)
      }
    }

    return null
  }

  public getDirtyTabsCount() {
    let count = 0

    for (const tab of this.tabMap.values()) {
      if (tab.document.isDirty) count++
    }

    return count
  }
}
