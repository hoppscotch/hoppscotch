import { authExchange } from '@urql/exchange-auth';
import urql, { cacheExchange, createClient, fetchExchange } from '@urql/vue';
import { createApp, h } from 'vue';
import App from './App.vue';
import ErrorComponent from './pages/_.vue';

// STYLES
import '@fontsource-variable/inter';
import '@fontsource-variable/material-symbols-rounded';
import '@fontsource-variable/roboto-mono';
import '@hoppscotch/ui/style.css';
import '../assets/scss/styles.scss';
import '../assets/scss/tailwind.scss';
// END STYLES

import * as O from 'fp-ts/Option';
import { auth } from './helpers/auth';
import { GRAPHQL_UNAUTHORIZED } from './helpers/errors';
import { HOPP_MODULES } from './modules';

/**
 * Maximum number of consecutive auth refresh failures before signing the user out.
 * Prevents infinite retry loops when tokens are permanently invalid.
 * @see https://github.com/hoppscotch/hoppscotch/issues/5885
 */
const AUTH_REFRESH_MAX_RETRIES = 3;
let authRefreshFailCount = 0;

(async () => {
  try {
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
            // Prevent infinite retry loop when refresh permanently fails (#5885)
            if (authRefreshFailCount >= AUTH_REFRESH_MAX_RETRIES) {
              authRefreshFailCount = 0;
              auth.signOutUser(true);
              return;
            }

            const result = await auth.performAuthRefresh();

            if (O.isSome(result)) {
              authRefreshFailCount = 0;
            } else {
              authRefreshFailCount++;
              if (authRefreshFailCount >= AUTH_REFRESH_MAX_RETRIES) {
                authRefreshFailCount = 0;
                auth.signOutUser(true);
              }
            }
          },
          didAuthError(error, _operation) {
            return error.message === GRAPHQL_UNAUTHORIZED;
          },
        })),
        fetchExchange,
      ],
      preferGetMethod: false,
    });

    // Initialize auth
    await auth.performAuthInit();

    const app = createApp({
      render: () => h(App),
    }).use(urql, urqlClient);

    // Initialize modules
    HOPP_MODULES.forEach((mod) => mod.onVueAppInit?.(app));

    app.mount('#app');
  } catch (error) {
    // Mount the fallback component in case of an error
    createApp({
      render: () =>
        h(ErrorComponent, {
          error: {
            message:
              'Failed to connect to the backend server, make sure the backend is setup correctly',
          },
        }),
    }).mount('#app');
  }
})();
