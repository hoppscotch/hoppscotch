import * as E from "fp-ts/Either"
import { BehaviorSubject } from "rxjs"
import { GQLError, runGQLQuery } from "../backend/GQLClient"
import { GetMyTeamsDocument, GetMyTeamsQuery } from "../backend/graphql"
import { platform } from "~/platform"

const BACKEND_PAGE_SIZE = 10
const POLL_DURATION = 10000

export default class TeamListAdapter {
  error$: BehaviorSubject<GQLError<string> | null>
  loading$: BehaviorSubject<boolean>
  teamList$: BehaviorSubject<GetMyTeamsQuery["myTeams"]>

  private timeoutHandle: ReturnType<typeof setTimeout> | null
  private isDispose: boolean

  public isInitialized: boolean

  constructor(deferInit = false) {
    this.error$ = new BehaviorSubject<GQLError<string> | null>(null)
    this.loading$ = new BehaviorSubject<boolean>(false)
    this.teamList$ = new BehaviorSubject<GetMyTeamsQuery["myTeams"]>([])
    this.timeoutHandle = null
    this.isDispose = false

    this.isInitialized = false

    if (!deferInit) this.initialize()
  }

  initialize() {
    if (this.timeoutHandle) throw new Error(`Adapter already initialized`)
    if (this.isDispose) throw new Error(`Adapter has been disposed`)

    this.isInitialized = true

    const func = async () => {
      await this.fetchList()

      if (!this.isDispose) {
        this.timeoutHandle = setTimeout(() => func(), POLL_DURATION)
      }
    }

    func()
  }

  public dispose() {
    this.isDispose = true
    clearTimeout(this.timeoutHandle as any)
    this.timeoutHandle = null
    this.isInitialized = false
  }

  async fetchList() {
    const currentUser = platform.auth.getCurrentUser()

    // if the authIdToken is not present, don't fetch the teams list, as it will fail anyway
    if (!currentUser) return

    this.loading$.next(true)

    const results: GetMyTeamsQuery["myTeams"] = []

    while (true) {
      const result = await runGQLQuery({
        query: GetMyTeamsDocument,
        variables: {
          cursor:
            results.length > 0 ? results[results.length - 1].id : undefined,
        },
      })

      if (E.isLeft(result)) {
        this.error$.next(result.left)
        throw new Error(
          `Failed fetching teams list: ${JSON.stringify(result.left)}`
        )
      }

      results.push(...result.right.myTeams)

      // If we don't have full elements in the list, then the list is done usually, so lets stop
      if (result.right.myTeams.length !== BACKEND_PAGE_SIZE) break
    }

    this.teamList$.next(results)

    this.loading$.next(false)
  }
}
