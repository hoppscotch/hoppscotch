// TODO: fix cache
import { ref } from "vue"
import {
  createClient,
  TypedDocumentNode,
  dedupExchange,
  OperationContext,
  fetchExchange,
  makeOperation,
  createRequest,
  subscriptionExchange,
} from "@urql/core"
import { authExchange } from "@urql/exchange-auth"
// import { offlineExchange } from "@urql/exchange-graphcache"
// import { makeDefaultStorage } from "@urql/exchange-graphcache/default-storage"
import { devtoolsExchange } from "@urql/devtools"
import { SubscriptionClient } from "subscriptions-transport-ws"
import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { pipe, constVoid, flow } from "fp-ts/function"
import { subscribe, pipe as wonkaPipe } from "wonka"
import { filter, map, Subject } from "rxjs"
// import { keyDefs } from "./caching/keys"
// import { optimisticDefs } from "./caching/optimistic"
// import { updatesDef } from "./caching/updates"
// import { resolversDef } from "./caching/resolvers"
// import schema from "./backend-schema.json"
import {
  authIdToken$,
  getAuthIDToken,
  probableUser$,
  waitProbableLoginToConfirm,
} from "~/helpers/fb/auth"

const BACKEND_GQL_URL =
  import.meta.env.VITE_BACKEND_GQL_URL ?? "https://api.hoppscotch.io/graphql"
const BACKEND_WS_URL =
  import.meta.env.VITE_BACKEND_WS_URL ?? "wss://api.hoppscotch.io/graphql"

// const storage = makeDefaultStorage({
//   idbName: "hoppcache-v1",
//   maxAge: 7,
// })

const subscriptionClient = new SubscriptionClient(BACKEND_WS_URL, {
  reconnect: true,
  connectionParams: () => {
    return {
      authorization: `Bearer ${authIdToken$.value}`,
    }
  },
})

authIdToken$.subscribe(() => {
  subscriptionClient.client?.close()
})

const createHoppClient = () =>
  createClient({
    url: BACKEND_GQL_URL,
    exchanges: [
      devtoolsExchange,
      dedupExchange,
      // offlineExchange({
      //   schema: schema as any,
      //   keys: keyDefs,
      //   optimistic: optimisticDefs,
      //   updates: updatesDef,
      //   resolvers: resolversDef,
      //   storage,
      // }),
      authExchange({
        addAuthToOperation({ authState, operation }) {
          if (!authState || !authState.authToken) {
            return operation
          }

          const fetchOptions =
            typeof operation.context.fetchOptions === "function"
              ? operation.context.fetchOptions()
              : operation.context.fetchOptions || {}

          return makeOperation(operation.kind, operation, {
            ...operation.context,
            fetchOptions: {
              ...fetchOptions,
              headers: {
                ...fetchOptions.headers,
                Authorization: `Bearer ${authState.authToken}`,
              },
            },
          })
        },
        willAuthError({ authState }) {
          return !authState || !authState.authToken
        },
        getAuth: async () => {
          if (!probableUser$.value) return { authToken: null }

          await waitProbableLoginToConfirm()

          return {
            authToken: getAuthIDToken(),
          }
        },
      }),
      fetchExchange,
      subscriptionExchange({
        forwardSubscription: (operation) =>
          subscriptionClient.request(operation),
      }),
    ],
  })

export const client = ref(createHoppClient())

authIdToken$.subscribe(() => {
  client.value = createHoppClient()
})

type RunQueryOptions<T = any, V = object> = {
  query: TypedDocumentNode<T, V>
  variables?: V
}

/**
 * A wrapper type for defining errors possible in a GQL operation
 */
export type GQLError<T extends string> =
  | {
      type: "network_error"
      error: Error
    }
  | {
      type: "gql_error"
      error: T
    }

