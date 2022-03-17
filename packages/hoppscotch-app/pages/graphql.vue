<template>
  <AppPaneLayout>
    <template #primary>
      <GraphqlRequest :conn="gqlConn" />
      <GraphqlRequestOptions :conn="gqlConn" />
    </template>
    <template #secondary>
      <GraphqlResponse :conn="gqlConn" />
    </template>
    <template #sidebar>
      <GraphqlSidebar :conn="gqlConn" />
    </template>
  </AppPaneLayout>
</template>

<script lang="ts">
import { defineComponent, watch } from "@nuxtjs/composition-api"
import { GQLConnection } from "~/helpers/GQLConnection"
import { useNuxt, useReadonlyStream } from "~/helpers/utils/composables"

export default defineComponent({
  beforeRouteLeave(_to, _from, next) {
    if (this.gqlConn.connected$.value) {
      this.gqlConn.disconnect()
    }
    next()
  },
  setup() {
    const nuxt = useNuxt()

    const gqlConn = new GQLConnection()

    const isLoading = useReadonlyStream(gqlConn.isLoading$, false)

    watch(isLoading, () => {
      if (isLoading.value) nuxt.value.$loading.start()
      else nuxt.value.$loading.finish()
    })

    return {
      gqlConn,
    }
  },
  head() {
    return {
      title: `${this.$t("navigation.graphql")} • Hoppscotch`,
    }
  },
})
</script>
