<template>
  <div>
    <Splitpanes class="smart-splitter" :dbl-click-splitter="false" vertical>
      <Pane class="hide-scrollbar !overflow-auto">
        <Splitpanes
          class="smart-splitter"
          :dbl-click-splitter="false"
          horizontal
        >
          <Pane class="hide-scrollbar !overflow-auto">
            <GraphqlRequest :conn="gqlConn" />
            <GraphqlRequestOptions :conn="gqlConn" />
          </Pane>
          <Pane class="hide-scrollbar !overflow-auto">
            <GraphqlResponse :conn="gqlConn" />
          </Pane>
        </Splitpanes>
      </Pane>
      <Pane
        v-if="RIGHT_SIDEBAR"
        max-size="35"
        size="25"
        min-size="20"
        class="hide-scrollbar !overflow-auto"
      >
        <GraphqlSidebar :conn="gqlConn" />
      </Pane>
    </Splitpanes>
  </div>
</template>

<script lang="ts">
import { defineComponent, watch } from "@nuxtjs/composition-api"
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"
import { useSetting } from "~/newstore/settings"
import { GQLConnection } from "~/helpers/GQLConnection"
import { useNuxt, useReadonlyStream } from "~/helpers/utils/composables"

export default defineComponent({
  components: { Splitpanes, Pane },
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
      if (isLoading) nuxt.value.$loading.start()
      else nuxt.value.$loading.finish()
    })

    return {
      RIGHT_SIDEBAR: useSetting("RIGHT_SIDEBAR"),
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
