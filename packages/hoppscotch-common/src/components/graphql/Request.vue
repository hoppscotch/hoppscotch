<template>
  <div
    class="sticky top-0 z-10 flex flex-shrink-0 p-4 overflow-x-auto space-x-2 bg-primary"
  >
    <div class="inline-flex flex-1 space-x-2">
      <input
        id="url"
        v-model="url"
        type="url"
        autocomplete="off"
        spellcheck="false"
        class="w-full px-4 py-2 border rounded bg-primaryLight border-divider text-secondaryDark"
        :placeholder="`${t('request.url')}`"
        :disabled="connected"
        @keyup.enter="onConnectClick"
      />
      <HoppButtonPrimary
        id="get"
        name="get"
        :label="!connected ? t('action.connect') : t('action.disconnect')"
        class="w-32"
        @click="onConnectClick"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { platform } from "~/platform"
import { GQLConnection } from "~/helpers/GQLConnection"
import { getCurrentStrategyID } from "~/helpers/network"
import { useReadonlyStream, useStream } from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { gqlHeaders$, gqlURL$, setGQLURL } from "~/newstore/GQLSession"

const t = useI18n()

const props = defineProps<{
  conn: GQLConnection
}>()

const connected = useReadonlyStream(props.conn.connected$, false)
const headers = useReadonlyStream(gqlHeaders$, [])

const url = useStream(gqlURL$, "", setGQLURL)

const onConnectClick = () => {
  if (!connected.value) {
    props.conn.connect(url.value, headers.value as any)

    platform.analytics?.logHoppRequestRunToAnalytics({
      platform: "graphql-schema",
      strategy: getCurrentStrategyID(),
    })
  } else {
    props.conn.disconnect()
  }
}
</script>
