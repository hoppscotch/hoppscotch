import { HoppModule } from "~/types";
import NProgress from "nprogress";

export const startPageProgress = () => {
  NProgress.start()
}

export const completePageProgress = () => {
  NProgress.done()
}

export const removePageProgress = () => {
  NProgress.remove()
}

const loadingBarModule: HoppModule = () => {
  // Nothing to bind here
}

export default loadingBarModule
