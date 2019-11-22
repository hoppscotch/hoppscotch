import VuexPersistence from "vuex-persist"

export default ({ store }) => {
  new VuexPersistence().plugin(store)
}
