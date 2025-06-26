import * as E from "fp-ts/Either"
import { BehaviorSubject, Subscription } from "rxjs"
import { Subscription as WSubscription } from "wonka"
import { pipe } from "fp-ts/function"
import { GQLError, runGQLQuery, runGQLSubscription } from "../backend/GQLClient"
import {
  GetTeamEnvironmentsDocument,
  TeamEnvironmentCreatedDocument,
  TeamEnvironmentDeletedDocument,
  TeamEnvironmentUpdatedDocument,
} from "../backend/graphql"
import { TeamEnvironment } from "./TeamEnvironment"
import {
  Environment,
  EnvironmentSchemaVersion,
  translateToNewEnvironmentVariables,
} from "@hoppscotch/data"

type EntityType = "environment"
type EntityID = `${EntityType}-${string}`
export default class TeamEnvironmentAdapter {
  error$: BehaviorSubject<GQLError<string> | null>
  loading$: BehaviorSubject<boolean>
  teamEnvironmentList$: BehaviorSubject<TeamEnvironment[]>

  /**
   * Stores the entity (environments) ids of all the loaded entities.
   * Used for preventing duplication of data which definitely is not possible (duplication due to network problems etc.)
   */
  private entityIDs: Set<EntityID>

  private isDispose: boolean

  private teamEnvironmentCreated$: Subscription | null
  private teamEnvironmentUpdated$: Subscription | null
  private teamEnvironmentDeleted$: Subscription | null

  private teamEnvironmentCreatedSub: WSubscription | null
  private teamEnvironmentUpdatedSub: WSubscription | null
  private teamEnvironmentDeletedSub: WSubscription | null

  constructor(private teamID: string | undefined) {
    this.error$ = new BehaviorSubject<GQLError<string> | null>(null)
    this.loading$ = new BehaviorSubject<boolean>(false)
    this.teamEnvironmentList$ = new BehaviorSubject<TeamEnvironment[]>([])
    this.isDispose = true

    this.entityIDs = new Set()

    this.teamEnvironmentCreated$ = null
    this.teamEnvironmentDeleted$ = null
    this.teamEnvironmentUpdated$ = null

    this.teamEnvironmentCreatedSub = null
    this.teamEnvironmentDeletedSub = null
    this.teamEnvironmentUpdatedSub = null

    if (teamID) this.initialize()
  }

  unsubscribeSubscriptions() {
    this.teamEnvironmentCreated$?.unsubscribe()
    this.teamEnvironmentDeleted$?.unsubscribe()
    this.teamEnvironmentUpdated$?.unsubscribe()

    this.teamEnvironmentCreatedSub?.unsubscribe()
    this.teamEnvironmentDeletedSub?.unsubscribe()
    this.teamEnvironmentUpdatedSub?.unsubscribe()
  }

  changeTeamID(newTeamID: string | undefined) {
    this.teamID = newTeamID
    this.teamEnvironmentList$.next([])
    this.loading$.next(false)

    this.entityIDs.clear()

    this.unsubscribeSubscriptions()

    if (this.teamID) this.initialize()
  }

  async initialize() {
    if (!this.isDispose) throw new Error(`Adapter is already initialized`)

    await this.fetchList()
    this.registerSubscriptions()
  }

  public dispose() {
    if (this.isDispose) throw new Error(`Adapter has been disposed`)

    this.isDispose = true
    this.unsubscribeSubscriptions()
  }

  async fetchList() {
    if (this.teamID === undefined) throw new Error("Team ID is null")

    this.loading$.next(true)

    const results: TeamEnvironment[] = []

    const result = await runGQLQuery({
      query: GetTeamEnvironmentsDocument,
      variables: {
        teamID: this.teamID,
      },
    })

    if (E.isLeft(result)) {
      this.error$.next(result.left)
      this.loading$.next(false)
      console.error(result.left)
      throw new Error(`Failed fetching team environments: ${result.left}`)
    }

    if (result.right.team) {
      results.push(
        ...result.right.team.teamEnvironments.map((x) => {
          // Keep the environment structure consistent with the new schema
          const environment = <Environment>{
            v: EnvironmentSchemaVersion,
            id: x.id,
            name: x.name,
            variables: JSON.parse(x.variables).map(
              (variable: Environment["variables"][number]) =>
                translateToNewEnvironmentVariables(variable)
            ),
          }

          const parsedEnvironment = Environment.safeParse(environment)

          return <TeamEnvironment>{
            id: x.id,
            teamID: x.teamID,
            environment:
              parsedEnvironment.type === "ok"
                ? parsedEnvironment.value
                : environment,
          }
        })
      )
    }

    // Add all the environments to the entity ids list
    results.forEach((env) => this.entityIDs.add(`environment-${env.id}`))

    this.teamEnvironmentList$.next(results)

    this.loading$.next(false)
  }

