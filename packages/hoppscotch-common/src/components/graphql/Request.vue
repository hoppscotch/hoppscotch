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
        :loading="connection.state === 'CONNECTING'"
        :label="!connected ? t('action.connect') : t('action.disconnect')"
        class="w-32"
        @click="onConnectClick"
      />
    </div>
  </div>
  <HoppSmartModal
    v-if="connectionSwitchModal"
    dialog
    :title="t('modal.edit_request')"
    @close="connectionSwitchModal = false"
  >
    <template #body>
      Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptatibus
      provident architecto perspiciatis maxime quis ratione labore ipsum
      voluptas laborum, suscipit culpa sapiente deleniti omnis, rerum tenetur?
      Odit deleniti magnam earum.
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('action.connect')"
          :loading="connection.state === 'CONNECTING'"
          outline
          @click="switchConnection()"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="cancelSwitch()"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { platform } from "~/platform"
import { getCurrentStrategyID } from "~/helpers/network"
import { useI18n } from "@composables/i18n"
import { computedWithControl } from "@vueuse/core"
import { currentActiveTab } from "~/helpers/graphql/tab"
import { computed, ref, watch } from "vue"
import { connection } from "~/helpers/graphql/connection"
import { connect } from "~/helpers/graphql/connection"
import { disconnect } from "~/helpers/graphql/connection"

const t = useI18n()

const connectionSwitchModal = ref(false)

const connected = computed(() => connection.state === "CONNECTED")

const url = computedWithControl(
  () => currentActiveTab.value,
  () => currentActiveTab.value?.document.request.url
)

const onConnectClick = () => {
  if (!connected.value) {
    connect(url.value, currentActiveTab.value?.document.request.headers)

    platform.analytics?.logEvent({
      type: "HOPP_REQUEST_RUN",
      platform: "graphql-schema",
      strategy: getCurrentStrategyID(),
    })
  } else {
    disconnect()
  }
}

const switchConnection = () => {
  connect(url.value, currentActiveTab.value?.document.request.headers)

  platform.analytics?.logEvent({
    type: "HOPP_REQUEST_RUN",
    platform: "graphql-schema",
    strategy: getCurrentStrategyID(),
  })
  connectionSwitchModal.value = false
}

watch(currentActiveTab, (oldVal, newVal) => {
  if (oldVal.document.request.url !== newVal.document.request.url) {
    disconnect()
    connectionSwitchModal.value = true
  }
})

const cancelSwitch = () => {
  disconnect()
  connectionSwitchModal.value = false
}
</script>
