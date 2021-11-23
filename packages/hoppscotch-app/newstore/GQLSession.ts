import { distinctUntilChanged, pluck } from "rxjs/operators"
import { GQLHeader, HoppGQLRequest, makeGQLRequest } from "@hoppscotch/data"
import DispatchingStore, { defineDispatchers } from "./DispatchingStore"
import { useStream } from "~/helpers/utils/composables"

type GQLSession = {
  request: HoppGQLRequest
  schema: string
  response: string
}

export const defaultGQLSession: GQLSession = {
  request: makeGQLRequest({
    name: "",
    url: "https://echo.hoppscotch.io/graphql",
    headers: [],
    variables: `{ "id": "1" }`,
    query: `query Request {
  method
  url
  headers {
    key
    value
  }
}
`,
  }),
  schema: "",
  response: "",
}

const dispatchers = defineDispatchers({
  setSession(_: GQLSession, { session }: { session: GQLSession }) {
    return session
  },
  setName(curr: GQLSession, { newName }: { newName: string }) {
    return {
      request: {
        ...curr.request,
        name: newName,
      },
    }
  },
  setURL(curr: GQLSession, { newURL }: { newURL: string }) {
    return {
      request: {
        ...curr.request,
        url: newURL,
      },
    }
  },
  setHeaders(curr: GQLSession, { headers }: { headers: GQLHeader[] }) {
    return {
      request: {
        ...curr.request,
        headers,
      },
    }
  },
  addHeader(curr: GQLSession, { header }: { header: GQLHeader }) {
    return {
      request: {
        ...curr.request,
        headers: [...curr.request.headers, header],
      },
    }
  },
  removeHeader(curr: GQLSession, { headerIndex }: { headerIndex: number }) {
    return {
      request: {
        ...curr.request,
        headers: curr.request.headers.filter((_x, i) => i !== headerIndex),
      },
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
      request: {
        ...curr.request,
        headers: curr.request.headers.map((x, i) =>
          i === headerIndex ? updatedHeader : x
        ),
      },
    }
  },
  setQuery(curr: GQLSession, { newQuery }: { newQuery: string }) {
    return {
      request: {
        ...curr.request,
        query: newQuery,
      },
    }
  },
  setVariables(curr: GQLSession, { newVariables }: { newVariables: string }) {
    return {
      request: {
        ...curr.request,
        variables: newVariables,
      },
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

export function getGQLSession() {
  return gqlSessionStore.value
}

export function setGQLSession(session: GQLSession) {
  gqlSessionStore.dispatch({
    dispatcher: "setSession",
    payload: {
      session,
    },
  })
}

export function useGQLRequestName() {
  return useStream(gqlName$, "", (newName) => {
    gqlSessionStore.dispatch({
      dispatcher: "setName",
      payload: { newName },
    })
  })
}

export const gqlName$ = gqlSessionStore.subject$.pipe(
  pluck("request", "name"),
  distinctUntilChanged()
)
export const gqlURL$ = gqlSessionStore.subject$.pipe(
  pluck("request", "url"),
  distinctUntilChanged()
)
export const gqlQuery$ = gqlSessionStore.subject$.pipe(
  pluck("request", "query"),
  distinctUntilChanged()
)
export const gqlVariables$ = gqlSessionStore.subject$.pipe(
  pluck("request", "variables"),
  distinctUntilChanged()
)
export const gqlHeaders$ = gqlSessionStore.subject$.pipe(
  pluck("request", "headers"),
  distinctUntilChanged()
)

export const gqlResponse$ = gqlSessionStore.subject$.pipe(
  pluck("response"),
  distinctUntilChanged()
)
