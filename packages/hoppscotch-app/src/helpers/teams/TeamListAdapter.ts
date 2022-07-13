import * as E from "fp-ts/Either"
import { BehaviorSubject } from "rxjs"
import { GQLError, runGQLQuery } from "../backend/GQLClient"
import { GetMyTeamsDocument, GetMyTeamsQuery } from "../backend/graphql"

const BACKEND_PAGE_SIZE = 10
const POLL_DURATION = 10000

export default class TeamListAdapter {
  error$: BehaviorSubject<GQLError<string> | null>
  loading$: BehaviorSubject<boolean>
  teamList$: BehaviorSubject<GetMyTeamsQuery["myTeams"]>

  private timeoutHandle: ReturnType<typeof setTimeout> | null
  private isDispose: boolean

  constructor(deferInit: boolean = false) {
    this.error$ = new BehaviorSubject<GQLError<string> | null>(null)
    this.loading$ = new BehaviorSubject<boolean>(false)
    this.teamList$ = new BehaviorSubject<GetMyTeamsQuery["myTeams"]>([])
    this.timeoutHandle = null
    this.isDispose = false

    if (!deferInit) this.initialize()
  }

  initialize() {
    if (this.timeoutHandle) throw new Error(`Adapter already initialized`)
    if (this.isDispose) throw new Error(`Adapter has been disposed`)

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
  }

  async fetchList() {
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
        throw new Error(`Failed fetching teams list: ${result.left}`)
      }

      results.push(...result.right.myTeams)

      // If we don't have full elements in the list, then the list is done usually, so lets stop
      if (result.right.myTeams.length !== BACKEND_PAGE_SIZE) break
    }

    this.teamList$.next(results)

    this.loading$.next(false)
  }
}
