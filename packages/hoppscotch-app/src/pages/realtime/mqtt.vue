<template>
  <AppPaneLayout layout-id="mqtt">
    <template #primary>
      <div
        class="sticky top-0 z-10 flex flex-shrink-0 p-4 space-x-2 overflow-x-auto bg-primary"
      >
        <div class="inline-flex flex-1 space-x-2">
          <div class="flex flex-1">
            <input
              id="mqtt-url"
              v-model="url"
              type="url"
              autocomplete="off"
              :class="{ error: !isUrlValid }"
              class="flex flex-1 w-full px-4 py-2 border rounded-l bg-primaryLight border-divider text-secondaryDark"
              :placeholder="`${t('mqtt.url')}`"
              :disabled="
                connectionState === 'CONNECTED' ||
                connectionState === 'CONNECTING'
              "
              @keyup.enter="isUrlValid ? toggleConnection() : null"
            />
            <label
              for="client-id"
              class="px-4 py-2 font-semibold truncate border-t border-b bg-primaryLight border-divider text-secondaryLight"
            >
              {{ t("mqtt.client_id") }}
            </label>
            <input
              id="client-id"
              v-model="clientID"
              class="flex flex-1 w-full px-4 py-2 border rounded-r bg-primaryLight border-divider text-secondaryDark"
              spellcheck="false"
              :disabled="
                connectionState === 'CONNECTED' ||
                connectionState === 'CONNECTING'
              "
              @keyup.enter="isUrlValid ? toggleConnection() : null"
            />
          </div>
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
      </div>

      <div
        class="flex flex-col flex-1"
        :class="{ '!hidden': connectionState === 'CONNECTED' }"
      >
        <RealtimeConnectionConfig @change="onChangeConfig" />
      </div>
      <RealtimeCommunication
        v-if="connectionState === 'CONNECTED'"
        :show-event-field="currentTabId === 'all'"
        :is-connected="connectionState === 'CONNECTED'"
        event-field-styles="top-upperPrimaryStickyFold"
        :sticky-header-styles="
          currentTabId === 'all'
            ? 'top-upperSecondaryStickyFold'
            : 'top-upperPrimaryStickyFold'
        "
        @send-message="
          publish(
            currentTabId === 'all'
              ? $event
              : {
                  message: $event.message,
                  eventName: currentTabId,
                }
          )
        "
      />
    </template>
    <template #secondary>
      <SmartWindows
        :id="'communication_tab'"
        v-model="currentTabId"
        :can-add-new-tab="false"
        @remove-tab="removeTab"
        @sort="sortTabs"
      >
        <SmartWindow
          v-for="tab in tabs"
          :id="tab.id"
          :key="'removable_tab_' + tab.id"
          :label="tab.name"
          :is-removable="tab.removable"
        >
          <template #icon>
            <icon-lucide-rss
              :style="{
                color: tab.color,
              }"
              class="w-4 h-4 svg-icons"
            />
          </template>
          <RealtimeLog
            :title="t('mqtt.log')"
            :log="((tab.id === 'all' ? logs : tab.logs) as LogEntryData[])"
            @delete="clearLogEntries()"
          />
        </SmartWindow>
      </SmartWindows>
    </template>
    <template #sidebar>
      <div
        class="sticky z-10 flex flex-col overflow-x-auto border-b divide-y rounded-t divide-dividerLight bg-primary border-dividerLight"
      >
        <div class="flex justify-between flex-1">
          <ButtonSecondary
            :icon="IconPlus"
            :label="t('mqtt.new')"
            class="!rounded-none"
            @click="showSubscriptionModal(true)"
          />
          <span class="flex">
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              to="https://docs.hoppscotch.io/features/mqtt"
              blank
              :title="t('app.wiki')"
              :icon="IconHelpCircle"
            />
          </span>
        </div>
      </div>

      <div
        v-if="topics.length === 0"
        class="flex flex-col items-center justify-center p-4 text-secondaryLight"
      >
        <img
          :src="`/images/states/${colorMode.value}/pack.svg`"
          loading="lazy"
          class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
          :alt="`${t('empty.subscription')}`"
        />
        <span class="pb-4 text-center">
          {{ t("empty.subscription") }}
        </span>
        <ButtonSecondary
          :label="t('mqtt.new')"
          filled
          outline
          @click="showSubscriptionModal(true)"
        />
      </div>

      <div v-else>
        <div
          v-for="(topic, index) in topics"
          :key="`subscription-${index}`"
          class="flex flex-col"
        >
          <div class="flex items-stretch group">
            <span class="flex items-center justify-center px-4 cursor-pointer">
              <icon-lucide-rss
                :style="{
                  color: topic.color,
                }"
                class="w-4 h-4 svg-icons"
              />
            </span>
            <span
              class="flex flex-1 min-w-0 py-2 pr-2 transition cursor-pointer group-hover:text-secondaryDark"
              @click="openTopicAsTab(topic)"
            >
              <span class="truncate">
                {{ topic.name }}
              </span>
            </span>
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :icon="IconTrash"
              color="red"
              :title="t('mqtt.unsubscribe')"
              class="hidden group-hover:inline-flex"
              data-testid="unsubscribe_mqtt_subscription"
              @click="unsubscribeFromTopic(topic.name)"
            />
          </div>
        </div>
      </div>

      <RealtimeSubscription
        :show="subscriptionModalShown"
        :loading-state="subscribing"
        @submit="subscribeToTopic"
        @hide-modal="showSubscriptionModal(false)"
      />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import IconPlus from "~icons/lucide/plus"