export const runGQLQuery = <DocType, DocVarType, DocErrorType extends string>(
  args: RunQueryOptions<DocType, DocVarType>
): Promise<E.Either<GQLError<DocErrorType>, DocType>> => {
  const request = createRequest<DocType, DocVarType>(args.query, args.variables)
  const source = client.value.executeQuery(request, {
    requestPolicy: "network-only",
  })

  return new Promise((resolve) => {
    const sub = wonkaPipe(
      source,
      subscribe((res) => {
        if (sub) {
          sub.unsubscribe()
        }

        pipe(
          // The target
          res.data as DocType | undefined,
          // Define what happens if data does not exist (it is an error)
          E.fromNullable(
            pipe(
              // Take the network error value
              res.error?.networkError,
              // If it null, set the left to the generic error name
              E.fromNullable(res.error?.message),
              E.match(
                // The left case (network error was null)
                (gqlErr) =>
                  <GQLError<DocErrorType>>{
                    type: "gql_error",
                    error: parseGQLErrorString(gqlErr ?? "") as DocErrorType,
                  },
                // The right case (it was a GraphQL Error)
                (networkErr) =>
                  <GQLError<DocErrorType>>{
                    type: "network_error",
                    error: networkErr,
                  }
              )
            )
          ),
          resolve
        )
      })
    )
  })
}

// TODO: The subscription system seems to be firing multiple updates for certain subscriptions.
// Make sure to handle cases if the subscription fires with the same update multiple times
export const runGQLSubscription = <
  DocType,
  DocVarType,
  DocErrorType extends string
>(
  args: RunQueryOptions<DocType, DocVarType>
) => {
  const result$ = new Subject<E.Either<GQLError<DocErrorType>, DocType>>()

  const source = client.value.executeSubscription(
    createRequest(args.query, args.variables)
  )

  const sub = wonkaPipe(
    source,
    subscribe((res) => {
      result$.next(
        pipe(
          // The target
          res.data as DocType | undefined,
          // Define what happens if data does not exist (it is an error)
          E.fromNullable(
            pipe(
              // Take the network error value
              res.error?.networkError,
              // If it null, set the left to the generic error name
              E.fromNullable(res.error?.message),
              E.match(
                // The left case (network error was null)
                (gqlErr) =>
                  <GQLError<DocErrorType>>{
                    type: "gql_error",
                    error: parseGQLErrorString(gqlErr ?? "") as DocErrorType,
                  },
                // The right case (it was a GraphQL Error)
                (networkErr) =>
                  <GQLError<DocErrorType>>{
                    type: "network_error",
                    error: networkErr,
                  }
              )
            )
          )
        )
      )
    })
  )

  // Returns the stream and a subscription handle to unsub
  return [result$, sub] as const
}

/**
 * Same as `runGQLSubscription` but stops the subscription silently
 * if there is an authentication error because of logged out
 */
export const runAuthOnlyGQLSubscription = flow(
  runGQLSubscription,
  ([result$, sub]) => {
    const updatedResult$ = result$.pipe(
      map((res) => {
        if (
          E.isLeft(res) &&
          res.left.type === "gql_error" &&
          res.left.error === "auth/fail"
        ) {
          sub.unsubscribe()
          return null
        } else return res
      }),
      filter((res): res is Exclude<typeof res, null> => res !== null)
    )

    return [updatedResult$, sub] as const
  }
)

export const parseGQLErrorString = (s: string) =>
  s.startsWith("[GraphQL] ") ? s.split("[GraphQL] ")[1] : s

export const runMutation = <
  DocType,
  DocVariables extends object | undefined,
  DocErrors extends string
>(
  mutation: TypedDocumentNode<DocType, DocVariables>,
  variables?: DocVariables,
  additionalConfig?: Partial<OperationContext>
): TE.TaskEither<GQLError<DocErrors>, DocType> =>
  pipe(
    TE.tryCatch(
      () =>
        client.value
          .mutation(mutation, variables, {
            requestPolicy: "cache-and-network",
            ...additionalConfig,
          })
          .toPromise(),
      () => constVoid() as never // The mutation function can never fail, so this will never be called ;)
    ),
    TE.chainEitherK((result) =>
      pipe(
        result.data,
        E.fromNullable(
          // Result is null
          pipe(
            result.error?.networkError,
            E.fromNullable(result.error?.message),
            E.match(
              // The left case (network error was null)
              (gqlErr) =>
                <GQLError<DocErrors>>{
                  type: "gql_error",
                  error: parseGQLErrorString(gqlErr ?? ""),
                },
              // The right case (it was a network error)
              (networkErr) =>
                <GQLError<DocErrors>>{
                  type: "network_error",
                  error: networkErr,
                }
            )
          )
        )
      )
    )
  )
