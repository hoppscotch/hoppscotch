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
        <Pane class="hide-scrollbar !overflow-auto">
          <AppSection label="request">
            <div class="bg-primary flex p-4 top-0 z-10 sticky">
              <div class="space-x-2 flex-1 inline-flex">
                <input
                  id="mqtt-url"
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
                    focus-visible:bg-transparent
                    focus-visible:border-dividerDark
                  "
                  :placeholder="$t('mqtt.url')"
                  :disabled="connectionState"
                />
                <ButtonPrimary
                  id="connect"
                  :disabled="!validUrl"
                  class="w-32"
                  :label="
                    connectionState
                      ? $t('action.disconnect')
                      : $t('action.connect')
                  "
                  :loading="connectingState"
                  @click.native="toggleConnection"
                />
              </div>
            </div>
          </AppSection>
        </Pane>
        <Pane class="hide-scrollbar !overflow-auto">
          <AppSection label="response">
            <RealtimeLog :title="$t('mqtt.log')" :log="log" />
          </AppSection>
        </Pane>
      </Splitpanes>
    </Pane>
    <Pane
      v-if="SIDEBAR"
      size="25"
      min-size="20"
      class="hide-scrollbar !overflow-auto"
    >
      <AppSection label="messages">
        <div class="flex flex-col flex-1 p-4 inline-flex">
          <label for="pub_topic" class="font-semibold text-secondaryLight">
            {{ $t("mqtt.topic") }}
          </label>
        </div>
        <div class="flex px-4">
          <input
            id="pub_topic"
            v-model="pub_topic"
            class="input"
            :placeholder="$t('mqtt.topic_name')"
            type="text"
            autocomplete="off"
            spellcheck="false"
          />
        </div>
        <div class="flex flex-1 p-4 items-center justify-between">
          <label for="mqtt-message" class="font-semibold text-secondaryLight">
            {{ $t("mqtt.communication") }}
          </label>
        </div>
        <div class="flex space-x-2 px-4">
          <input
            id="mqtt-message"
            v-model="msg"
            class="input"
            type="text"
            autocomplete="off"
            :placeholder="$t('mqtt.message')"
            spellcheck="false"
          />
          <ButtonPrimary
            id="publish"
            name="get"
            :disabled="!canpublish"
            :label="$t('mqtt.publish')"
            @click.native="publish"
          />
        </div>
        <div
          class="
            border-t border-dividerLight
            flex flex-col flex-1
            mt-4
            p-4
            inline-flex
          "
        >
          <label for="sub_topic" class="font-semibold text-secondaryLight">
            {{ $t("mqtt.topic") }}
          </label>
        </div>
        <div class="flex space-x-2 px-4">
          <input
            id="sub_topic"
            v-model="sub_topic"
            type="text"
            autocomplete="off"
            :placeholder="$t('mqtt.topic_name')"
            spellcheck="false"
            class="input"
          />
          <ButtonPrimary
            id="subscribe"
            name="get"
            :disabled="!cansubscribe"
            :label="
              subscriptionState ? $t('mqtt.unsubscribe') : $t('mqtt.subscribe')
            "
            reverse
            @click.native="toggleSubscription"
          />
        </div>
      </AppSection>
    </Pane>
  </Splitpanes>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"
import Paho from "paho-mqtt"
import debounce from "lodash/debounce"
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"
import { useSetting } from "~/newstore/settings"
import useWindowSize from "~/helpers/utils/useWindowSize"

