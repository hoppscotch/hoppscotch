import Toasted from '@hoppscotch/vue-toasted';
import type { ToastOptions } from '@hoppscotch/vue-toasted';
import { HoppModule } from '.';

import '@hoppscotch/vue-toasted/style.css';

// We are using a fork of Vue Toasted (github.com/clayzar/vue-toasted) which is a bit of
// an untrusted fork, we will either want to make our own fork or move to a more stable one
// The original Vue Toasted doesn't support Vue 3 and the OP has been irresponsive.

export default <HoppModule>{
  onVueAppInit(app) {
    app.use(Toasted, <ToastOptions>{
      position: 'bottom-center',
      duration: 3000,
      keepOnHover: true,
    });
  },
};
