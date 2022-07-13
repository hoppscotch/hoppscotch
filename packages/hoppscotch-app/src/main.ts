import { pipe } from "fp-ts/function"
import * as A from "fp-ts/Array"
import { createApp } from 'vue'
import { setupLocalPersistence } from "./newstore/localpersistence"
import { performMigrations } from "./helpers/migrations"
import { initializeFirebase } from "./helpers/fb"
import { HoppModule } from "./types"

import 'virtual:windi.css'
import '../assets/scss/themes.scss'
import '../assets/scss/styles.scss'


import App from './App.vue'

const app = createApp(App)

// Some basic work that needs to be done before module inits even
initializeFirebase()
setupLocalPersistence()
performMigrations()


const modules = pipe(
  import.meta.globEager('@modules/*.ts'),
  Object.values,
  A.map(({ default: defaultVal }) => defaultVal as HoppModule)
)

modules.forEach((mod) => mod({
  app
}))

app.mount("#app")

console.info(
  "%cWe ❤︎ open source!",
  "background-color:white;padding:8px 16px;border-radius:8px;font-size:32px;color:red;"
)
console.info(
  "%cContribute: https://github.com/hoppscotch/hoppscotch",
  "background-color:black;padding:4px 8px;border-radius:8px;font-size:16px;color:white;"
)