export default defineComponent({
  components: { Splitpanes, Pane },
  setup() {
    return {
      windowInnerWidth: useWindowSize(),
      SIDEBAR: useSetting("SIDEBAR"),
      COLUMN_LAYOUT: useSetting("COLUMN_LAYOUT"),
      SIDEBAR_ON_LEFT: useSetting("SIDEBAR_ON_LEFT"),
    }
  },
  data() {
    return {
      url: "wss://test.mosquitto.org:8081",
      isUrlValid: true,
      client: null,
      pub_topic: "",
      sub_topic: "",
      msg: "",
      connectionState: false,
      connectingState: false,
      log: null,
      manualDisconnect: false,
      subscriptionState: false,
    }
  },
  computed: {
    validUrl() {
      return this.isUrlValid
    },
    canpublish() {
      return this.pub_topic !== "" && this.msg !== "" && this.connectionState
    },
    cansubscribe() {
      return this.sub_topic !== "" && this.connectionState
    },
  },
  watch: {
    url() {
      this.debouncer()
    },
  },
  created() {
    if (process.browser) {
      this.worker = this.$worker.createRejexWorker()
      this.worker.addEventListener("message", this.workerResponseHandler)
    }
  },
  destroyed() {
    this.worker.terminate()
  },
  methods: {
    debouncer: debounce(function () {
      this.worker.postMessage({ type: "ws", url: this.url })
    }, 1000),
    workerResponseHandler({ data }) {
      if (data.url === this.url) this.isUrlValid = data.result
    },
    connect() {
      this.connectingState = true
      this.log = [
        {
          payload: this.$t("state.connecting_to", { name: this.url }),
          source: "info",
          color: "var(--accent-color)",
          ts: new Date().toLocaleTimeString(),
        },
      ]
      const parseUrl = new URL(this.url)
      this.client = new Paho.Client(
        parseUrl.hostname,
        parseUrl.port !== "" ? Number(parseUrl.port) : 8081,
        "hoppscotch"
      )
      this.client.connect({
        onSuccess: this.onConnectionSuccess,
        onFailure: this.onConnectionFailure,
        useSSL: true,
      })
      this.client.onConnectionLost = this.onConnectionLost
      this.client.onMessageArrived = this.onMessageArrived

      logHoppRequestRunToAnalytics({
        platform: "mqtt",
      })
    },
    onConnectionFailure() {
      this.connectingState = false
      this.connectionState = false
      this.log.push({
        payload: this.$t("error.something_went_wrong"),
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })
    },
    onConnectionSuccess() {
      this.connectingState = false
      this.connectionState = true
      this.log.push({
        payload: this.$t("state.connected_to", { name: this.url }),
        source: "info",
        color: "var(--accent-color)",
        ts: new Date().toLocaleTimeString(),
      })
      this.$toast.success(this.$t("state.connected"), {
        icon: "sync",
      })
    },
    onMessageArrived({ payloadString, destinationName }) {
      this.log.push({
        payload: `Message: ${payloadString} arrived on topic: ${destinationName}`,
        source: "info",
        color: "var(--accent-color)",
        ts: new Date().toLocaleTimeString(),
      })
    },
    toggleConnection() {
      if (this.connectionState) {
        this.disconnect()
      } else {
        this.connect()
      }
    },
    disconnect() {
      this.manualDisconnect = true
      this.client.disconnect()
      this.log.push({
        payload: this.$t("state.disconnected_from", { name: this.url }),
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })
    },
    onConnectionLost() {
      this.connectingState = false
      this.connectionState = false
      if (this.manualDisconnect) {
        this.$toast.error(this.$t("state.disconnected"), {
          icon: "sync_disabled",
        })
      } else {
        this.$toast.error(this.$t("error.something_went_wrong"), {
          icon: "error_outline",
        })
      }
      this.manualDisconnect = false
      this.subscriptionState = false
    },
    publish() {
      try {
        this.client.publish(this.pub_topic, this.msg, 0, false)
        this.log.push({
          payload: `Published message: ${this.msg} to topic: ${this.pub_topic}`,
          ts: new Date().toLocaleTimeString(),
          source: "info",
          color: "var(--accent-color)",
        })
      } catch (e) {
        this.log.push({
          payload:
            this.$t("error.something_went_wrong") +
            `while publishing msg: ${this.msg} to topic:  ${this.pub_topic}`,
          source: "info",
          color: "#ff5555",
          ts: new Date().toLocaleTimeString(),
        })
      }
    },
    toggleSubscription() {
      if (this.subscriptionState) {
        this.unsubscribe()
      } else {
        this.subscribe()
      }
    },
    subscribe() {
      try {
        this.client.subscribe(this.sub_topic, {
          onSuccess: this.usubSuccess,
          onFailure: this.usubFailure,
        })
      } catch (e) {
        this.log.push({
          payload:
            this.$t("error.something_went_wrong") +
            `while subscribing to topic:  ${this.sub_topic}`,
          source: "info",
          color: "#ff5555",
          ts: new Date().toLocaleTimeString(),
        })
      }
    },
    usubSuccess() {
      this.subscriptionState = !this.subscriptionState
      this.log.push({
        payload:
          `Successfully ` +
          (this.subscriptionState ? "subscribed" : "unsubscribed") +
          ` to topic: ${this.sub_topic}`,
        source: "info",
        color: "var(--accent-color)",
        ts: new Date().toLocaleTimeString(),
      })
    },
    usubFailure() {
      this.log.push({
        payload:
          `Failed to ` +
          (this.subscriptionState ? "unsubscribe" : "subscribe") +
          ` to topic: ${this.sub_topic}`,
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })
    },
    unsubscribe() {
      this.client.unsubscribe(this.sub_topic, {
        onSuccess: this.usubSuccess,
        onFailure: this.usubFailure,
      })
    },
  },
})
</script>
