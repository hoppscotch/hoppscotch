import {
  computed,
  ref,
  onMounted,
  onBeforeUnmount,
  reactive,
  Ref,
} from "@nuxtjs/composition-api"
import {
  createClient,
  TypedDocumentNode,
  OperationResult,
  dedupExchange,
  OperationContext,
  fetchExchange,
  makeOperation,
} from "@urql/core"
import { authExchange } from "@urql/exchange-auth"
import { offlineExchange } from "@urql/exchange-graphcache"
import { makeDefaultStorage } from "@urql/exchange-graphcache/default-storage"
import { devtoolsExchange } from "@urql/devtools"
import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { pipe, constVoid } from "fp-ts/function"
import { subscribe } from "wonka"
import clone from "lodash/clone"
import { keyDefs } from "./caching/keys"
import { optimisticDefs } from "./caching/optimistic"
import { updatesDef } from "./caching/updates"
import { resolversDef } from "./caching/resolvers"
import schema from "./backend-schema.json"
import {
  getAuthIDToken,
  probableUser$,
  waitProbableLoginToConfirm,
} from "~/helpers/fb/auth"

const BACKEND_GQL_URL =
  process.env.CONTEXT === "production"
    ? "https://api.hoppscotch.io/graphql"
    : "https://api.hoppscotch.io/graphql"

const storage = makeDefaultStorage({
  idbName: "hoppcache-v1",
  maxAge: 7,
})

const client = createClient({
  url: BACKEND_GQL_URL,
  exchanges: [
    devtoolsExchange,
    dedupExchange,
    offlineExchange({
      schema: schema as any,
      keys: keyDefs,
      optimistic: optimisticDefs,
      updates: updatesDef,
      resolvers: resolversDef,
      storage,
    }),
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
  ],
})

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

const DEFAULT_QUERY_OPTIONS = {
  noPolling: false,
  pause: undefined as Ref<boolean> | undefined,
}

type GQL_QUERY_OPTIONS = typeof DEFAULT_QUERY_OPTIONS

type UseQueryLoading = {
  loading: true
}

type UseQueryLoaded<
  QueryFailType extends string = "",
  QueryReturnType = any
  > = {
    loading: false
    data: E.Either<GQLError<QueryFailType>, QueryReturnType>
  }

type UseQueryReturn<QueryFailType extends string = "", QueryReturnType = any> =
  | UseQueryLoading
  | UseQueryLoaded<QueryFailType, QueryReturnType>

export function isLoadedGQLQuery<QueryFailType extends string, QueryReturnType>(
  x: UseQueryReturn<QueryFailType, QueryReturnType>
): x is {
  loading: false
  data: E.Either<GQLError<QueryFailType>, QueryReturnType>
} {
  return !x.loading
}

export function useGQLQuery<
  QueryReturnType = any,
  QueryVariables extends object = {},
  QueryFailType extends string = ""
>(
  query: TypedDocumentNode<QueryReturnType, QueryVariables>,
  variables?: QueryVariables,
  options: Partial<GQL_QUERY_OPTIONS> = DEFAULT_QUERY_OPTIONS
):
  | { loading: false; data: E.Either<GQLError<QueryFailType>, QueryReturnType> }
  | { loading: true } {
  type DataType = E.Either<GQLError<QueryFailType>, QueryReturnType>

  const finalOptions = Object.assign(clone(DEFAULT_QUERY_OPTIONS), options)

  const data = ref<DataType>()

  let subscription: { unsubscribe(): void } | null = null

  onMounted(() => {
    const gqlQuery = client.query<any, QueryVariables>(query, variables, {
      requestPolicy: "cache-and-network",
    })

    const processResult = (result: OperationResult<any, QueryVariables>) =>
      pipe(
        // The target
        result.data as QueryReturnType | undefined,
        // Define what happens if data does not exist (it is an error)
        E.fromNullable(
          pipe(
            // Take the network error value
            result.error?.networkError,
            // If it null, set the left to the generic error name
            E.fromNullable(result.error?.message),
            E.match(
              // The left case (network error was null)
              (gqlErr) =>
                <GQLError<QueryFailType>>{
                  type: "gql_error",
                  error: gqlErr as QueryFailType,
                },
              // The right case (it was a GraphQL Error)
              (networkErr) =>
                <GQLError<QueryFailType>>{
                  type: "network_error",
                  error: networkErr,
                }
            )
          )
        )
      )

    if (finalOptions.noPolling) {
      gqlQuery.toPromise().then((result) => {
        data.value = processResult(result)
      })
    } else {
      subscription = pipe(
        gqlQuery,
        subscribe((result) => {
          data.value = processResult(result)
        })
      )
    }
  })

  onBeforeUnmount(() => {
    subscription?.unsubscribe()
  })

  return reactive({
    loading: computed(() => !data.value),
    data: data!,
  }) as
    | {
      loading: false
      data: DataType
    }
    | { loading: true }
}

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
        client
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
            E.fromNullable(result.error?.name),
            E.match(
              // The left case (network error was null)
              (gqlErr) =>
                <GQLError<DocErrors>>{
                  type: "gql_error",
                  error: gqlErr,
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
