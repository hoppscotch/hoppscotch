import { BehaviorSubject } from "rxjs"
import gql from "graphql-tag"
import cloneDeep from "lodash/cloneDeep"
import * as Apollo from "@apollo/client/core"
import { apolloClient } from "~/helpers/apollo"

interface TeamsTeamMember {
  membershipID: string
  user: {
    uid: string
    email: string
  }
  role: "OWNER" | "EDITOR" | "VIEWER"
}

export default class TeamMemberAdapter {
  members$: BehaviorSubject<TeamsTeamMember[]>

  private teamMemberAdded$: ZenObservable.Subscription | null
  private teamMemberRemoved$: ZenObservable.Subscription | null
  private teamMemberUpdated$: ZenObservable.Subscription | null

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
    const result: TeamsTeamMember[] = []

    let cursor: string | null = null
    while (true) {
      const response: Apollo.ApolloQueryResult<any> = await apolloClient.query({
        query: gql`
          query GetTeamMembers($teamID: String!, $cursor: String) {
            team(teamID: $teamID) {
              members(cursor: $cursor) {
                membershipID
                user {
                  uid
                  email
                }
                role
              }
            }
          }
        `,
        variables: {
          teamID: this.teamID,
          cursor,
        },
      })

      result.push(...response.data.team.members)

      if ((response.data.team.members as any[]).length === 0) break
      else {
        cursor =
          response.data.team.members[response.data.team.members.length - 1]
            .membershipID
      }
    }

    this.members$.next(result)
  }

  private registerSubscriptions() {
    this.teamMemberAdded$ = apolloClient
      .subscribe({
        query: gql`
          subscription TeamMemberAdded($teamID: String!) {
            teamMemberAdded(teamID: $teamID) {
              user {
                uid
                email
              }
              role
            }
          }
        `,
        variables: {
          teamID: this.teamID,
        },
      })
      .subscribe(({ data }) => {
        this.members$.next([...this.members$.value, data.teamMemberAdded])
      })

    this.teamMemberRemoved$ = apolloClient
      .subscribe({
        query: gql`
          subscription TeamMemberRemoved($teamID: String!) {
            teamMemberRemoved(teamID: $teamID)
          }
        `,
        variables: {
          teamID: this.teamID,
        },
      })
      .subscribe(({ data }) => {
        this.members$.next(
          this.members$.value.filter(
            (el) => el.user.uid !== data.teamMemberRemoved
          )
        )
      })

    this.teamMemberUpdated$ = apolloClient
      .subscribe({
        query: gql`
          subscription TeamMemberUpdated($teamID: String!) {
            teamMemberUpdated(teamID: $teamID) {
              user {
                uid
                email
              }
              role
            }
          }
        `,
        variables: {
          teamID: this.teamID,
        },
      })
      .subscribe(({ data }) => {
        const list = cloneDeep(this.members$.value)
        const obj = list.find(
          (el) => el.user.uid === data.teamMemberUpdated.user.uid
        )

        if (!obj) return

        Object.assign(obj, data.teamMemberUpdated)
      })
  }
}
