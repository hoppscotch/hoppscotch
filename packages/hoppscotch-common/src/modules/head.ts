import { createHead, useHead } from "@unhead/vue"
import { APP_INFO } from "~/../meta"
import { HoppModule } from "."

export default <HoppModule>{
  onVueAppInit(app) {
    const head = createHead()

    app.use(head)
  },

  onRootSetup() {
    useHead({
      title: `${APP_INFO.name} • ${APP_INFO.shortDescription}`,
      titleTemplate(title) {
        return title === "Hoppscotch" ? title : `${title} • Hoppscotch`
      },
    })
  },
}
