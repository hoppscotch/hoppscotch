import Vue from "vue"
import VueTippy, { TippyComponent } from "vue-tippy"

Vue.use(VueTippy, {
  a11y: false,
  animateFill: false,
  arrowType: "round",
})
Vue.component("Tippy", TippyComponent)
