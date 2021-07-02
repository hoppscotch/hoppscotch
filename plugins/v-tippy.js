import Vue from "vue"
import VueTippy, { TippyComponent } from "vue-tippy"

Vue.use(VueTippy, {
  animateFill: false,
  interactive: true,
})
Vue.component("Tippy", TippyComponent)
