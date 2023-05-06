import { distinctUntilChanged, pluck } from "rxjs"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"

type Workspace =
  | { type: "personal" }
  | { type: "team"; teamID: string; teamName: string }

type WorkspaceState = {
  workspace: Workspace
}

const initialState: WorkspaceState = {
  workspace: {
    type: "personal",
  },
}

const dispatchers = defineDispatchers({
  changeWorkspace(_, { workspace }: { workspace: Workspace }) {
    return {
      workspace,
    }
  },
  updateWorkspaceTeamName(
    _,
    { workspace, newTeamName }: { workspace: Workspace; newTeamName: string }
  ) {
    if (workspace.type === "team") {
      return {
        workspace: {
          ...workspace,
          teamName: newTeamName,
        },
      }
    }
    return {
      workspace,
    }
  },
})

export const hoppWorkspaceStore = new DispatchingStore(
  initialState,
  dispatchers
)

export const workspaceStatus$ = hoppWorkspaceStore.subject$.pipe(
  pluck("workspace"),
  distinctUntilChanged()
)

export function changeWorkspace(workspace: Workspace) {
  hoppWorkspaceStore.dispatch({
    dispatcher: "changeWorkspace",
    payload: { workspace },
  })
}

export function updateWorkspaceTeamName(
  workspace: Workspace,
  newTeamName: string
) {
  hoppWorkspaceStore.dispatch({
    dispatcher: "updateWorkspaceTeamName",
    payload: { workspace, newTeamName },
  })
}
