import * as E from "fp-ts/Either"
import { BehaviorSubject, Subscription } from "rxjs"
import { Subscription as WSubscription } from "wonka"
import {
  GQLError,
  runAuthOnlyGQLSubscription,
  runGQLQuery,
} from "../backend/GQLClient"
import {
  GetUserShortcodesQuery,
  GetUserShortcodesDocument,
  ShortcodeCreatedDocument,
  ShortcodeDeletedDocument,
} from "../backend/graphql"
import { BACKEND_PAGE_SIZE } from "../backend/helpers"
import { SharedRequest } from "./SharedRequest"

export default class SharedRequestListAdapter {
  error$: BehaviorSubject<GQLError<string> | null>
  loading$: BehaviorSubject<boolean>
  sharedRequest$: BehaviorSubject<GetUserShortcodesQuery["myShortcodes"]>
  hasMoreSharedRequest$: BehaviorSubject<boolean>

  private isDispose: boolean

  private sharedRequestCreated: Subscription | null
  private sharedRequestRevoked: Subscription | null

  private sharedRequestCreatedSub: WSubscription | null
  private sharedRequestRevokedSub: WSubscription | null

  constructor(deferInit = false) {
    this.error$ = new BehaviorSubject<GQLError<string> | null>(null)
    this.loading$ = new BehaviorSubject<boolean>(false)
    this.sharedRequest$ = new BehaviorSubject<
      GetUserShortcodesQuery["myShortcodes"]
    >([])
    this.hasMoreSharedRequest$ = new BehaviorSubject<boolean>(true)
    this.isDispose = true
    this.sharedRequestCreated = null
    this.sharedRequestRevoked = null
    this.sharedRequestCreatedSub = null
    this.sharedRequestRevokedSub = null

    if (!deferInit) this.initialize()
  }

  unsubscribeSubscriptions() {
    this.sharedRequestCreated?.unsubscribe()
    this.sharedRequestRevoked?.unsubscribe()
    this.sharedRequestCreatedSub?.unsubscribe()
    this.sharedRequestRevokedSub?.unsubscribe()
  }

  initialize() {
    if (!this.isDispose) throw new Error(`Adapter is already initialized`)

    this.fetchList()
    this.registerSubscriptions()
  }

  /**
   * Returns whether the shared request adapter is active and initialized
   */
  public isInitialized() {
    return !this.isDispose
  }

  public dispose() {
    if (this.isDispose) throw new Error(`Adapter has been disposed`)

    this.isDispose = true
    this.unsubscribeSubscriptions()
  }

  fetchList() {
    this.loadMore(true)
  }

  async loadMore(forcedAttempt = false) {
    if (!this.hasMoreSharedRequest$.value && !forcedAttempt) return

    this.loading$.next(true)

    const lastCodeID =
      this.sharedRequest$.value.length > 0
        ? this.sharedRequest$.value[this.sharedRequest$.value.length - 1].id
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

      throw new Error(`Failed fetching shared request list: ${result.left}`)
    }

    const fetchedResult = result.right.myShortcodes

    this.pushNewSharedRequest(fetchedResult)

    if (fetchedResult.length !== BACKEND_PAGE_SIZE) {
      this.hasMoreSharedRequest$.next(false)
    }

    this.loading$.next(false)
  }

  private pushNewSharedRequest(results: SharedRequest[]) {
    const userShortcodes = this.sharedRequest$.value

    userShortcodes.push(...results)

    this.sharedRequest$.next(userShortcodes)
  }

  private createSharedRequest(sharedRequest: SharedRequest) {
    const userSharedRequest = this.sharedRequest$.value

    userSharedRequest.unshift(sharedRequest)

    this.sharedRequest$.next(userSharedRequest)
  }

  private deleteSharedRequest(codeId: string) {
    const newSharedRequest = this.sharedRequest$.value.filter(
      ({ id }) => id !== codeId
    )

    this.sharedRequest$.next(newSharedRequest)
  }

  private registerSubscriptions() {
    const [sharedRequestCreated$, sharedRequestCreatedSub] =
      runAuthOnlyGQLSubscription({
        query: ShortcodeCreatedDocument,
      })

    this.sharedRequestCreatedSub = sharedRequestCreatedSub
    this.sharedRequestCreated = sharedRequestCreated$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        throw new Error(`Shared Request Create Error ${result.left}`)
      }

      this.createSharedRequest(result.right.myShortcodesCreated)
    })

    const [sharedRequestRevoked$, sharedRequestRevokedSub] =
      runAuthOnlyGQLSubscription({
        query: ShortcodeDeletedDocument,
      })

    this.sharedRequestRevokedSub = sharedRequestRevokedSub
    this.sharedRequestRevoked = sharedRequestRevoked$.subscribe((result) => {
      if (E.isLeft(result)) {
        console.error(result.left)
        throw new Error(`Shared Request Delete Error ${result.left}`)
      }

      this.deleteSharedRequest(result.right.myShortcodesRevoked.id)
    })
  }
}
