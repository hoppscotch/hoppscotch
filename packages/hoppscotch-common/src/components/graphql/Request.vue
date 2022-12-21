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
        :loading="isLoading"
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
import { GQLRequest } from "~/helpers/graphql/GQLRequest"
import {
  GQLConnection$,
  setGQLConnection,
  GQLConnectionURL$,
  setGQLUrl,
} from "~/newstore/GQLSession"

const t = useI18n()

const props = defineProps<{
  request: GQLRequest
}>()

const conn = useStream(GQLConnection$, new GQLConnection(), setGQLConnection)
const connected = useReadonlyStream(conn.value.connected$, false)
const headers = useReadonlyStream(props.request.headers$, [])

const url = useStream(GQLConnectionURL$, "", setGQLUrl)

const onConnectClick = () => {
  if (!connected.value) {
    conn.value.connect(url.value, headers.value as any)

    platform.analytics?.logEvent({
      type: "HOPP_REQUEST_RUN",
      platform: "graphql-schema",
      strategy: getCurrentStrategyID(),
    })
  } else {
    conn.value.disconnect()
  }
}
</script>
