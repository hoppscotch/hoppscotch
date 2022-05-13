import * as E from "fp-ts/Either"
import filter from "lodash/filter"
import { BehaviorSubject, Subscription } from "rxjs"
import { GQLError, runGQLQuery, runGQLSubscription } from "../backend/GQLClient"
import {
  GetUserShortcodesQuery,
  GetUserShortcodesDocument,
  ShortcodeCreatedDocument,
  ShortcodeDeletedDocument,
} from "../backend/graphql"
import { Shortcode } from "./Shortcode"

const BACKEND_PAGE_SIZE = 10
// const POLL_DURATION = 10000

export default class ShortcodeListAdapter {
  error$: BehaviorSubject<GQLError<string> | null>
  loading$: BehaviorSubject<boolean>
  shortcodes$: BehaviorSubject<GetUserShortcodesQuery["myShortcodes"]>

  private timeoutHandle: ReturnType<typeof setTimeout> | null
  private isDispose: boolean

  private myShortcodesCreated$: Subscription | null
  private myShortcodesRevoked$: Subscription | null

  constructor(deferInit: boolean = false) {
    this.error$ = new BehaviorSubject<GQLError<string> | null>(null)
    this.loading$ = new BehaviorSubject<boolean>(false)
    this.shortcodes$ = new BehaviorSubject<
      GetUserShortcodesQuery["myShortcodes"]
    >([])
    this.timeoutHandle = null
    this.isDispose = false
    this.myShortcodesCreated$ = null
    this.myShortcodesRevoked$ = null

    if (!deferInit) this.initialize()
  }

  unsubscribeSubscriptions() {
    this.myShortcodesCreated$?.unsubscribe()
    this.myShortcodesRevoked$?.unsubscribe()
  }

  initialize() {
    if (this.timeoutHandle) throw new Error(`Adapter already initialized`)
    if (this.isDispose) throw new Error(`Adapter has been disposed`)

    this.fetchList()
    this.registerSubscriptions()
  }

  public dispose() {
    if (!this.timeoutHandle) throw new Error(`Adapter has not been initialized`)
    if (!this.isDispose) throw new Error(`Adapter has been disposed`)

    this.isDispose = true
    clearTimeout(this.timeoutHandle)
    this.timeoutHandle = null
    this.unsubscribeSubscriptions()
  }

  async fetchList() {
    this.loading$.next(true)

    const results: GetUserShortcodesQuery["myShortcodes"] = []

    while (true) {
      const result = await runGQLQuery({
        query: GetUserShortcodesDocument,
        variables: {
          cursor:
            results.length > 0 ? results[results.length - 1].id : undefined,
        },
      })

      if (E.isLeft(result)) {
        this.error$.next(result.left)
        console.error(result.left)
        throw new Error(`Failed fetching short codes list: ${result.left}`)
      }

      results.push(...result.right.myShortcodes)

      // If we don't have full elements in the list, then the list is done usually, so lets stop
      if (result.right.myShortcodes.length !== BACKEND_PAGE_SIZE) break
    }

    this.shortcodes$.next(results)

    this.loading$.next(false)
  }

  findShortcode(codeId: string) {
    const userShortcodes = this.shortcodes$.value

    for (const shortcode of userShortcodes) {
      if (shortcode.id === codeId) return shortcode
    }

    return null
  }

  createShortcode(shortcode: Shortcode) {
    const userShortcodes = this.shortcodes$.value

    userShortcodes.unshift(shortcode)

    this.shortcodes$.next(userShortcodes)
  }

  deleteShortcode(codeId: string) {
    const userShortcodes = this.shortcodes$.value

    const deletedShortcode = this.findShortcode(codeId)

    const newShortcodes = filter(
      userShortcodes,
      (shortcode) => shortcode !== deletedShortcode
    )

    this.shortcodes$.next(newShortcodes)
  }

  private registerSubscriptions() {
    this.myShortcodesCreated$ = runGQLSubscription({
      query: ShortcodeCreatedDocument,
    }).subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        throw new Error(`Shortcode Create Error ${result.left}`)
      }

      this.createShortcode(result.right.myShortcodesCreated)
    })

    this.myShortcodesRevoked$ = runGQLSubscription({
      query: ShortcodeDeletedDocument,
    }).subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        throw new Error(`Shortcode Delete Error ${result.left}`)
      }

      this.deleteShortcode(result.right.myShortcodesRevoked.id)
    })
  }
}
