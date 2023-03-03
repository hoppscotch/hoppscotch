import { createApp } from 'vue';
import urql, { createClient } from '@urql/vue';
import App from './App.vue';
import Toasted from '@hoppscotch/vue-toasted';
import type { ToastOptions } from '@hoppscotch/vue-toasted';

// STYLES
import 'virtual:windi.css';
import '@hoppscotch/vue-toasted/style.css';
import '@hoppscotch/ui/style.css';
import '../assets/scss/themes.scss';
import '../assets/scss/styles.scss';
// END STYLES

import {
  createRouter,
  createWebHashHistory,
  createWebHistory,
} from 'vue-router';

import { setupLayouts } from 'virtual:generated-layouts';
import generatedRoutes from 'virtual:generated-pages';

import { plugin as HoppUIPlugin, HoppUIPluginOptions } from '@hoppscotch/ui';

const options: HoppUIPluginOptions = {
  /* Define options here */
};

const routes = setupLayouts(generatedRoutes);

const app = createApp(App).use(
  urql,
  createClient({
    url: import.meta.env.VITE_BACKEND_GQL_URL,
    fetchOptions: () => {
      return {
        credentials: 'include',
      };
    },
  })
);

// We are using a fork of Vue Toasted (github.com/clayzar/vue-toasted) which is a bit of
// an untrusted fork, we will either want to make our own fork or move to a more stable one
// The original Vue Toasted doesn't support Vue 3 and the OP has been irresponsive.
app.use(Toasted, <ToastOptions>{
  position: 'bottom-center',
  duration: 3000,
  keepOnHover: true,
});

app.use(HoppUIPlugin, options);
app.use(
  createRouter({
    history: createWebHistory(),
    routes,
  })
);

app.mount('#app');
