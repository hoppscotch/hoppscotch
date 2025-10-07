import { Container } from "dioc"
import { computed, watch } from "vue"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { HoppRESTSaveContext, HoppTabDocument } from "~/helpers/rest/document"
import { getService } from "~/modules/dioc"
import { PersistenceService, STORE_KEYS } from "../persistence"
import { WorkspaceService, Workspace } from "../workspace.service"
import { TabService } from "./tab"
import { PersistableTabState } from "."
import { getWorkspaceScopedTabKey } from "./workspace-aware-tab"

export class RESTTabService extends TabService<HoppTabDocument> {
  public static readonly ID = "REST_TAB_SERVICE"

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
        type: "request",
        request: getDefaultRESTRequest(),
        isDirty: false,
        optionTabPreference: "params",
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
    const key = getWorkspaceScopedTabKey(STORE_KEYS.REST_TABS, workspace)
    const currentState = this.persistableTabState.value
    
    try {
      const persistenceService = getService(PersistenceService)
      // Save using custom key - we'll need to update PersistenceService to support this
      await persistenceService.hoppLocalConfigStorage.setItem(
        `hopp:${key}`, 
        JSON.stringify(currentState)
      )
    } catch (error) {
      console.error(`Failed to save REST tabs for workspace:`, error)
    }
  }

  private async loadTabsForWorkspace(workspace: Workspace): Promise<void> {
    const key = getWorkspaceScopedTabKey(STORE_KEYS.REST_TABS, workspace)
    this.currentWorkspaceKey = key

    try {
      const persistenceService = getService(PersistenceService)
      const savedData = persistenceService.hoppLocalConfigStorage.getItem(`hopp:${key}`)
      
      if (savedData) {
        // Load the saved tabs
        const savedState: PersistableTabState<HoppTabDocument> = JSON.parse(savedData)
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
      console.error(`Failed to load REST tabs for workspace:`, error)
      this.createDefaultTabIfEmpty()
    }
  }

  private async loadLegacyTabState(): Promise<PersistableTabState<HoppTabDocument> | null> {
    const persistenceService = getService(PersistenceService)
    return await persistenceService.getNullable<PersistableTabState<HoppTabDocument>>(STORE_KEYS.REST_TABS)
  }

  private createDefaultTabIfEmpty(): void {
    // Clear existing tabs
    this.tabMap.clear()
    this.tabOrdering.value = []

    // Create default tab
    const defaultTab = {
      id: "default",
      document: {
        type: "request" as const,
        request: getDefaultRESTRequest(),
        isDirty: false,
        optionTabPreference: "params" as const,
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
    // If workspace service is available and we have a workspace-scoped key, use that
    if (this.workspaceService && this.currentWorkspaceKey) {
      const persistenceService = getService(PersistenceService)
      const savedData = persistenceService.hoppLocalConfigStorage.getItem(`hopp:${this.currentWorkspaceKey}`)
      
      if (savedData) {
        try {
          return JSON.parse(savedData)
        } catch (error) {
          console.error("Failed to parse workspace-scoped tab state:", error)
        }
      }
    }

    // Fallback to legacy global state
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
        tab.document.saveContext.requestRefID === ctx?.requestRefID
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
