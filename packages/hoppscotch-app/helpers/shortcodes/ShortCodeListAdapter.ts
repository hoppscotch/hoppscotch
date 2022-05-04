import * as E from "fp-ts/Either"
import { BehaviorSubject } from "rxjs"
import { GQLError, runGQLQuery } from "../backend/GQLClient"
import {
  GetUserShortCodesQuery,
  GetUserShortCodesDocument,
} from "../backend/graphql"

const BACKEND_PAGE_SIZE = 10
const POLL_DURATION = 10000

export default class ShortCodeListAdapter {
  error$: BehaviorSubject<GQLError<string> | null>
  loading$: BehaviorSubject<boolean>
  shortCodes$: BehaviorSubject<GetUserShortCodesQuery["myShortcodes"]>

  private timeoutHandle: ReturnType<typeof setTimeout> | null
  private isDispose: boolean

  constructor(deferInit: boolean = false) {
    this.error$ = new BehaviorSubject<GQLError<string> | null>(null)
    this.loading$ = new BehaviorSubject<boolean>(false)
    this.shortCodes$ = new BehaviorSubject<
      GetUserShortCodesQuery["myShortcodes"]
    >([])
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

    const results: GetUserShortCodesQuery["myShortcodes"] = []

    while (true) {
      const result = await runGQLQuery({
        query: GetUserShortCodesDocument,
        variables: {
          cursor:
            results.length > 0 ? results[results.length - 1].id : undefined,
        },
      })

      if (E.isLeft(result)) {
        this.error$.next(result.left)
        throw new Error(`Failed fetching short codes list: ${result.left}`)
      }

      results.push(...result.right.myShortcodes)

      // If we don't have full elements in the list, then the list is done usually, so lets stop
      if (result.right.myShortcodes.length !== BACKEND_PAGE_SIZE) break
    }

    this.shortCodes$.next(results)

    this.loading$.next(false)
  }
}
