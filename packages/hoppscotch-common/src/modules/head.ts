import { createHead, useHead } from "@vueuse/head"
import { APP_INFO } from "~/../meta"
import { HoppModule } from "."

export default <HoppModule>{
  onVueAppInit(app) {
    const head = createHead({
      title: `${APP_INFO.name} • ${APP_INFO.shortDescription}`,
      titleTemplate(title) {
        return title === "Hoppscotch" ? title : `${title} • Hoppscotch`
      },
    })

    app.use(head)
  },

  onRootSetup() {
    // Load the defaults into the app
    useHead({})
  },
}
