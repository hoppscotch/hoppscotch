<template>
  <AppPaneLayout layout-id="mqtt">
    <template #primary>
      <div
        class="sticky top-0 z-10 flex flex-shrink-0 p-4 overflow-x-auto space-x-2 bg-primary"
      >
        <div class="inline-flex flex-1 space-x-2">
          <input
            id="mqtt-url"
            v-model="url"
            type="url"
            autocomplete="off"
            spellcheck="false"
            class="w-full px-4 py-2 border rounded bg-primaryLight border-divider text-secondaryDark"
            :placeholder="t('mqtt.url')"
            :disabled="
              connectionState === 'CONNECTED' ||
              connectionState === 'CONNECTING'
            "
            @keyup.enter="isUrlValid ? toggleConnection() : null"
          />
          <ButtonPrimary
            id="connect"
            :disabled="!isUrlValid"
            class="w-32"
            :label="
              connectionState === 'CONNECTING'
                ? t('action.connecting')
                : connectionState === 'DISCONNECTED'
                ? t('action.connect')
                : t('action.disconnect')
            "
            :loading="connectionState === 'CONNECTING'"
            @click="toggleConnection"
          />
        </div>
        <div class="flex space-x-2">
          <input
            id="mqtt-username"
            v-model="username"
            type="text"
            spellcheck="false"
            class="input"
            :placeholder="t('authorization.username')"
          />
          <input
            id="mqtt-password"
            v-model="password"
            type="password"
            spellcheck="false"
            class="input"
            :placeholder="t('authorization.password')"
          />
        </div>
      </div>
    </template>
    <template #secondary>
      <RealtimeLog
        :title="t('mqtt.log')"
        :log="log"
        @delete="clearLogEntries()"
      />
    </template>
    <template #sidebar>
      <div class="flex items-center justify-between p-4">
        <label for="pubTopic" class="font-semibold text-secondaryLight">
          {{ t("mqtt.topic") }}
        </label>
      </div>
      <div class="flex px-4">
        <input
          id="pubTopic"
          v-model="pubTopic"
          class="input"
          :placeholder="t('mqtt.topic_name')"
          type="text"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
      <div class="flex items-center justify-between p-4">
        <label for="mqtt-message" class="font-semibold text-secondaryLight">
          {{ t("mqtt.communication") }}
        </label>
      </div>
      <div class="flex px-4 space-x-2">
        <input
          id="mqtt-message"
          v-model="message"
          class="input"
          type="text"
          autocomplete="off"
          :placeholder="t('mqtt.message')"
          spellcheck="false"
        />
        <ButtonPrimary
          id="publish"
          name="get"
          :disabled="!canPublish"
          :label="t('mqtt.publish')"
          @click="publish"
        />
      </div>
      <div
        class="flex items-center justify-between p-4 mt-4 border-t border-dividerLight"
      >
        <label for="subTopic" class="font-semibold text-secondaryLight">
          {{ t("mqtt.topic") }}
        </label>
      </div>
      <div class="flex px-4 space-x-2">
        <input
          id="subTopic"
          v-model="subTopic"
          type="text"
          autocomplete="off"
          :placeholder="t('mqtt.topic_name')"
          spellcheck="false"
          class="input"
        />
        <ButtonPrimary
          id="subscribe"
          name="get"
          :disabled="!canSubscribe"
          :label="
            subscriptionState ? t('mqtt.unsubscribe') : t('mqtt.subscribe')
          "
          reverse
          @click="toggleSubscription"
        />
      </div>
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import { debounce } from "lodash-es"
import { MQTTConnection, MQTTError } from "~/helpers/realtime/MQTTConnection"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import {
  useReadonlyStream,
  useStream,
  useStreamSubscriber,
} from "@composables/stream"
import {
  addMQTTLogLine,
  MQTTConn$,
  MQTTEndpoint$,
  MQTTLog$,
  setMQTTConn,
  setMQTTEndpoint,
  setMQTTLog,
} from "~/newstore/MQTTSession"
import RegexWorker from "@workers/regex?worker"

const t = useI18n()
const toast = useToast()
const { subscribeToStream } = useStreamSubscriber()

const url = useStream(MQTTEndpoint$, "", setMQTTEndpoint)
const log = useStream(MQTTLog$, [], setMQTTLog)
const socket = useStream(MQTTConn$, new MQTTConnection(), setMQTTConn)
const connectionState = useReadonlyStream(
  socket.value.connectionState$,
  "DISCONNECTED"
)
const subscriptionState = useReadonlyStream(
  socket.value.subscriptionState$,
  false
)

