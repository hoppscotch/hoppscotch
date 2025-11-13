import { describe, expect, vi, it, beforeEach, afterEach } from "vitest"
import { TestContainer } from "dioc/testing"
import { WorkspaceService } from "../workspace.service"
import { setPlatformDef } from "~/platform"
import { BehaviorSubject } from "rxjs"
import { effectScope, nextTick } from "vue"

const listAdapterMock = vi.hoisted(() => ({
  isInitialized: false,
  initialize: vi.fn(() => {
    listAdapterMock.isInitialized = true
  }),
  dispose: vi.fn(() => {
    listAdapterMock.isInitialized = false
  }),
  fetchList: vi.fn(),
}))

vi.mock("~/helpers/teams/TeamListAdapter", () => ({
  default: class {
    isInitialized = listAdapterMock.isInitialized
    initialize = listAdapterMock.initialize
    dispose = listAdapterMock.dispose
    fetchList = listAdapterMock.fetchList
  },
}))

// Mock TeamCollectionsService to prevent i18n dependency issues
vi.mock("../team-collection.service", () => ({
  TeamCollectionsService: class MockTeamCollectionsService {
    static readonly ID = "TEAM_COLLECTIONS_SERVICE"

    changeTeamID = vi.fn()
    clearCollections = vi.fn()

    onServiceInit = vi.fn()
  },
}))

