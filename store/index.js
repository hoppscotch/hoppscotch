import Vuex from "vuex";
import state from "./state";
import VuexPersist from "vuex-persist";

export default {
  install(Vue) {
    Vue.use(Vuex);

    const vuexLocalStorage = new VuexPersist({
      key: "vuex",
      storage: window.localStorage,
      reducer: ({ ...request }) => ({
        ...request
      })
    });

    const store = new Vuex.Store({
      state,
      plugins: [vuexLocalStorage.plugin]
    });

    Vue.prototype.$store = store;
  }
};
