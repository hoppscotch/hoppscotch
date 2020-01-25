import Vuex from "vuex";
import state from "./state";
import VuexPersist from "vuex-persist";

export default {
  install(Vue: any) {
    Vue.use(Vuex);

    const vuexLocalStorage = new VuexPersist({
      key: "vuex",
      storage: window.localStorage,
      reducer: ({ ...request }: any) => ({
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
