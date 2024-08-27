import VueClickAway from "vue3-click-away"
import { HoppModule } from "."

/*
  Declares a `v-focus` directive that can be used for components
  to acquire focus instantly once mounted
*/

export default <HoppModule>{
  onVueAppInit(app) {
    app.use(VueClickAway)
  },
}
