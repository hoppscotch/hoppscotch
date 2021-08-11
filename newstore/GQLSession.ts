import { distinctUntilChanged, pluck } from "rxjs/operators"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"

export type GQLHeader = {
  key: string
  value: string
  active: boolean
}

type GQLSession = {
  url: string
  connected: boolean
  headers: GQLHeader[]
  schema: string
  query: string
  variables: string
  response: string
}

const defaultGQLSession: GQLSession = {
  url: "https://rickandmortyapi.com/graphql",
  connected: false,
  headers: [],
  schema: "",
  query: `query GetCharacter($id: ID!) {
  character(id: $id) {
    id
    name
  }
}`,
  variables: `{ "id": "1" }`,
  response: "",
}

const dispatchers = defineDispatchers({
  setURL(_: GQLSession, { newURL }: { newURL: string }) {
    return {
      url: newURL,
    }
  },
  setConnected(_: GQLSession, { newStatus }: { newStatus: boolean }) {
    return {
      connected: newStatus,
    }
  },
  setHeaders(_, { headers }: { headers: GQLHeader[] }) {
    return {
      headers,
    }
  },
  addHeader(curr: GQLSession, { header }: { header: GQLHeader }) {
    return {
      headers: [...curr.headers, header],
    }
  },
  removeHeader(curr: GQLSession, { headerIndex }: { headerIndex: number }) {
    return {
      headers: curr.headers.filter((_x, i) => i !== headerIndex),
    }
  },
  updateHeader(
    curr: GQLSession,
    {
      headerIndex,
      updatedHeader,
    }: { headerIndex: number; updatedHeader: GQLHeader }
  ) {
    return {
      headers: curr.headers.map((x, i) =>
        i === headerIndex ? updatedHeader : x
      ),
    }
  },
  setQuery(_: GQLSession, { newQuery }: { newQuery: string }) {
    return {
      query: newQuery,
    }
  },
  setVariables(_: GQLSession, { newVariables }: { newVariables: string }) {
    return {
      variables: newVariables,
    }
  },
  setResponse(_: GQLSession, { newResponse }: { newResponse: string }) {
    return {
      response: newResponse,
    }
  },
})

export const gqlSessionStore = new DispatchingStore(
  defaultGQLSession,
  dispatchers
)

export function setGQLURL(newURL: string) {
  gqlSessionStore.dispatch({
    dispatcher: "setURL",
    payload: {
      newURL,
    },
  })
}

export function setGQLConnected(newStatus: boolean) {
  gqlSessionStore.dispatch({
    dispatcher: "setConnected",
    payload: {
      newStatus,
    },
  })
}

export function setGQLHeaders(headers: GQLHeader[]) {
  gqlSessionStore.dispatch({
    dispatcher: "setHeaders",
    payload: {
      headers,
    },
  })
}

export function addGQLHeader(header: GQLHeader) {
  gqlSessionStore.dispatch({
    dispatcher: "addHeader",
    payload: {
      header,
    },
  })
}

export function updateGQLHeader(headerIndex: number, updatedHeader: GQLHeader) {
  gqlSessionStore.dispatch({
    dispatcher: "updateHeader",
    payload: {
      headerIndex,
      updatedHeader,
    },
  })
}

export function removeGQLHeader(headerIndex: number) {
  gqlSessionStore.dispatch({
    dispatcher: "removeHeader",
    payload: {
      headerIndex,
    },
  })
}

export function clearGQLHeaders() {
  gqlSessionStore.dispatch({
    dispatcher: "setHeaders",
    payload: {
      headers: [],
    },
  })
}

export function setGQLQuery(newQuery: string) {
  gqlSessionStore.dispatch({
    dispatcher: "setQuery",
    payload: {
      newQuery,
    },
  })
}

export function setGQLVariables(newVariables: string) {
  gqlSessionStore.dispatch({
    dispatcher: "setVariables",
    payload: {
      newVariables,
    },
  })
}

export function setGQLResponse(newResponse: string) {
  gqlSessionStore.dispatch({
    dispatcher: "setResponse",
    payload: {
      newResponse,
    },
  })
}

export const gqlURL$ = gqlSessionStore.subject$.pipe(
  pluck("url"),
  distinctUntilChanged()
)
export const gqlConnected$ = gqlSessionStore.subject$.pipe(
  pluck("connected"),
  distinctUntilChanged()
)
export const gqlQuery$ = gqlSessionStore.subject$.pipe(
  pluck("query"),
  distinctUntilChanged()
)
export const gqlVariables$ = gqlSessionStore.subject$.pipe(
  pluck("variables"),
  distinctUntilChanged()
)
export const gqlHeaders$ = gqlSessionStore.subject$.pipe(
  pluck("headers"),
  distinctUntilChanged()
)

export const gqlResponse$ = gqlSessionStore.subject$.pipe(
  pluck("response"),
  distinctUntilChanged()
)