  private createNewTeamEnvironment(newEnvironment: TeamEnvironment) {
    // Check if we have it already in the entity tree, if so, we don't need it again
    if (this.entityIDs.has(`environment-${newEnvironment.id}`)) return

    const teamEnvironments = this.teamEnvironmentList$.value

    teamEnvironments.push(newEnvironment)

    // Add to entity ids set
    this.entityIDs.add(`environment-${newEnvironment.id}`)

    this.teamEnvironmentList$.next(teamEnvironments)
  }

  private deleteTeamEnvironment(envId: string) {
    const teamEnvironments = this.teamEnvironmentList$.value.filter(
      ({ id }) => id !== envId
    )
    this.entityIDs.delete(`environment-${envId}`)
    this.teamEnvironmentList$.next(teamEnvironments)
  }

  private updateTeamEnvironment(updatedEnvironment: TeamEnvironment) {
    const teamEnvironments = this.teamEnvironmentList$.value

    const environmentFound = teamEnvironments.find(
      ({ id }) => id === updatedEnvironment.id
    )

    if (!environmentFound) return

    Object.assign(environmentFound, updatedEnvironment)

    this.teamEnvironmentList$.next(teamEnvironments)
  }

  private registerSubscriptions() {
    if (this.teamID === undefined) return
    const [teamEnvironmentCreated$, teamEnvironmentCreatedSub] =
      runGQLSubscription({
        query: TeamEnvironmentCreatedDocument,
        variables: {
          teamID: this.teamID,
        },
      })

    this.teamEnvironmentCreatedSub = teamEnvironmentCreatedSub

    this.teamEnvironmentCreated$ = teamEnvironmentCreated$.subscribe(
      (result) => {
        if (E.isLeft(result)) {
          console.error(result.left)
          throw new Error(`Team Environment Create Error ${result.left}`)
        }
        this.createNewTeamEnvironment(
          pipe(
            result.right.teamEnvironmentCreated,
            (x) =>
              <TeamEnvironment>{
                id: x.id,
                teamID: x.teamID,
                environment: {
                  v: 2,
                  id: x.id,
                  name: x.name,
                  variables: JSON.parse(x.variables),
                },
              }
          )
        )
      }
    )

    const [teamEnvironmentDeleted$, teamEnvironmentDeletedSub] =
      runGQLSubscription({
        query: TeamEnvironmentDeletedDocument,
        variables: {
          teamID: this.teamID,
        },
      })

    this.teamEnvironmentDeletedSub = teamEnvironmentDeletedSub

    this.teamEnvironmentDeleted$ = teamEnvironmentDeleted$.subscribe(
      (result) => {
        if (E.isLeft(result)) {
          console.error(result.left)
          throw new Error(`Team Environment Delete Error ${result.left}`)
        }
        this.deleteTeamEnvironment(result.right.teamEnvironmentDeleted.id)
      }
    )

    const [teamEnvironmentUpdated$, teamEnvironmentUpdatedSub] =
      runGQLSubscription({
        query: TeamEnvironmentUpdatedDocument,
        variables: {
          teamID: this.teamID,
        },
      })

    this.teamEnvironmentUpdatedSub = teamEnvironmentUpdatedSub

    this.teamEnvironmentUpdated$ = teamEnvironmentUpdated$.subscribe(
      (result) => {
        if (E.isLeft(result)) {
          console.error(result.left)
          throw new Error(`Team Environment Update Error ${result.left}`)
        }
        this.updateTeamEnvironment(
          pipe(
            result.right.teamEnvironmentUpdated,
            (x) =>
              <TeamEnvironment>{
                id: x.id,
                teamID: x.teamID,
                environment: {
                  v: 2,
                  id: x.id,
                  name: x.name,
                  variables: JSON.parse(x.variables),
                },
              }
          )
        )
      }
    )
  }
}