import IconTrash from "~icons/lucide/trash"
import IconHelpCircle from "~icons/lucide/help-circle"
import { computed, onMounted, onUnmounted, ref, watch } from "vue"
import debounce from "lodash-es/debounce"
import {
  MQTTConnection,
  MQTTConnectionConfig,
  MQTTError,
  MQTTTopic,
} from "~/helpers/realtime/MQTTConnection"
import { HoppRealtimeLogLine } from "~/helpers/types/HoppRealtimeLog"
import { useColorMode } from "@composables/theming"
import {
  useReadonlyStream,
  useStream,
  useStreamSubscriber,
} from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import {
  addMQTTLogLine,
  MQTTConn$,
  MQTTEndpoint$,
  MQTTClientID$,
  MQTTLog$,
  setMQTTConn,
  setMQTTEndpoint,
  setMQTTClientID,
  setMQTTLog,
  MQTTTabs$,
  setMQTTTabs,
  MQTTCurrentTab$,
  setCurrentTab,
  addMQTTCurrentTabLogLine,
} from "~/newstore/MQTTSession"
import RegexWorker from "@workers/regex?worker"
import { LogEntryData } from "~/components/realtime/Log.vue"

const t = useI18n()
const toast = useToast()
const colorMode = useColorMode()

const { subscribeToStream } = useStreamSubscriber()
const url = useStream(MQTTEndpoint$, "", setMQTTEndpoint)
const clientID = useStream(MQTTClientID$, "", setMQTTClientID)
const config = ref<MQTTConnectionConfig>({
  username: "",
  password: "",
  keepAlive: "60",
  cleanSession: true,
  lwTopic: "",
  lwMessage: "",
  lwQos: 0,
  lwRetain: false,
})
const logs = useStream(MQTTLog$, [], setMQTTLog)
const socket = useStream(MQTTConn$, new MQTTConnection(), setMQTTConn)
const connectionState = useReadonlyStream(
  socket.value.connectionState$,
  "DISCONNECTED"
)
const subscriptionState = useReadonlyStream(
  socket.value.subscriptionState$,
  false
)
const subscribing = useReadonlyStream(socket.value.subscribing$, false)
const isUrlValid = ref(true)
const subTopic = ref("")
let worker: Worker
const subscriptionModalShown = ref(false)
const canSubscribe = computed(() => connectionState.value === "CONNECTED")
const topics = useReadonlyStream(socket.value.subscribedTopics$, [])

const currentTabId = useStream(MQTTCurrentTab$, "", setCurrentTab)
const tabs = useStream(MQTTTabs$, [], setMQTTTabs)

const onChangeConfig = (e: MQTTConnectionConfig) => {
  config.value = e
}

const showSubscriptionModal = (show: boolean) => {
  subscriptionModalShown.value = show
}
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
        logs.value = [
          {
            payload: `${t("state.connecting_to", { name: url.value })}`,
            source: "info",
            color: "var(--accent-color)",
            ts: undefined,
          },
        ]
        break
      case "CONNECTED":
        logs.value = [
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
        addLog(
          {
            prefix: `${event.message.topic}`,
            payload: event.message.message,
            source: "client",
            ts: Date.now(),
          },
          event.message.topic
        )
        break
      case "MESSAGE_RECEIVED":
        addLog(
          {
            prefix: `${event.message.topic}`,
            payload: event.message.message,
            source: "server",
            ts: event.time,
          },
          event.message.topic
        )
        break
      case "SUBSCRIBED":
        showSubscriptionModal(false)
        addMQTTLogLine({
          payload: subscriptionState.value
            ? `${t("state.subscribed_success", { topic: event.topic })}`
            : `${t("state.unsubscribed_success", { topic: event.topic })}`,
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
          source: "disconnected",
          color: "#ff5555",
          ts: event.time,
        })
        toast.error(`${t("state.disconnected")}`)
        break
    }
  })
})
const addLog = (line: HoppRealtimeLogLine, topic: string | undefined) => {
  if (topic) addMQTTCurrentTabLogLine(topic, line)
  addMQTTLogLine(line)
}
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
    return socket.value.connect(url.value, clientID.value, config.value)
  }
  // Otherwise, it's disconnecting.
  socket.value.disconnect()
}
const publish = (event: { message: string; eventName: string }) => {
  socket.value?.publish(event.eventName, event.message)
}
const subscribeToTopic = (topic: MQTTTopic) => {
  if (canSubscribe.value) {
    if (topics.value.some((t) => t.name === topic.name)) {
      return toast.error(t("mqtt.already_subscribed").toString())
    }
    socket.value.subscribe(topic)
  } else {
    subscriptionModalShown.value = false
    toast.error(t("mqtt.not_connected").toString())
  }
}
const unsubscribeFromTopic = (topic: string) => {
  socket.value.unsubscribe(topic)
  removeTab(topic)
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
  logs.value = []
}

const openTopicAsTab = (topic: MQTTTopic) => {
  const { name, color } = topic
  if (tabs.value.some((tab) => tab.id === topic.name)) {
    return (currentTabId.value = topic.name)
  }
  tabs.value = [
    ...tabs.value,
    {
      id: name,
      name,
      color,
      removable: true,
      logs: [],
    },
  ]
  currentTabId.value = name
}

const sortTabs = (e: { oldIndex: number; newIndex: number }) => {
  const newTabs = [...tabs.value]
  newTabs.splice(e.newIndex, 0, newTabs.splice(e.oldIndex, 1)[0])
  tabs.value = newTabs
}

const removeTab = (tabID: string) => {
  tabs.value = tabs.value.filter((tab) => tab.id !== tabID)
}
</script>
