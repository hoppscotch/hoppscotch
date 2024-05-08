import { tryOnScopeDispose, useIntervalFn } from "@vueuse/core"
import { Service } from "dioc"
import { computed, reactive, ref, watch, readonly } from "vue"
import { useStreamStatic } from "~/composables/stream"
import TeamListAdapter from "~/helpers/teams/TeamListAdapter"
import { platform } from "~/platform"
import { min } from "lodash-es"
import { TeamMemberRole } from "~/helpers/backend/graphql"

/**
 * Defines a workspace and its information
 */

export type PersonalWorkspace = {
  type: "personal"
}

export type TeamWorkspace = {
  type: "team"
  teamID: string
  teamName: string
  role: TeamMemberRole | null | undefined
}

export type Workspace = PersonalWorkspace | TeamWorkspace

export type WorkspaceServiceEvent = {
  type: "managed-team-list-adapter-polled"
}

/**
 * This services manages workspace related data and actions in Hoppscotch.
 */
export class WorkspaceService extends Service<WorkspaceServiceEvent> {
  public static readonly ID = "WORKSPACE_SERVICE"

  private _currentWorkspace = ref<Workspace>({ type: "personal" })

  /**
   * A readonly reference to the currently selected workspace
   */
  public currentWorkspace = readonly(this._currentWorkspace)

  private teamListAdapterLocks = reactive(new Map<number, number | null>())
  private teamListAdapterLockTicker = 0 // Used to generate unique lock IDs
  private managedTeamListAdapter = new TeamListAdapter(true, false)

  private currentUser = useStreamStatic(
    platform.auth.getCurrentUserStream(),
    platform.auth.getCurrentUser(),
    () => {
      /* noop */
    }
  )[0]

  private readonly pollingTime = computed(
    () =>
      min(Array.from(this.teamListAdapterLocks.values()).filter((x) => !!x)) ??
      -1
  )

  override onServiceInit() {
    // Dispose the managed team list adapter when the user logs out
    // and initialize it when the user logs in
    watch(
      this.currentUser,
      (user) => {
        if (!user && this.managedTeamListAdapter.isInitialized) {
          this.managedTeamListAdapter.dispose()
        }

        if (user && !this.managedTeamListAdapter.isInitialized) {
          this.managedTeamListAdapter.initialize()
        }
      },
      { immediate: true }
    )

    // Poll the managed team list adapter if the polling time is defined
    const { pause: pauseListPoll, resume: resumeListPoll } = useIntervalFn(
      () => {
        if (this.managedTeamListAdapter.isInitialized) {
          this.managedTeamListAdapter.fetchList()

          this.emit({ type: "managed-team-list-adapter-polled" })
        }
      },
      this.pollingTime,
      { immediate: true }
    )

    // Pause and resume the polling when the polling time changes
    watch(
      this.pollingTime,
      (pollingTime) => {
        if (pollingTime === -1) {
          pauseListPoll()
        } else {
          resumeListPoll()
        }
      },
      { immediate: true }
    )
  }

  // TODO: Update this function, its existence is pretty weird
  /**
   * Updates the name of the current workspace if it is a team workspace.
   * @param newTeamName The new name of the team
   */
  public updateWorkspaceTeamName(newTeamName: string) {
    if (this._currentWorkspace.value.type === "team") {
      this._currentWorkspace.value = {
        ...this._currentWorkspace.value,
        teamName: newTeamName,
      }
    }
  }

  /**
   * Changes the current workspace to the given workspace.
   * @param workspace The new workspace
   */
  public changeWorkspace(workspace: Workspace) {
    this._currentWorkspace.value = workspace
  }

  /**
   * Acquires a team list adapter that is managed by the workspace service.
   * The team list adapter is associated with a Vue Scope and will be disposed
   * when the scope is disposed.
   * @param pollDuration The duration between polls in milliseconds. If null, the team list adapter will not poll.
   */
  public acquireTeamListAdapter(pollDuration: number | null) {
    const lockID = this.teamListAdapterLockTicker++

    this.teamListAdapterLocks.set(lockID, pollDuration)

    tryOnScopeDispose(() => {
      this.teamListAdapterLocks.delete(lockID)
    })

    return this.managedTeamListAdapter
  }
}
