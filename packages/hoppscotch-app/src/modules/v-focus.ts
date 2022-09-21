import { nextTick } from "vue"
import { HoppModule } from "."

/*
  Declares a `v-focus` directive that can be used for components
  to acquire focus instantly once mounted
*/

export default <HoppModule>{
  onVueAppInit(app) {
    app.directive("focus", {
      mounted(el) {
        nextTick(() => {
          el.focus()
        })
      },
    })
  },
}
