import { isEqual } from "lodash-es"
import { getDefaultGQLRequest } from "~/helpers/graphql/default"
import { HoppGQLDocument, HoppGQLSaveContext } from "~/helpers/graphql/document"
import { TabService } from "./tab"
import { computed, watch } from "vue"
import { Container } from "dioc"
import { getService } from "~/modules/dioc"
import { PersistenceService, STORE_KEYS } from "../persistence"
import { WorkspaceService, Workspace } from "../workspace.service"
import { PersistableTabState } from "."
import { getWorkspaceScopedTabKey } from "./workspace-aware-tab"

export class GQLTabService extends TabService<HoppGQLDocument> {
  public static readonly ID = "GQL_TAB_SERVICE"

  private workspaceService?: WorkspaceService
  private currentWorkspaceKey?: string
  private isWorkspaceAware = false

  // TODO: Moving this to `onServiceInit` breaks `persistableTabState`
  // Figure out how to fix this
  constructor(c: Container) {
    super()

    this.tabMap.set("test", {
      id: "test",
      document: {
        request: getDefaultGQLRequest(),
        isDirty: false,
        optionTabPreference: "query",
        cursorPosition: 0,
      },
    })

    this.watchCurrentTabID()
  }

  onServiceInit() {
    // Initialize workspace awareness
    this.workspaceService = getService(WorkspaceService)
    this.setupWorkspaceAwareness()
  }

  private setupWorkspaceAwareness() {
    if (!this.workspaceService || this.isWorkspaceAware) return
    this.isWorkspaceAware = true

    // Watch workspace changes and handle tab persistence
    watch(
      () => this.workspaceService!.currentWorkspace.value,
      async (newWorkspace: Workspace, oldWorkspace?: Workspace) => {
        // Save tabs for the old workspace (if any)
        if (oldWorkspace && this.currentWorkspaceKey) {
          await this.saveTabsForWorkspace(oldWorkspace)
        }

        // Load tabs for the new workspace
        await this.loadTabsForWorkspace(newWorkspace)
      },
      { immediate: true }
    )
  }

  private async saveTabsForWorkspace(workspace: Workspace): Promise<void> {
    const key = getWorkspaceScopedTabKey(STORE_KEYS.GQL_TABS, workspace)
    const currentState = this.persistableTabState.value
    
    try {
      const persistenceService = getService(PersistenceService)
      // Save using custom key - we'll need to update PersistenceService to support this
      await persistenceService.hoppLocalConfigStorage.setItem(
        `hopp:${key}`, 
        JSON.stringify(currentState)
      )
    } catch (error) {
      console.error(`Failed to save GraphQL tabs for workspace:`, error)
    }
  }

  private async loadTabsForWorkspace(workspace: Workspace): Promise<void> {
    const key = getWorkspaceScopedTabKey(STORE_KEYS.GQL_TABS, workspace)
    this.currentWorkspaceKey = key

    try {
      const persistenceService = getService(PersistenceService)
      const savedData = persistenceService.hoppLocalConfigStorage.getItem(`hopp:${key}`)
      
      if (savedData) {
        // Load the saved tabs
        const savedState: PersistableTabState<HoppGQLDocument> = JSON.parse(savedData)
        this.loadTabsFromPersistedState(savedState)
      } else if (workspace.type === "personal") {
        // For personal workspace, try to load legacy global state
        const legacyState = await this.loadLegacyTabState()
        if (legacyState) {
          this.loadTabsFromPersistedState(legacyState)
          // Save it in the new workspace-scoped format
          await this.saveTabsForWorkspace(workspace)
        } else {
          this.createDefaultTabIfEmpty()
        }
      } else {
        // Create a fresh default tab for team workspaces
        this.createDefaultTabIfEmpty()
      }
    } catch (error) {
      console.error(`Failed to load GraphQL tabs for workspace:`, error)
      this.createDefaultTabIfEmpty()
    }
  }

  private async loadLegacyTabState(): Promise<PersistableTabState<HoppGQLDocument> | null> {
    const persistenceService = getService(PersistenceService)
    return await persistenceService.getNullable<PersistableTabState<HoppGQLDocument>>(STORE_KEYS.GQL_TABS)
  }

  private createDefaultTabIfEmpty(): void {
    // Clear existing tabs
    this.tabMap.clear()
    this.tabOrdering.value = []

    // Create default tab
    const defaultTab = {
      id: "default",
      document: {
        request: getDefaultGQLRequest(),
        isDirty: false,
        optionTabPreference: "query" as const,
        cursorPosition: 0,
      },
    }

    this.tabMap.set(defaultTab.id, defaultTab)
    this.tabOrdering.value = [defaultTab.id]
    this.setActiveTab(defaultTab.id)
  }

  // override persistableTabState to remove response from the document
  public override persistableTabState = computed(() => ({
    lastActiveTabID: this.currentTabID.value,
    orderedDocs: this.tabOrdering.value.map((tabID: string) => {
      const tab = this.tabMap.get(tabID)! // tab ordering is guaranteed to have value for this key
      return {
        tabID: tab.id,
        doc: {
          ...tab.document,
          response: null,
        },
      }
    }),
  }))

  protected async loadPersistedState(): Promise<PersistableTabState<HoppGQLDocument> | null> {
    // If workspace service is available and we have a workspace-scoped key, use that
    if (this.workspaceService && this.currentWorkspaceKey) {
      const persistenceService = getService(PersistenceService)
      const savedData = persistenceService.hoppLocalConfigStorage.getItem(`hopp:${this.currentWorkspaceKey}`)
      
      if (savedData) {
        try {
          return JSON.parse(savedData)
        } catch (error) {
          console.error("Failed to parse workspace-scoped GraphQL tab state:", error)
        }
      }
    }

    // Fallback to legacy global state
    const persistenceService = getService(PersistenceService)
    const savedState = await persistenceService.getNullable<
      PersistableTabState<HoppGQLDocument>
    >(STORE_KEYS.GQL_TABS)
    return savedState
  }

  public getTabRefWithSaveContext(ctx: HoppGQLSaveContext) {
    for (const tab of this.tabMap.values()) {
      // For `team-collection` request id can be considered unique
      if (ctx?.originLocation === "team-collection") {
        if (
          tab.document.saveContext?.originLocation === "team-collection" &&
          tab.document.saveContext.requestID === ctx.requestID
        ) {
          return this.getTabRef(tab.id)
        }
      } else if (isEqual(ctx, tab.document.saveContext))
        return this.getTabRef(tab.id)
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
