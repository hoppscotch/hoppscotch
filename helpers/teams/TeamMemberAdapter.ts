import { BehaviorSubject } from "rxjs"
import { apolloClient } from "~/helpers/apollo"
import gql from "graphql-tag"
import cloneDeep from "lodash/cloneDeep"

interface TeamsTeamMember {
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
    const { data } = await apolloClient.query({
      query: gql`
        query GetTeamMembers($teamID: String!) {
          team(teamID: $teamID) {
            members {
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
      },
    })

    this.members$.next(data.team.members)
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
          this.members$.value.filter((el) => el.user.uid !== data.teamMemberRemoved)
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
        const obj = list.find((el) => el.user.uid === data.teamMemberUpdated.user.uid)

        if (!obj) return

        Object.assign(obj, data.teamMemberUpdated)
      })
  }
}
