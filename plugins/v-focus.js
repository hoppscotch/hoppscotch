import Vue from "vue"

Vue.directive("focus", {
  inserted: (el) => {
    Vue.nextTick(() => el.focus())
  },
})
