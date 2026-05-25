import { authExchange } from '@urql/exchange-auth';
import urql, { cacheExchange, createClient, fetchExchange } from '@urql/vue';
import { createApp, h } from 'vue';
import * as O from 'fp-ts/Option';
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

import { auth, authEvents$ } from './helpers/auth';
import { GRAPHQL_UNAUTHORIZED } from './helpers/errors';
import { createAuthRetryGuard } from './helpers/retryAuthGuard';
import { HOPP_MODULES } from './modules';

/**
 * Auth retry guard — prevents infinite refreshAuth loops when tokens
 * are permanently invalid. Stays exhausted until the page reloads.
 * @see https://github.com/hoppscotch/hoppscotch/issues/5885
 */
const authRetryGuard = createAuthRetryGuard(() => auth.signOutUser(true));

authEvents$.subscribe((event) => {
  if (event.event === 'login') {
    authRetryGuard.reset();
  }
});

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
            await authRetryGuard.execute(async () => {
              const result = await auth.performAuthRefresh();
              return O.isSome(result);
            });
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
