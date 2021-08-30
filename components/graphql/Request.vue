<template>
  <div class="bg-primary flex p-4 top-0 z-10 sticky">
    <div class="space-x-2 flex-1 inline-flex">
      <input
        id="url"
        v-model="url"
        v-focus
        type="url"
        autocomplete="off"
        spellcheck="false"
        class="
          bg-primaryLight
          border border-divider
          rounded
          text-secondaryDark
          w-full
          py-2
          px-4
          hover:border-dividerDark
          focus-visible:bg-transparent focus-visible:border-dividerDark
        "
        :placeholder="$t('request.url')"
        @keyup.enter="onConnectClick"
      />
      <ButtonPrimary
        id="get"
        name="get"
        :label="!connected ? $t('action.connect') : $t('action.disconnect')"
        class="w-32"
        @click.native="onConnectClick"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "@nuxtjs/composition-api"
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"
import { GQLConnection } from "~/helpers/GQLConnection"
import { getCurrentStrategyID } from "~/helpers/network"
import { useReadonlyStream, useStream } from "~/helpers/utils/composables"
import { gqlHeaders$, gqlURL$, setGQLURL } from "~/newstore/GQLSession"

export default defineComponent({
  props: {
    conn: {
      type: Object as PropType<GQLConnection>,
      required: true,
    },
  },
  setup(props) {
    const connected = useReadonlyStream(props.conn.connected$, false)
    const headers = useReadonlyStream(gqlHeaders$, [])

    const url = useStream(gqlURL$, "", setGQLURL)

    const onConnectClick = () => {
      if (!connected.value) {
        props.conn.connect(url.value, headers.value as any)

        logHoppRequestRunToAnalytics({
          platform: "graphql-schema",
          strategy: getCurrentStrategyID(),
        })
      } else {
        props.conn.disconnect()
      }
    }

    return {
      url,
      connected,
      onConnectClick,
    }
  },
})
</script>
