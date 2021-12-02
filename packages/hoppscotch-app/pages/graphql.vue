<template>
  <Splitpanes
    class="smart-splitter"
    :rtl="SIDEBAR_ON_LEFT && windowInnerWidth.x.value >= 768"
    :class="{
      '!flex-row-reverse': SIDEBAR_ON_LEFT && windowInnerWidth.x.value >= 768,
    }"
    :horizontal="!(windowInnerWidth.x.value >= 768)"
  >
    <Pane size="75" min-size="65" class="hide-scrollbar !overflow-auto">
      <Splitpanes class="smart-splitter" :horizontal="COLUMN_LAYOUT">
        <Pane
          :size="COLUMN_LAYOUT ? 45 : 50"
          class="hide-scrollbar !overflow-auto"
        >
          <GraphqlRequest :conn="gqlConn" />
          <GraphqlRequestOptions :conn="gqlConn" />
        </Pane>
        <Pane
          :size="COLUMN_LAYOUT ? 65 : 50"
          class="hide-scrollbar !overflow-auto"
        >
          <GraphqlResponse :conn="gqlConn" />
        </Pane>
      </Splitpanes>
    </Pane>
    <Pane
      v-if="SIDEBAR"
      size="25"
      min-size="20"
      class="hide-scrollbar !overflow-auto"
    >
      <GraphqlSidebar :conn="gqlConn" />
    </Pane>
  </Splitpanes>
</template>

<script lang="ts">
import { defineComponent, watch } from "@nuxtjs/composition-api"
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"
import { useSetting } from "~/newstore/settings"
import { GQLConnection } from "~/helpers/GQLConnection"
import { useNuxt, useReadonlyStream } from "~/helpers/utils/composables"
import useWindowSize from "~/helpers/utils/useWindowSize"

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
      windowInnerWidth: useWindowSize(),
      SIDEBAR: useSetting("SIDEBAR"),
      COLUMN_LAYOUT: useSetting("COLUMN_LAYOUT"),
      SIDEBAR_ON_LEFT: useSetting("SIDEBAR_ON_LEFT"),
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
