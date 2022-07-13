import { HoppModule } from "~/types"
import { createRouter, createWebHistory } from "vue-router"
import { setupLayouts } from "virtual:generated-layouts"
import generatedRoutes from "virtual:generated-pages"
import { logPageView } from "~/helpers/fb/analytics"
import { completePageProgress, startPageProgress } from "./loadingbar"

const routes = setupLayouts(generatedRoutes)

const routerModule: HoppModule = ({ app }) => {
  const router = createRouter({
    history: createWebHistory(),
    routes
  })

  router.beforeEach((to, from) => {
    if (to.path !== from.path) {
      startPageProgress()
    }
  })

  // Instead of this a better architecture is for the router
  // module to expose a stream of router events that can be independently
  // subbed to
  router.afterEach((to) => {
    completePageProgress()

    logPageView(to.fullPath)
  })

  app.use(router)
}

export default routerModule
