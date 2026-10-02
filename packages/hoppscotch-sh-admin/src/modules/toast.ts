// The package's d.ts default-exports the `Plugin` *type* rather than a value,
// so TypeScript can't see the import being used at runtime.
// @ts-expect-error see above
import Toasted from '@hoppscotch/vue-toasted';
import type { ToastOptions } from '@hoppscotch/vue-toasted';
import { HoppModule } from '.';

import '@hoppscotch/vue-toasted/style.css';

// We are using a fork of Vue Toasted (github.com/clayzar/vue-toasted) which is a bit of
// an untrusted fork, we will either want to make our own fork or move to a more stable one
// The original Vue Toasted doesn't support Vue 3 and the OP has been irresponsive.

export default <HoppModule>{
  onVueAppInit(app) {
    // @ts-expect-error see the import above
    app.use(Toasted, <ToastOptions>{
      position: 'bottom-center',
      duration: 3000,
      keepOnHover: true,
    });
  },
};