describe("WorkspaceService", () => {
  const platformMock = {
    auth: {
      getCurrentUserStream: vi.fn(),
      getCurrentUser: vi.fn(),
    },
  }

  beforeEach(() => {
    // @ts-expect-error - We're mocking the platform
    setPlatformDef(platformMock)

    platformMock.auth.getCurrentUserStream.mockReturnValue(
      new BehaviorSubject(null)
    )

    platformMock.auth.getCurrentUser.mockReturnValue(null)
  })

  describe("Initialization", () => {
    it("should initialize with the personal workspace selected", () => {
      const container = new TestContainer()

      const service = container.bind(WorkspaceService)

      expect(service.currentWorkspace.value).toEqual({ type: "personal" })
    })
  })

  describe("updateWorkspaceTeamName", () => {
    it("should update the workspace team name if the current workspace is a team workspace", () => {
      const container = new TestContainer()

      const service = container.bind(WorkspaceService)

      service.changeWorkspace({
        type: "team",
        teamID: "test",
        teamName: "before update",
        role: null,
      })

      service.updateWorkspaceTeamName("test")

      expect(service.currentWorkspace.value).toEqual({
        type: "team",
        teamID: "test",
        teamName: "test",
        role: null,
      })
    })

    it("should not update the workspace team name if the current workspace is a personal workspace", () => {
      const container = new TestContainer()

      const service = container.bind(WorkspaceService)

      service.changeWorkspace({
        type: "personal",
      })

      service.updateWorkspaceTeamName("test")

      expect(service.currentWorkspace.value).toEqual({ type: "personal" })
    })
  })

  describe("changeWorkspace", () => {
    it("updates the current workspace value to the given workspace", () => {
      const container = new TestContainer()

      const service = container.bind(WorkspaceService)

      service.changeWorkspace({
        type: "team",
        teamID: "test",
        teamName: "test",
        role: null,
      })

      expect(service.currentWorkspace.value).toEqual({
        type: "team",
        teamID: "test",
        teamName: "test",
        role: null,
      })
    })
  })

  describe("acquireTeamListAdapter", () => {
    beforeEach(() => {
      vi.useFakeTimers()
      listAdapterMock.fetchList.mockClear()
    })

    afterEach(() => {
      vi.clearAllTimers()
    })

    it("should not poll if the polling time is null", () => {
      const container = new TestContainer()

      listAdapterMock.isInitialized = true // We need to initialize the list adapter before we can use it
      const service = container.bind(WorkspaceService)

      service.acquireTeamListAdapter(null)
      vi.advanceTimersByTime(100000)

      expect(listAdapterMock.fetchList).not.toHaveBeenCalled()
    })

    it("should not poll if the polling time is not null and user not logged in", async () => {
      const container = new TestContainer()

      const service = container.bind(WorkspaceService)

      service.acquireTeamListAdapter(100)
      await nextTick()
      vi.advanceTimersByTime(110)

      platformMock.auth.getCurrentUser.mockReturnValue(null)
      platformMock.auth.getCurrentUserStream.mockReturnValue(
        new BehaviorSubject(null)
      )

      expect(listAdapterMock.fetchList).not.toHaveBeenCalled()
    })

    it("should poll if the polling time is not null and the user is logged in", async () => {
      const container = new TestContainer()

      listAdapterMock.isInitialized = true // We need to initialize the list adapter before we can use it

      platformMock.auth.getCurrentUser.mockReturnValue({
        id: "test",
      })
      platformMock.auth.getCurrentUserStream.mockReturnValue(
        new BehaviorSubject({ id: "test" })
      )

      const service = container.bind(WorkspaceService)

      const adapter = service.acquireTeamListAdapter(100)
      await nextTick()
      vi.advanceTimersByTime(100)

      expect(adapter!.fetchList).toHaveBeenCalledOnce()
    })

    it("emits 'managed-team-list-adapter-polled' when the service polls the adapter", async () => {
      const container = new TestContainer()

      listAdapterMock.isInitialized = true

      platformMock.auth.getCurrentUser.mockReturnValue({
        id: "test",
      })

      platformMock.auth.getCurrentUserStream.mockReturnValue(
        new BehaviorSubject({ id: "test" })
      )

      const service = container.bind(WorkspaceService)

      const eventFn = vi.fn()
      const sub = service.getEventStream().subscribe(eventFn)

      service.acquireTeamListAdapter(100)
      await nextTick()
      vi.advanceTimersByTime(100)

      expect(eventFn).toHaveBeenCalledOnce()
      expect(eventFn).toHaveBeenCalledWith({
        type: "managed-team-list-adapter-polled",
      })

      sub.unsubscribe()
    })

    it("stops polling when the Vue effect scope is disposed and there is no more polling locks", async () => {
      const container = new TestContainer()

      listAdapterMock.isInitialized = true

      platformMock.auth.getCurrentUser.mockReturnValue({
        id: "test",
      })

      platformMock.auth.getCurrentUserStream.mockReturnValue(
        new BehaviorSubject({ id: "test" })
      )

      const service = container.bind(WorkspaceService)
      listAdapterMock.fetchList.mockClear() // Reset the counters

      const scopeHandle = effectScope()
      scopeHandle.run(() => {
        service.acquireTeamListAdapter(100)
      })

      await nextTick()
      vi.advanceTimersByTime(100)

      expect(listAdapterMock.fetchList).toHaveBeenCalledOnce()
      listAdapterMock.fetchList.mockClear()

      scopeHandle.stop()

      await nextTick()
      vi.advanceTimersByTime(100)

      expect(listAdapterMock.fetchList).not.toHaveBeenCalled()
    })
  })

  describe("Team Collection Service Synchronization", () => {
    it("should call changeTeamID when workspace changes to a team workspace", async () => {
      const container = new TestContainer()
      const service = container.bind(WorkspaceService)

      // Access the team collection service mock
      const teamCollectionServiceMock = (service as any).teamCollectionService

      // Change to team workspace
      service.changeWorkspace({
        type: "team",
        teamID: "team-123",
        teamName: "Test Team",
        role: null,
      })

      await nextTick()

      expect(teamCollectionServiceMock.changeTeamID).toHaveBeenCalledWith(
        "team-123"
      )
    })

    it("should call clearCollections when workspace changes to personal workspace", async () => {
      const container = new TestContainer()
      const service = container.bind(WorkspaceService)

      // Start with a team workspace
      service.changeWorkspace({
        type: "team",
        teamID: "team-123",
        teamName: "Test Team",
        role: null,
      })

      await nextTick()

      const teamCollectionServiceMock = (service as any).teamCollectionService
      teamCollectionServiceMock.clearCollections.mockClear()

      // Change to personal workspace
      service.changeWorkspace({
        type: "personal",
      })

      await nextTick()

      expect(teamCollectionServiceMock.clearCollections).toHaveBeenCalled()
    })

    it("should call clearCollections when workspace changes to team workspace without teamID", async () => {
      const container = new TestContainer()
      const service = container.bind(WorkspaceService)

      const teamCollectionServiceMock = (service as any).teamCollectionService

      // Change to team workspace without teamID
      service.changeWorkspace({
        type: "team",
        teamID: "",
        teamName: "Test Team",
        role: null,
      })

      await nextTick()

      expect(teamCollectionServiceMock.clearCollections).toHaveBeenCalled()
    })

    it("should not sync when workspaces are effectively the same", async () => {
      const container = new TestContainer()
      const service = container.bind(WorkspaceService)

      // Start with a team workspace
      service.changeWorkspace({
        type: "team",
        teamID: "team-123",
        teamName: "Test Team",
        role: null,
      })

      await nextTick()

      const teamCollectionServiceMock = (service as any).teamCollectionService
      teamCollectionServiceMock.changeTeamID.mockClear()

      // Change to same team workspace (different name, same ID)
      service.changeWorkspace({
        type: "team",
        teamID: "team-123",
        teamName: "Updated Team Name",
        role: null,
      })

      await nextTick()

      // Should not call changeTeamID again since it's the same team
      expect(teamCollectionServiceMock.changeTeamID).not.toHaveBeenCalled()
    })

    it("should handle errors during team collection service sync gracefully", async () => {
      const container = new TestContainer()
      const service = container.bind(WorkspaceService)

      const teamCollectionServiceMock = (service as any).teamCollectionService
      teamCollectionServiceMock.changeTeamID.mockImplementation(() => {
        throw new Error("Sync failed")
      })

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

      // Change to team workspace (should not throw)
      expect(() => {
        service.changeWorkspace({
          type: "team",
          teamID: "team-123",
          teamName: "Test Team",
          role: null,
        })
      }).not.toThrow()

      await nextTick()

      expect(consoleSpy).toHaveBeenCalledWith(
        "Failed to sync team collections:",
        expect.any(Error)
      )

      consoleSpy.mockRestore()
    })
  })

  describe("areWorkspacesEqual", () => {
    let service: WorkspaceService

    beforeEach(() => {
      const container = new TestContainer()
      service = container.bind(WorkspaceService)
    })

    it("should return false when newWorkspace is undefined", () => {
      const result = (service as any).areWorkspacesEqual(undefined, {
        type: "personal",
      })
      expect(result).toBe(false)
    })

    it("should return false when oldWorkspace is undefined", () => {
      const result = (service as any).areWorkspacesEqual(
        { type: "personal" },
        undefined
      )
      expect(result).toBe(false)
    })

    it("should return true when both workspaces are personal", () => {
      const result = (service as any).areWorkspacesEqual(
        { type: "personal" },
        { type: "personal" }
      )
      expect(result).toBe(true)
    })

    it("should return true when both workspaces are team workspaces with same teamID", () => {
      const workspace1 = {
        type: "team",
        teamID: "team-123",
        teamName: "Team A",
        role: null,
      }
      const workspace2 = {
        type: "team",
        teamID: "team-123",
        teamName: "Team A Updated",
        role: null,
      }

      const result = (service as any).areWorkspacesEqual(workspace1, workspace2)
      expect(result).toBe(true)
    })

    it("should return false when team workspaces have different teamIDs", () => {
      const workspace1 = {
        type: "team",
        teamID: "team-123",
        teamName: "Team A",
        role: null,
      }
      const workspace2 = {
        type: "team",
        teamID: "team-456",
        teamName: "Team B",
        role: null,
      }

      const result = (service as any).areWorkspacesEqual(workspace1, workspace2)
      expect(result).toBe(false)
    })

    it("should return false when one is personal and other is team workspace", () => {
      const personalWorkspace = { type: "personal" }
      const teamWorkspace = {
        type: "team",
        teamID: "team-123",
        teamName: "Team A",
        role: null,
      }

      const result1 = (service as any).areWorkspacesEqual(
        personalWorkspace,
        teamWorkspace
      )
      const result2 = (service as any).areWorkspacesEqual(
        teamWorkspace,
        personalWorkspace
      )

      expect(result1).toBe(false)
      expect(result2).toBe(false)
    })
  })
})
