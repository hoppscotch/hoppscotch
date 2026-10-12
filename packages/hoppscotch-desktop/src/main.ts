import { createApp } from "vue"
import App from "./App.vue"
import router from "./router"

import "@hoppscotch/ui/style.css"
import "./assets/scss/styles.scss"
import "./assets/scss/tailwind.scss"
import "@fontsource-variable/inter"
import "@fontsource-variable/material-symbols-rounded"
import "@fontsource-variable/roboto-mono"

import { initKernel } from "@hoppscotch/kernel"
import { useDesktopZoomEffect } from "@hoppscotch/common/composables/desktop-zoom"

const app = createApp(App)
app.use(router)
app.mount("#app")

initKernel("desktop")

// Sync the launcher window's zoom with the user's persisted preference.
// The same composable is wired into the bundled selfhost-web entry so the
// post-connect window picks up the same value. Each call owns the
// watcher for its own window, the store is the shared source of truth.
useDesktopZoomEffect()
