import * as E from "fp-ts/Either"
import { BehaviorSubject, Subscription } from "rxjs"
import { Subscription as WSubscription } from "wonka"
import { GQLError, runGQLQuery, runGQLSubscription } from "../backend/GQLClient"
import {
  GetUserShortcodesQuery,
  GetUserShortcodesDocument,
  ShortcodeCreatedDocument,
  ShortcodeDeletedDocument,
} from "../backend/graphql"
import { BACKEND_PAGE_SIZE } from "../backend/helpers"
import { Shortcode } from "./Shortcode"

export default class ShortcodeListAdapter {
  error$: BehaviorSubject<GQLError<string> | null>
  loading$: BehaviorSubject<boolean>
  shortcodes$: BehaviorSubject<GetUserShortcodesQuery["myShortcodes"]>
  hasMoreShortcodes$: BehaviorSubject<boolean>

  private timeoutHandle: ReturnType<typeof setTimeout> | null
  private isDispose: boolean

  private myShortcodesCreated: Subscription | null
  private myShortcodesRevoked: Subscription | null

  private myShortcodesCreatedSub: WSubscription | null
  private myShortcodesRevokedSub: WSubscription | null

  constructor(deferInit: boolean = false) {
    this.error$ = new BehaviorSubject<GQLError<string> | null>(null)
    this.loading$ = new BehaviorSubject<boolean>(false)
    this.shortcodes$ = new BehaviorSubject<
      GetUserShortcodesQuery["myShortcodes"]
    >([])
    this.hasMoreShortcodes$ = new BehaviorSubject<boolean>(true)
    this.timeoutHandle = null
    this.isDispose = false
    this.myShortcodesCreated = null
    this.myShortcodesRevoked = null
    this.myShortcodesCreatedSub = null
    this.myShortcodesRevokedSub = null

    if (!deferInit) this.initialize()
  }

  unsubscribeSubscriptions() {
    this.myShortcodesCreated?.unsubscribe()
    this.myShortcodesRevoked?.unsubscribe()
    this.myShortcodesCreatedSub?.unsubscribe()
    this.myShortcodesRevokedSub?.unsubscribe()
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

  fetchList() {
    this.loadMore(true)
  }

  async loadMore(forcedAttempt = false) {
    if (!this.hasMoreShortcodes$.value && !forcedAttempt) return

    this.loading$.next(true)

    const lastCodeID =
      this.shortcodes$.value.length > 0
        ? this.shortcodes$.value[this.shortcodes$.value.length - 1].id
        : undefined

    const result = await runGQLQuery({
      query: GetUserShortcodesDocument,
      variables: {
        cursor: lastCodeID,
      },
    })
    if (E.isLeft(result)) {
      this.error$.next(result.left)
      console.error(result.left)
      this.loading$.next(false)

      throw new Error(`Failed fetching short codes list: ${result.left}`)
    }

    const fetchedResult = result.right.myShortcodes

    this.pushNewShortcodes(fetchedResult)

    if (fetchedResult.length !== BACKEND_PAGE_SIZE) {
      this.hasMoreShortcodes$.next(false)
    }

    this.loading$.next(false)
  }

  private pushNewShortcodes(results: Shortcode[]) {
    const userShortcodes = this.shortcodes$.value

    userShortcodes.push(...results)

    this.shortcodes$.next(userShortcodes)
  }

  private createShortcode(shortcode: Shortcode) {
    const userShortcodes = this.shortcodes$.value

    userShortcodes.unshift(shortcode)

    this.shortcodes$.next(userShortcodes)
  }

  private deleteShortcode(codeId: string) {
    const newShortcodes = this.shortcodes$.value.filter(
      ({ id }) => id !== codeId
    )

    this.shortcodes$.next(newShortcodes)
  }

  private registerSubscriptions() {
    const [myShortcodeCreated$, myShortcodeCreatedSub] = runGQLSubscription({
      query: ShortcodeCreatedDocument,
    })

    this.myShortcodesCreatedSub = myShortcodeCreatedSub
    this.myShortcodesCreated = myShortcodeCreated$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        throw new Error(`Shortcode Create Error ${result.left}`)
      }

      this.createShortcode(result.right.myShortcodesCreated)
    })

    const [myShortcodesRevoked$, myShortcodeRevokedSub] = runGQLSubscription({
      query: ShortcodeDeletedDocument,
    })

    this.myShortcodesRevokedSub = myShortcodeRevokedSub
    this.myShortcodesRevoked = myShortcodesRevoked$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        throw new Error(`Shortcode Delete Error ${result.left}`)
      }

      this.deleteShortcode(result.right.myShortcodesRevoked.id)
    })
  }
}
