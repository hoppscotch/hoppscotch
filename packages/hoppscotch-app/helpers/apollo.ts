import {
  ApolloClient,
  HttpLink,
  InMemoryCache,
  QueryOptions,
  OperationVariables,
  split,
  ApolloError,
  isApolloError as _isApolloError,
} from "@apollo/client/core"
import { WebSocketLink } from "@apollo/client/link/ws"
import { setContext } from "@apollo/client/link/context"
import { getMainDefinition } from "@apollo/client/utilities"
import { ref, onMounted, onBeforeUnmount, Ref } from "@nuxtjs/composition-api"
import { authIdToken$ } from "./fb/auth"

let authToken: String | null = null

export function registerApolloAuthUpdate() {
  authIdToken$.subscribe((token) => {
    authToken = token
  })
}

/**
 * Injects auth token if available
 */
const authLink = setContext((_, { headers }) => {
  if (authToken) {
    return {
      headers: {
        ...headers,
        authorization: `Bearer ${authToken}`,
      },
    }
  } else {
    return {
      headers,
    }
  }
})

const httpLink = new HttpLink({
  uri:
    process.env.CONTEXT === "production"
      ? "https://api.hoppscotch.io/graphql"
      : "https://api.hoppscotch.io/graphql",
})

const wsLink = new WebSocketLink({
  uri:
    process.env.CONTEXT === "production"
      ? "wss://api.hoppscotch.io/graphql"
      : "wss://api.hoppscotch.io/graphql",
  options: {
    reconnect: true,
    lazy: true,
    connectionParams: () => {
      return {
        authorization: `Bearer ${authToken}`,
      }
    },
  },
})

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query)
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    )
  },
  wsLink,
  httpLink
)

export const apolloClient = new ApolloClient({
  link: authLink.concat(splitLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: "network-only",
      errorPolicy: "ignore",
    },
    watchQuery: {
      fetchPolicy: "network-only",
      errorPolicy: "ignore",
    },
  },
})

export function isApolloError(x: any): x is ApolloError {
  return _isApolloError(x)
}

export function useGQLQuery<T = any, TVariables = OperationVariables>(
  options: QueryOptions<TVariables, T>
): { loading: Ref<boolean>; data: Ref<T | ApolloError | undefined> } {
  const loading = ref(true)
  const data = ref<T | ApolloError | undefined>()

  let subscription: ZenObservable.Subscription | null = null

  onMounted(() => {
    subscription = apolloClient.watchQuery(options).subscribe((result) => {
      if (result.error) {
        data.value = result.error
      } else {
        data.value = result.data
      }

      loading.value = false
    })
  })

  onBeforeUnmount(() => {
    if (subscription) {
      subscription.unsubscribe()
    }
  })

  return {
    loading,
    data,
  }
}
