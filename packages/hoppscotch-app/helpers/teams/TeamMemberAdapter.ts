import * as E from "fp-ts/Either"
import { BehaviorSubject, Subscription } from "rxjs"
import cloneDeep from "lodash/cloneDeep"
import { runGQLQuery, runGQLSubscription } from "../backend/GQLClient"
import {
  GetTeamMembersDocument,
  TeamMemberAddedDocument,
  TeamMemberRemovedDocument,
  TeamMemberUpdatedDocument,
} from "../backend/graphql"

export interface TeamsTeamMember {
  membershipID: string
  user: {
    uid: string
    email: string | null
  }
  role: "OWNER" | "EDITOR" | "VIEWER"
}

export default class TeamMemberAdapter {
  members$: BehaviorSubject<TeamsTeamMember[]>

  private teamMemberAdded$: Subscription | null
  private teamMemberRemoved$: Subscription | null
  private teamMemberUpdated$: Subscription | null

  constructor(private teamID: string | null) {
    this.members$ = new BehaviorSubject<TeamsTeamMember[]>([])

    this.teamMemberAdded$ = null
    this.teamMemberUpdated$ = null
    this.teamMemberRemoved$ = null

    if (this.teamID) this.initialize()
  }

  changeTeamID(newTeamID: string | null) {
    this.members$.next([])

    this.teamID = newTeamID

    if (this.teamID) this.initialize()
  }

  unsubscribeSubscriptions() {
    this.teamMemberAdded$?.unsubscribe()
    this.teamMemberRemoved$?.unsubscribe()
    this.teamMemberUpdated$?.unsubscribe()
  }

  private async initialize() {
    await this.loadTeamMembers()
    this.registerSubscriptions()
  }

  private async loadTeamMembers(): Promise<void> {
    if (!this.teamID) return

    const result: TeamsTeamMember[] = []

    let cursor: string | null = null

    while (true) {
      const res = await runGQLQuery({
        query: GetTeamMembersDocument,
        variables: {
          teamID: this.teamID,
          cursor,
        },
      })

      if (E.isLeft(res))
        throw new Error(`Team Members List Load failed: ${res.left}`)

      // TODO: Improve this with TypeScript
      result.push(...(res.right.team!.members as any))

      if ((res.right.team!.members as any[]).length === 0) break
      else {
        cursor =
          res.right.team!.members[res.right.team!.members.length - 1]
            .membershipID
      }
    }

    this.members$.next(result)
  }

  private registerSubscriptions() {
    if (!this.teamID) return

    this.teamMemberAdded$ = runGQLSubscription({
      query: TeamMemberAddedDocument,
      variables: {
        teamID: this.teamID,
      },
    }).subscribe((result) => {
      if (E.isLeft(result))
        throw new Error(`Team Member Added Subscription Failed: ${result.left}`)

      // TODO: Improve typing
      this.members$.next([
        ...(this.members$.value as any),
        result.right.teamMemberAdded as any,
      ])
    })

    this.teamMemberRemoved$ = runGQLSubscription({
      query: TeamMemberRemovedDocument,
      variables: {
        teamID: this.teamID,
      },
    }).subscribe((result) => {
      if (E.isLeft(result))
        throw new Error(
          `Team Member Removed Subscription Failed: ${result.left}`
        )

      this.members$.next(
        this.members$.value.filter(
          (el) => el.user.uid !== result.right.teamMemberRemoved
        )
      )
    })

    this.teamMemberUpdated$ = runGQLSubscription({
      query: TeamMemberUpdatedDocument,
      variables: {
        teamID: this.teamID,
      },
    }).subscribe((result) => {
      if (E.isLeft(result))
        throw new Error(
          `Team Member Updated Subscription Failed: ${result.left}`
        )

      const list = cloneDeep(this.members$.value)
      // TODO: Improve typing situation
      const obj = list.find(
        (el) =>
          el.user.uid === (result.right.teamMemberUpdated.user!.uid as any)
      )

      if (!obj) return

      Object.assign(obj, result.right.teamMemberUpdated)
    })
  }
}
