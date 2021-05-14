import { ApolloClient, HttpLink, InMemoryCache, split } from "@apollo/client/core"
import { WebSocketLink } from "@apollo/client/link/ws"
import { setContext } from "@apollo/client/link/context"
import { fb } from "./fb"
import { getMainDefinition } from "@apollo/client/utilities"

/**
 * Injects auth token if available
 */
const authLink = setContext((_, { headers }) => {
  if (fb.idToken) {
    return {
      headers: {
        ...headers,
        authorization: `Bearer ${fb.idToken}`,
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
      if (fb.idToken) {
        return {}
      } else {
        return {
          authorization: `Bearer ${fb.idToken}`,
        }
      }
    },
  },
})

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query)
    return definition.kind === "OperationDefinition" && definition.operation === "subscription"
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