const isUrlValid = ref(true)
const pubTopic = ref("")
const subTopic = ref("")
const message = ref("")
const username = ref("")
const password = ref("")

let worker: Worker

const canPublish = computed(
  () =>
    pubTopic.value !== "" &&
    message.value !== "" &&
    connectionState.value === "CONNECTED"
)
const canSubscribe = computed(
  () => subTopic.value !== "" && connectionState.value === "CONNECTED"
)

const workerResponseHandler = ({
  data,
}: {
  data: { url: string; result: boolean }
}) => {
  if (data.url === url.value) isUrlValid.value = data.result
}

onMounted(() => {
  worker = new RegexWorker()
  worker.addEventListener("message", workerResponseHandler)

  subscribeToStream(socket.value.event$, (event) => {
    switch (event?.type) {
      case "CONNECTING":
        log.value = [
          {
            payload: `${t("state.connecting_to", { name: url.value })}`,
            source: "info",
            color: "var(--accent-color)",
            ts: undefined,
          },
        ]
        break

      case "CONNECTED":
        log.value = [
          {
            payload: `${t("state.connected_to", { name: url.value })}`,
            source: "info",
            color: "var(--accent-color)",
            ts: Date.now(),
          },
        ]
        toast.success(`${t("state.connected")}`)
        break

      case "MESSAGE_SENT":
        addMQTTLogLine({
          prefix: `${event.message.topic}`,
          payload: event.message.message,
          source: "client",
          ts: Date.now(),
        })
        break

      case "MESSAGE_RECEIVED":
        addMQTTLogLine({
          prefix: `${event.message.topic}`,
          payload: event.message.message,
          source: "server",
          ts: event.time,
        })
        break

      case "SUBSCRIBED":
        addMQTTLogLine({
          payload: subscriptionState.value
            ? `${t("state.subscribed_success", { topic: subTopic.value })}`
            : `${t("state.unsubscribed_success", { topic: subTopic.value })}`,
          source: "server",
          ts: event.time,
        })
        break

      case "SUBSCRIPTION_FAILED":
        addMQTTLogLine({
          payload: subscriptionState.value
            ? `${t("state.subscribed_failed", { topic: subTopic.value })}`
            : `${t("state.unsubscribed_failed", { topic: subTopic.value })}`,
          source: "server",
          ts: event.time,
        })
        break

      case "ERROR":
        addMQTTLogLine({
          payload: getI18nError(event.error),
          source: "info",
          color: "#ff5555",
          ts: event.time,
        })
        break

      case "DISCONNECTED":
        addMQTTLogLine({
          payload: t("state.disconnected_from", { name: url.value }).toString(),
          source: "info",
          color: "#ff5555",
          ts: event.time,
        })
        toast.error(`${t("state.disconnected")}`)
        break
    }
  })
})

const debouncer = debounce(function () {
  worker.postMessage({ type: "ws", url: url.value })
}, 1000)

watch(url, (newUrl) => {
  if (newUrl) debouncer()
})

onUnmounted(() => {
  worker.terminate()
})

// METHODS
const toggleConnection = () => {
  // If it is connecting:
  if (connectionState.value === "DISCONNECTED") {
    return socket.value.connect(url.value, username.value, password.value)
  }
  // Otherwise, it's disconnecting.
  socket.value.disconnect()
}
const publish = () => {
  socket.value?.publish(pubTopic.value, message.value)
}
const toggleSubscription = () => {
  if (subscriptionState.value) {
    socket.value.unsubscribe(subTopic.value)
  } else {
    socket.value.subscribe(subTopic.value)
  }
}

const getI18nError = (error: MQTTError): string => {
  if (typeof error === "string") return error

  switch (error.type) {
    case "CONNECTION_NOT_ESTABLISHED":
      return t("state.connection_lost").toString()
    case "SUBSCRIPTION_FAILED":
      return t("state.mqtt_subscription_failed", {
        topic: error.topic,
      }).toString()
    case "PUBLISH_ERROR":
      return t("state.publish_error", { topic: error.topic }).toString()
    case "CONNECTION_LOST":
      return t("state.connection_lost").toString()
    case "CONNECTION_FAILED":
      return t("state.connection_failed").toString()
    default:
      return t("state.disconnected_from", { name: url.value }).toString()
  }
}
const clearLogEntries = () => {
  log.value = []
}
</script>
