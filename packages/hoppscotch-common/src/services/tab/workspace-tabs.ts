import { Container } from "dioc"
import { computed, ref, readonly, type Ref } from "vue"
import { cloneDeep } from "lodash-es"
import type { HoppGQLRequest, HoppRESTRequest } from "@hoppscotch/data"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { HoppTabSaveContext, HoppTabDocument } from "~/helpers/tab/document"
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

    // Rehydrate opposite-protocol shadow drafts (the base loader only
    // restores {tabID, doc})
    for (const entry of data?.orderedDocs ?? []) {
      if (entry.protocolDrafts) {
        const stored = this.tabMap.get(entry.tabID)
        if (stored) stored.protocolDrafts = entry.protocolDrafts
      }
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
   * Snapshot a request, plus the tab's dirty flag, as the draft for one
   * protocol. Stored as a deep clone so subsequent mutations to the original
   * request don't leak into the draft.
   */
  public setProtocolDraft(
    tabID: string,
    kind: "rest",
    request: HoppRESTRequest,
    isDirty: boolean
  ): void
  public setProtocolDraft(
    tabID: string,
    kind: "gql",
    request: HoppGQLRequest,
    isDirty: boolean
  ): void
  public setProtocolDraft(
    tabID: string,
    kind: "rest" | "gql",
    request: HoppRESTRequest | HoppGQLRequest,
    isDirty: boolean
  ): void {
    const tab = this.tabMap.get(tabID)
    if (!tab) return
    const drafts = tab.protocolDrafts ?? {}
    if (kind === "rest") {
      drafts.rest = { request: cloneDeep(request as HoppRESTRequest), isDirty }
    } else {
      drafts.gql = { request: cloneDeep(request as HoppGQLRequest), isDirty }
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

      // Persist the opposite-protocol shadow draft (if any) so the unsaved
      // pre-switch request survives a page refresh like the document does
      const protocolDrafts = tab.protocolDrafts

      if (
        tab.document.type === "example-response" ||
        tab.document.type === "gql-example-response"
      ) {
        return {
          tabID: tab.id,
          doc: tab.document,
          protocolDrafts,
        }
      }

      if (tab.document.type === "test-runner") {
        // Run results are deliberately not persisted: the collection schema
        // strips `response`/`testResults`/counters so restored rows come back
        // empty anyway, and per-iteration trees can blow the localStorage
        // quota. The whole run is dropped; the tab restores ready to run.
        return {
          tabID: tab.id,
          doc: {
            ...tab.document,
            // The debounced persist fires during a run, so a tab killed
            // mid-run would restore as "running". Normalize to "stopped",
            // never "idle" — an idle runner tab auto-runs on mount.
            status:
              tab.document.status === "running"
                ? ("stopped" as const)
                : tab.document.status,
            request: null,
            response: null,
            // Drop the run outright rather than half of it: an iteration
            // list without its result trees restores a summary over an
            // empty table.
            resultCollection: undefined,
            iterationResults: undefined,
            selectedIteration: 0,
            // Meaningless without the result rows it points into.
            selectedRequestPath: undefined,
            testRunnerMeta: {
              totalRequests: 0,
              completedRequests: 0,
              totalTests: 0,
              passedTests: 0,
              failedTests: 0,
              totalTime: 0,
            },
          },
          protocolDrafts,
        }
      }

      if (tab.document.type === "gql-request") {
        return {
          tabID: tab.id,
          doc: {
            ...tab.document,
            response: null,
            // see the sentinel note on the request-doc branch below
            testResults:
              tab.document.testResults === null
                ? undefined
                : tab.document.testResults,
          },
          protocolDrafts,
        }
      }

      // REST + GQL request docs
      return {
        tabID: tab.id,
        doc: {
          ...tab.document,
          response: null,
          // `null` is the run-in-flight sentinel — persisting it verbatim
          // would restore into a permanent loading state with no run to
          // ever clear it
          testResults:
            tab.document.testResults === null
              ? undefined
              : tab.document.testResults,
        },
        protocolDrafts,
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

  private matchesSaveContext(
    tab: HoppTab<HoppTabDocument>,
    ctx: HoppTabSaveContext
  ) {
    if (tab.document.type === "test-runner") return false

    // For `team-collection` request id can be considered unique
    if (ctx?.originLocation === "team-collection") {
      return (
        tab.document.saveContext?.originLocation === "team-collection" &&
        tab.document.saveContext.requestID === ctx.requestID &&
        tab.document.saveContext.exampleID === ctx.exampleID
      )
    }

    const tabCtx = tab.document.saveContext

    if (tabCtx?.originLocation !== "user-collection") return false
    if (tabCtx.exampleID !== ctx?.exampleID) return false

    // A tab whose context predates ref ids is still identified by the request
    // it holds. Truthiness, not a null check: some creation paths store `""`,
    // which is not an identity.
    const tabRefID =
      tabCtx.requestRefID ||
      (tab.document.type === "request"
        ? tab.document.request._ref_id || tab.document.request.id
        : undefined)

    // A lookup that names its request is authoritative — a tab with a
    // different or missing identity is not that request, even at matching
    // coordinates, which may have been reused since the tab was bound.
    if (ctx?.requestRefID) {
      return tabRefID === ctx.requestRefID
    }

    // Position is all that's left when the lookup carries no identity
    return (
      tabCtx.folderPath === ctx?.folderPath &&
      tabCtx.requestIndex === ctx?.requestIndex
    )
  }

  /**
   * Returns every tab matching the save context — a request can be open in
   * more than one tab, and a write-back that skips one leaves it holding
   * stale content that its next save persists.
   */
  public getTabsRefWithSaveContext(ctx: HoppTabSaveContext) {
    return Array.from(this.tabMap.values())
      .filter((tab) => this.matchesSaveContext(tab, ctx))
      .map((tab) => this.getTabRef(tab.id))
  }

  public getTabRefWithSaveContext(ctx: HoppTabSaveContext) {
    for (const tab of this.tabMap.values()) {
      if (this.matchesSaveContext(tab, ctx)) return this.getTabRef(tab.id)
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
