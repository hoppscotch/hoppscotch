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
    :dimissible="false"
    :title="t('graphql.switch_connection')"
    @close="connectionSwitchModal = false"
  >
    <template #body>
      <p class="mb-4">
        {{ t("graphql.connection_switch_url") }}:
        <kbd class="shortcut-key !ml-0"> {{ lastTwoUrls.at(0) }} </kbd>
      </p>
      <p class="mb-4">
        {{ t("graphql.connection_switch_new_url") }}:
        <kbd class="shortcut-key !ml-0"> {{ lastTwoUrls.at(1) }} </kbd>
      </p>
      <p>{{ t("graphql.connection_switch_confirm") }}</p>
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
import { useI18n } from "@composables/i18n"
import { currentActiveTab } from "~/helpers/graphql/tab"
import { computed, ref, watch } from "vue"
import { connection } from "~/helpers/graphql/connection"
import { connect } from "~/helpers/graphql/connection"
import { disconnect } from "~/helpers/graphql/connection"
import { InterceptorService } from "~/services/interceptor.service"
import { useService } from "dioc/vue"

const t = useI18n()

const interceptorService = useService(InterceptorService)

const connectionSwitchModal = ref(false)

const connected = computed(() => connection.state === "CONNECTED")

const url = computed({
  get: () => currentActiveTab.value?.document.request.url ?? "",
  set: (value) => {
    currentActiveTab.value!.document.request.url = value
  },
})

const onConnectClick = () => {
  if (!connected.value) {
    gqlConnect()
  } else {
    disconnect()
  }
}

const gqlConnect = () => {
  connect(url.value, currentActiveTab.value?.document.request.headers)

  platform.analytics?.logEvent({
    type: "HOPP_REQUEST_RUN",
    platform: "graphql-schema",
    strategy: interceptorService.currentInterceptorID.value!,
  })
}

const switchConnection = () => {
  gqlConnect()
  connectionSwitchModal.value = false
}

const lastTwoUrls = ref<string[]>([])

watch(
  currentActiveTab,
  (newVal) => {
    if (newVal) {
      lastTwoUrls.value.push(newVal.document.request.url)
      if (lastTwoUrls.value.length > 2) {
        lastTwoUrls.value.shift()
      }
    }

    if (
      connected.value &&
      lastTwoUrls.value.length === 2 &&
      lastTwoUrls.value.at(0) !== lastTwoUrls.value.at(1)
    ) {
      disconnect()
      connectionSwitchModal.value = true
    }
  },
  {
    immediate: true,
  }
)

const cancelSwitch = () => {
  if (connected.value) disconnect()
  connectionSwitchModal.value = false
}
</script>
