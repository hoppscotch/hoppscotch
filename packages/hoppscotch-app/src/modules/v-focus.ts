import { nextTick } from "vue";
import { HoppModule } from "~/types";

/*
  Declares a `v-focus` directive that can be used for components
  to acquire focus instantly once mounted
*/

const focusDirectiveModule: HoppModule = ({ app }) => {
  app.directive('focus', {
    mounted(el) {
      nextTick(() => {
        el.focus()
      })
    }
  })
}

export default focusDirectiveModule
