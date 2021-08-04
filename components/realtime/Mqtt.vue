<template>
  <Splitpanes :dbl-click-splitter="false" vertical>
    <Pane class="hide-scrollbar !overflow-auto">
      <Splitpanes :dbl-click-splitter="false" horizontal>
        <Pane class="hide-scrollbar !overflow-auto">
          <AppSection label="request">
            <div class="bg-primary flex p-4 top-0 z-10 sticky">
              <div class="flex-1 inline-flex">
                <input
                  id="mqtt-url"
                  v-model="url"
                  type="url"
                  spellcheck="false"
                  class="
                    bg-primaryLight
                    border border-divider
                    rounded-l
                    font-semibold font-mono
                    text-secondaryDark
                    w-full
                    py-2
                    px-4
                    transition
                    truncate
                    focus:border-accent focus:outline-none
                  "
                  :placeholder="$t('url')"
                />
                <ButtonPrimary
                  id="connect"
                  :disabled="!validUrl"
                  class="rounded-l-none w-28"
                  :label="connectionState ? $t('disconnect') : $t('connect')"
                  :loading="connectingState"
                  @click.native="toggleConnection"
                />
              </div>
            </div>
          </AppSection>
        </Pane>
        <Pane class="hide-scrollbar !overflow-auto">
          <AppSection label="response">
            <RealtimeLog :title="$t('log')" :log="log" />
          </AppSection>
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
      <AppSection label="messages">
        <div class="flex flex-col flex-1 p-4 inline-flex">
          <label for="pub_topic" class="font-semibold">
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
            spellcheck="false"
          />
        </div>
        <div class="flex flex-1 p-4 items-center justify-between">
          <label for="mqtt-message" class="font-semibold">{{
            $t("communication")
          }}</label>
        </div>
        <div class="flex px-4">
          <input
            id="mqtt-message"
            v-model="msg"
            class="input !rounded-r-none"
            type="text"
            :placeholder="$t('message')"
            spellcheck="false"
          />
          <ButtonPrimary
            id="publish"
            name="get"
            class="rounded-l-none"
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
          <label for="sub_topic" class="font-semibold">{{
            $t("mqtt.topic")
          }}</label>
        </div>
        <div class="flex px-4">
          <input
            id="sub_topic"
            v-model="sub_topic"
            type="text"
            :placeholder="$t('mqtt.topic_name')"
            spellcheck="false"
            class="input !rounded-r-none"
          />
          <ButtonPrimary
            id="subscribe"
            name="get"
            :disabled="!cansubscribe"
            class="rounded-l-none"
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
import debounce from "~/helpers/utils/debounce"
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"
import { useSetting } from "~/newstore/settings"

export default defineComponent({
  components: { Splitpanes, Pane },
  setup() {
    return {
      RIGHT_SIDEBAR: useSetting("RIGHT_SIDEBAR"),
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
  mounted() {
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
          payload: this.$t("connecting_to", { name: this.url }),
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
        payload: this.$t("error_occurred"),
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })
    },
    onConnectionSuccess() {
      this.connectingState = false
      this.connectionState = true
      this.log.push({
        payload: this.$t("connected_to", { name: this.url }),
        source: "info",
        color: "var(--accent-color)",
        ts: new Date().toLocaleTimeString(),
      })
      this.$toast.success(this.$t("connected"), {
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
        payload: this.$t("disconnected_from", { name: this.url }),
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })
    },
    onConnectionLost() {
      this.connectingState = false
      this.connectionState = false
      if (this.manualDisconnect) {
        this.$toast.error(this.$t("disconnected"), {
          icon: "sync_disabled",
        })
      } else {
        this.$toast.error(this.$t("something_went_wrong"), {
          icon: "error",
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
            this.$t("error_occurred") +
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
            this.$t("error_occurred") +
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
