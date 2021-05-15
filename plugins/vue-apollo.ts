import Vue from "vue"
import VueApollo from "vue-apollo"
import { apolloClient } from "~/helpers/apollo";

const vueApolloProvider = new VueApollo({
  defaultClient: apolloClient as any
});

Vue.use(VueApollo);

export default (ctx: any) => {
  const { app } = ctx

  app.apolloProvider = vueApolloProvider
}
