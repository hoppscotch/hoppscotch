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
      })

      service.updateWorkspaceTeamName("test")

      expect(service.currentWorkspace.value).toEqual({
        type: "team",
        teamID: "test",
        teamName: "test",
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
      })

      expect(service.currentWorkspace.value).toEqual({
        type: "team",
        teamID: "test",
        teamName: "test",
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
})
