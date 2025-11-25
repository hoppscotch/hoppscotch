import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { BehaviorSubject } from "rxjs"
import { pluck } from "rxjs/operators"
import {
  getMyMockServers,
  getTeamMockServers,
} from "~/helpers/backend/queries/MockServer"
import { getService } from "~/modules/dioc"
import { WorkspaceService } from "~/services/workspace.service"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"

export type WorkspaceType = "USER" | "TEAM"

export type MockServer = {
  id: string
  name: string
  subdomain: string
  serverUrlPathBased?: string
  serverUrlDomainBased?: string | null
  workspaceType: WorkspaceType
  workspaceID?: string | null
  delayInMs?: number
  isPublic: boolean
  isActive: boolean
  createdOn: Date
  updatedOn: Date
  creator?: {
    uid: string
  }
  collection?: {
    id: string
    title: string
    requests?: any[]
  } | null
  // Legacy fields for backward compatibility
  userUid?: string
  collectionID?: string
}

export type CreateMockServerInput = {
  name: string
  collectionID: string
  workspaceType?: WorkspaceType
  workspaceID?: string
  delayInMs?: number
  isPublic?: boolean
}

export type UpdateMockServerInput = {
  name?: string
  isActive?: boolean
  delayInMs?: number
  isPublic?: boolean
}

export type CreateMockServerModalData = {
  show: boolean
  collectionID?: string
  collectionName?: string
}

const defaultMockServerState = {
  mockServers: [] as MockServer[],
}

type MockServerStoreType = typeof defaultMockServerState

const mockServerDispatchers = defineDispatchers({
  setMockServers(
    _: MockServerStoreType,
    { mockServers }: { mockServers: MockServer[] }
  ) {
    return {
      mockServers,
    }
  },

  addMockServer(
    { mockServers }: MockServerStoreType,
    { mockServer }: { mockServer: MockServer }
  ) {
    return {
      mockServers: [...mockServers, mockServer],
    }
  },

  updateMockServer(
    { mockServers }: MockServerStoreType,
    { id, updates }: { id: string; updates: Partial<MockServer> }
  ) {
    return {
      mockServers: mockServers.map((server) =>
        server.id === id ? { ...server, ...updates } : server
      ),
    }
  },

  deleteMockServer(
    { mockServers }: MockServerStoreType,
    { id }: { id: string }
  ) {
    return {
      mockServers: mockServers.filter((server) => server.id !== id),
    }
  },
})

export const mockServerStore = new DispatchingStore(
  defaultMockServerState,
  mockServerDispatchers
)

export const mockServers$ = mockServerStore.subject$.pipe(pluck("mockServers"))

export function setMockServers(mockServers: MockServer[]) {
  mockServerStore.dispatch({
    dispatcher: "setMockServers",
    payload: { mockServers },
  })
}

export function addMockServer(mockServer: MockServer) {
  mockServerStore.dispatch({
    dispatcher: "addMockServer",
    payload: { mockServer },
  })
}

export function updateMockServer(id: string, updates: Partial<MockServer>) {
  mockServerStore.dispatch({
    dispatcher: "updateMockServer",
    payload: { id, updates },
  })
}

export function deleteMockServer(id: string) {
  mockServerStore.dispatch({
    dispatcher: "deleteMockServer",
    payload: { id },
  })
}

// Modal state management
const defaultCreateMockServerModalState: CreateMockServerModalData = {
  show: false,
  collectionID: undefined,
  collectionName: undefined,
}

export const showCreateMockServerModal$ = new BehaviorSubject(
  defaultCreateMockServerModalState
)

// Load mock servers from backend (workspace-aware)
export function loadMockServers(skip?: number, take?: number) {
  try {
    const workspaceService = getService(WorkspaceService)
    const currentWorkspace = workspaceService.currentWorkspace.value

    if (currentWorkspace.type === "team" && currentWorkspace.teamID) {
      return loadTeamMockServers(currentWorkspace.teamID, skip, take)
    }
    return pipe(
      getMyMockServers(skip, take),
      TE.match(
        (error) => {
          console.error("Failed to load mock servers:", error)
          // Clear mock servers on error to prevent stale data
          setMockServers([])
        },
        (mockServers) => {
          setMockServers(mockServers)
        }
      )
    )()
  } catch (error) {
    // Fallback to user mock servers if workspace service is not available
    return pipe(
      getMyMockServers(skip, take),
      TE.match(
        (error) => {
          console.error("Failed to load mock servers:", error)
          // Clear mock servers on error to prevent stale data
          setMockServers([])
        },
        (mockServers) => {
          setMockServers(mockServers)
        }
      )
    )()
  }
}

// Load team mock servers from backend
export function loadTeamMockServers(
  teamID: string,
  skip?: number,
  take?: number
) {
  return pipe(
    getTeamMockServers(teamID, skip, take),
    TE.match(
      (error) => {
        console.error("Failed to load team mock servers:", error)
        // Clear mock servers on error to prevent stale data
        setMockServers([])
      },
      (mockServers) => {
        setMockServers(mockServers)
      }
    )
  )()
}

// Load mock servers based on workspace context
export function loadMockServersForWorkspace(
  workspaceType: "personal" | "team",
  teamID?: string,
  skip?: number,
  take?: number
) {
  // Clear existing mock servers first to prevent stale data
  setMockServers([])

  if (workspaceType === "team" && teamID) {
    return loadTeamMockServers(teamID, skip, take)
  }
  return loadMockServers(skip, take)
}
