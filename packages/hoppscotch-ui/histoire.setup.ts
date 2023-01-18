import "./src/assets/scss/styles.scss"
import "./src/assets/scss/themes.scss"
import "virtual:windi.css"

export function setupVue3({ app }) {
  app.provide("test", "hello")
  // app.use(...)
}
