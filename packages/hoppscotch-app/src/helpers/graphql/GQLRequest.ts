import {
  GQLHeader,
  HoppGQLAuth,
  HoppGQLRequest,
  makeGQLRequest,
} from "@hoppscotch/data"
import { BehaviorSubject } from "rxjs"
import { GQLEvent } from "./GQLConnection"
import * as gql from "graphql"

export class GQLRequest {
  public name$ = new BehaviorSubject<string>("Untitled Request")
  public url$ = new BehaviorSubject<string>(
    "https://echo.hoppscotch.io/graphql"
  )
  public headers$ = new BehaviorSubject<GQLHeader[]>([])
  public auth$ = new BehaviorSubject<HoppGQLAuth>({
    authType: "none",
    authActive: false,
  })

  public query$ = new BehaviorSubject<string>(`
query Request {
  method
  url
  headers {
    key
    value
  }
}

  `)
  public variables$ = new BehaviorSubject<string>(
    `{
  "id": "1"
}`
  )

  public response$ = new BehaviorSubject<GQLEvent[]>([])
  public operations$ = new BehaviorSubject<gql.OperationDefinitionNode[]>([])

  constructor() {
    this.setOperations(this.query$.value)
  }

  setGQLName(newName: string) {
    this.name$.next(newName)
  }

  setGQLURL(newURL: string) {
    this.url$.next(newURL)
  }

  setGQLHeaders(headers: GQLHeader[]) {
    this.headers$.next(headers)
  }

  clearGQLHeaders() {
    this.headers$.next([])
  }

  setGQLAuth(newAuth: HoppGQLAuth) {
    this.auth$.next(newAuth)
  }

  setGQLQuery(newQuery: string) {
    this.query$.next(newQuery)
    this.setOperations(newQuery)
  }

  setGQLVariables(newVariables: string) {
    this.variables$.next(newVariables)
  }

  setGQLResponse(newResponse: GQLEvent[]) {
    this.response$.next(newResponse)
  }

  setRequest(request: HoppGQLRequest) {
    this.name$.next(request.name ?? "Untitled Request")
    this.url$.next(request.url)
    this.headers$.next(request.headers)
    this.query$.next(request.query)
    this.variables$.next(request.variables)
    this.auth$.next(request.auth)
  }

  setOperations(query: string) {
    try {
      const parsedQuery = gql.parse(query)
      this.operations$.next(
        parsedQuery.definitions as gql.OperationDefinitionNode[]
      )
    } catch (e) {
      // console.log(e)
    }
  }

  getName() {
    return this.name$.value
  }

  getRequest() {
    return makeGQLRequest({
      name: this.name$.value,
      url: this.url$.value,
      headers: this.headers$.value,
      auth: this.auth$.value,
      query: this.query$.value,
      variables: this.variables$.value,
    })
  }
}
