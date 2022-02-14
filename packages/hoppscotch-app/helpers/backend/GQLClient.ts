// TODO: fix cache
import {
  ref,
  reactive,
  Ref,
  unref,
  watchEffect,
  watchSyncEffect,
  WatchStopHandle,
  set,
  isRef,
} from "@nuxtjs/composition-api"
import {
  createClient,
  TypedDocumentNode,
  OperationResult,
  dedupExchange,
  OperationContext,
  fetchExchange,
  makeOperation,
  GraphQLRequest,
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
import { pipe, constVoid } from "fp-ts/function"
import { Source, subscribe, pipe as wonkaPipe, onEnd } from "wonka"
import { Subject } from "rxjs"
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
  process.env.context === "production"
    ? "https://api.hoppscotch.io/graphql"
    : "https://api.hoppscotch.io/graphql"

// const storage = makeDefaultStorage({
//   idbName: "hoppcache-v1",
//   maxAge: 7,
// })

const subscriptionClient = new SubscriptionClient(
  process.env.context === "production"
    ? "wss://api.hoppscotch.io/graphql"
    : "wss://api.hoppscotch.io/graphql",
  {
    reconnect: true,
    connectionParams: () => {
      return {
        authorization: `Bearer ${authIdToken$.value}`,
      }
    },
  }
)

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

type MaybeRef<X> = X | Ref<X>

type UseQueryOptions<T = any, V = object> = {
  query: TypedDocumentNode<T, V>
  variables?: MaybeRef<V>

  updateSubs?: MaybeRef<GraphQLRequest<any, object>[]>
  defer?: boolean
  pollDuration?: number | undefined
}

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

  wonkaPipe(
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

  return result$
}

export const useGQLQuery = <DocType, DocVarType, DocErrorType extends string>(
  _args: UseQueryOptions<DocType, DocVarType>
) => {
  const stops: WatchStopHandle[] = []

  const args = reactive(_args)

  const loading: Ref<boolean> = ref(true)
  const isStale: Ref<boolean> = ref(true)
  const data: Ref<E.Either<GQLError<DocErrorType>, DocType>> = ref() as any

  if (!args.updateSubs) set(args, "updateSubs", [])

  const isPaused: Ref<boolean> = ref(args.defer ?? false)

  const pollDuration: Ref<number | null> = ref(args.pollDuration ?? null)

  const request: Ref<GraphQLRequest<DocType, DocVarType>> = ref(
    createRequest<DocType, DocVarType>(
      args.query,
      unref<DocVarType>(args.variables as any) as any
    )
  ) as any

  const source: Ref<Source<OperationResult> | undefined> = ref()

  // A ref used to force re-execution of the query
  const updateTicker: Ref<boolean> = ref(true)

  // Toggles between true and false to cause the polling operation to tick
  const pollerTick: Ref<boolean> = ref(true)

  stops.push(
    watchEffect((onInvalidate) => {
      if (pollDuration.value !== null && !isPaused.value) {
        const handle = setInterval(() => {
          pollerTick.value = !pollerTick.value
        }, pollDuration.value)

        onInvalidate(() => {
          clearInterval(handle)
        })
      }
    })
  )

  stops.push(
    watchEffect(
      () => {
        const newRequest = createRequest<DocType, DocVarType>(
          args.query,
          unref<DocVarType>(args.variables as any) as any
        )

        if (request.value.key !== newRequest.key) {
          request.value = newRequest
        }
      },
      { flush: "pre" }
    )
  )

  stops.push(
    watchEffect(
      () => {
        // Just listen to the polling ticks
        // eslint-disable-next-line no-unused-expressions
        pollerTick.value

        // Just keep track of update ticking, but don't do anything
        // eslint-disable-next-line no-unused-expressions
        updateTicker.value

        source.value = !isPaused.value
          ? client.value.executeQuery<DocType, DocVarType>(request.value, {
              requestPolicy: "network-only",
            })
          : undefined
      },
      { flush: "pre" }
    )
  )

  watchSyncEffect((onInvalidate) => {
    if (source.value) {
      loading.value = true
      isStale.value = false

      const invalidateStops = args.updateSubs!.map((sub) => {
        return wonkaPipe(
          client.value.executeSubscription(sub),
          onEnd(() => {
            if (source.value) execute()
          }),
          subscribe(() => {
            return execute()
          })
        ).unsubscribe
      })

      invalidateStops.push(
        wonkaPipe(
          source.value,
          onEnd(() => {
            loading.value = false
            isStale.value = false
          }),
          subscribe((res) => {
            if (res.operation.key === request.value.key) {
              data.value = pipe(
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
                          error: parseGQLErrorString(
                            gqlErr ?? ""
                          ) as DocErrorType,
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
              loading.value = false
            }
          })
        ).unsubscribe
      )

      onInvalidate(() => invalidateStops.forEach((unsub) => unsub()))
    }
  })

  const execute = (updatedVars?: DocVarType) => {
    if (updatedVars) {
      if (isRef(args.variables)) {
        args.variables.value = updatedVars
      } else {
        set(args, "variables", updatedVars)
      }
    }

    isPaused.value = false
    updateTicker.value = !updateTicker.value
  }

  const pause = () => {
    isPaused.value = true
  }

  const unpause = () => {
    isPaused.value = false
  }

  const response = reactive({
    loading,
    data,
    pause,
    unpause,
    isStale,
    execute,
  })

  return response
}

const parseGQLErrorString = (s: string) =>
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
