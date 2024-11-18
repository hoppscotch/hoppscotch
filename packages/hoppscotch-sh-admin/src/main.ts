import { createApp, h } from 'vue';
import urql, { createClient, cacheExchange, fetchExchange } from '@urql/vue';
import { authExchange } from '@urql/exchange-auth';
import App from './App.vue';
import ErrorComponent from './pages/_.vue';

// STYLES
import '@hoppscotch/ui/style.css';
import '../assets/scss/styles.scss';
import '../assets/scss/tailwind.scss';
import '@fontsource-variable/inter';
import '@fontsource-variable/material-symbols-rounded';
import '@fontsource-variable/roboto-mono';
// END STYLES

import { HOPP_MODULES } from './modules';
import { auth } from './helpers/auth';
import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import { ErrorPageData, GRAPHQL_UNAUTHORIZED } from './helpers/errors';

(async () => {
  try {
    // Initialize auth
    await auth.performAuthInit();

    // Create URQL client
    const urqlClient = createClient({
      url: import.meta.env.VITE_BACKEND_GQL_URL,
      requestPolicy: 'network-only',
      fetchOptions: () => ({
        credentials: 'include',
      }),
      exchanges: [
        cacheExchange,
        authExchange(async () => ({
          addAuthToOperation(operation) {
            return operation;
          },
          async refreshAuth() {
            pipe(
              await auth.performAuthRefresh(),
              O.getOrElseW(() => auth.signOutUser(true))
            );
          },
          didAuthError(error, _operation) {
            return error.message === GRAPHQL_UNAUTHORIZED;
          },
        })),
        fetchExchange,
      ],
    });

    // Execute a test query to check backend availability
    const testQuery = `
      query {
        __typename
      }
    `;
    const result = await urqlClient.query(testQuery, {}).toPromise();

    if (result.error) {
      throw new Error('Backend server error');
    }

    // If the query is successful, mount the main application
    const app = createApp({
      render: () => h(App),
    }).use(urql, urqlClient);

    // Initialize modules
    HOPP_MODULES.forEach((mod) => mod.onVueAppInit?.(app));

    app.mount('#app');
  } catch (error) {
    console.error('Error during initialization:', error);
    console.log(error);

    const errorData = {
      message:
        'Failed to connect to the backend server, make sure the backend is setup correctly',
    };

    // Mount the fallback component in case of an error
    createApp({
      render: () =>
        h(ErrorComponent, { error: errorData as ErrorPageData | null }),
    }).mount('#app');
  }
})();
