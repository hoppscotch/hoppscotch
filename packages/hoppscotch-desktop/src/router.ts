import { createRouter, createWebHistory } from "vue-router"
import { invoke } from "@tauri-apps/api/core"

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: async () => {
        try {
          const isPortable = await invoke<boolean>("is_portable_mode")
          // Dynamic import because otherwise `updater`
          // tends to experience weird race conditions,
          // not sure how or why
          return isPortable
            ? import("./views/PortableHome.vue")
            : import("./views/StandardHome.vue")
        } catch (error) {
          console.error(
            "Failed to detect portable mode, defaulting to standard:",
            error
          )

          return import("./views/StandardHome.vue")
        }
      },
    },
  ],
})

export default router
