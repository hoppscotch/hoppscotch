import { Plugin } from '@nuxt/types';
import VuexPersistence from "vuex-persist";

const plugin: Plugin = ({ store }) => {
  new VuexPersistence().plugin(store);
};

export default plugin;
