import {
  computed,
  ref,
  onMounted,
  onBeforeUnmount,
  reactive,
  Ref,
} from "@nuxtjs/composition-api"
import { DocumentNode } from "graphql/language"
import {
  createClient,
  TypedDocumentNode,
  OperationResult,
  defaultExchanges,
} from "@urql/core"
import { devtoolsExchange } from "@urql/devtools"
import * as E from "fp-ts/Either"
import { pipe } from "fp-ts/function"
import { subscribe } from "wonka"
import clone from "lodash/clone"
import { getAuthIDToken } from "~/helpers/fb/auth"

const BACKEND_GQL_URL =
  process.env.CONTEXT === "production"
    ? "https://api.hoppscotch.io/graphql"
    : "https://api.hoppscotch.io/graphql"

const client = createClient({
  url: BACKEND_GQL_URL,
  fetchOptions: () => {
    const token = getAuthIDToken()

    return {
      headers: {
        authorization: token ? `Bearer ${token}` : "",
      },
    }
  },
  exchanges: [devtoolsExchange, ...defaultExchanges],
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
      err: T
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
  QueryFailType extends string = "",
  QueryVariables extends object = {}
>(
  query: string | DocumentNode | TypedDocumentNode<any, QueryVariables>,
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
    const gqlQuery = client.query<any, QueryVariables>(query, variables)

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
            E.fromNullable(result.error?.name),
            E.match(
              // The left case (network error was null)
              (gqlErr) =>
                <GQLError<QueryFailType>>{
                  type: "gql_error",
                  err: gqlErr as QueryFailType,
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
