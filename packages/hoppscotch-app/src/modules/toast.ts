import Toasted from "@clayzar/vue-toasted"
import type { ToastOptions } from "@clayzar/vue-toasted";
import { HoppModule } from "~/types";

// We are using a fork of Vue Toasted (github.com/clayzar/vue-toasted) which is a bit of
// an untrusted fork, we will either want to make our own fork or move to a more stable one
// The original Vue Toasted doesn't support Vue 3 and the OP has been irresponsive.
const toastModule: HoppModule = ({ app }) => {
  app.use(Toasted, <ToastOptions>{
    position: "bottom-center",
    duration: 3000,
    keepOnHover: true
  })
}

export default toastModule
