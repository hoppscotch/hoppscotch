import { ApolloClient, HttpLink, InMemoryCache, split } from "@apollo/client/core";
import { WebSocketLink } from "@apollo/client/link/ws";
import { setContext } from '@apollo/client/link/context';
import { fb } from "./fb";
import { getMainDefinition } from "@apollo/client/utilities";

/**
 * Stores the current authentication token
 *
 * The token stored here is the Firebase Auth token.
 * If null, no token is passed (no user signed in)
 */
let authToken: string | null = null;

/*
 * Updates the token value on Firebase ID Token changes
 */
fb.idToken$.subscribe(newToken => {
  authToken = newToken;
});

/**
 * Injects auth token if available
 */
const authLink = setContext((_, { headers }) => {
  if (authToken) {
    return {
      headers: {
        ...headers,
        authorization: `Bearer ${authToken}`
      }
    }
  } else {
    return {
      headers
    }
  }
})


const httpLink = new HttpLink({
  uri: process.env.CONTEXT === "production" 
    ? "https://api.hoppscotch.io/graphql"
    : "https://api.hoppscotch.io/graphql",
})


const wsLink = new WebSocketLink({
  uri: process.env.CONTEXT === "production"
    ? "wss://api.hoppscotch.io/graphql"
    : "wss://api.hoppscotch.io/graphql",
  options: {
    lazy: true,
    reconnect: true,
    timeout: 300,
    connectionParams: () => {
      return {
        authorization: `Bearer ${authToken}`
      }
    }
  }
});

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    )
  }, 
  wsLink, 
  httpLink 
);

export const apolloClient = new ApolloClient({
  link: authLink.concat(splitLink),
  cache: new InMemoryCache(),
  defaultOptions: {
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'ignore'
    },
    watchQuery: {
      fetchPolicy: 'network-only',
      errorPolicy: 'ignore'
    }
  }
});
