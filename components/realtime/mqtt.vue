<template>
  <div>
    <pw-section class="blue" :label="$t('request')" no-legend>
      <ul>
        <li>
          <label for="mqtt-url">{{ $t("url") }}</label>
          <input
            id="mqtt-url"
            type="url"
            v-model="url"
            spellcheck="false"
            class="md:rounded-bl-lg"
            :placeholder="$t('url')"
          />
        </li>
        <div>
          <li>
            <label for="connect" class="hide-on-small-screen">&nbsp;</label>
            <button
              id="connect"
              :disabled="!validUrl"
              @click="toggleConnection"
              class="rounded-b-lg md:rounded-bl-none md:rounded-br-lg"
            >
              {{ this.connectionState ? $t("disconnect") : $t("connect") }}
              <span>
                <i class="material-icons">{{ !connectionState ? "sync" : "sync_disabled" }}</i>
              </span>
            </button>
          </li>
        </div>
      </ul>
    </pw-section>

    <pw-section class="blue" :label="$t('communication')" no-legend>
      <ul>
        <li>
          <log :title="$t('log')" :log="this.log" />
        </li>
      </ul>
      <ul>
        <li>
          <label for="pub_topic">{{ $t("mqtt_topic") }}</label>
          <input id="pub_topic" type="text" v-model="pub_topic" spellcheck="false" />
        </li>
        <li>
          <label for="mqtt-message">{{ $t("message") }}</label>
          <input
            id="mqtt-message"
            type="text"
            v-model="msg"
            spellcheck="false"
            class="border-dashed md:border-l border-brdColor"
          />
        </li>
        <div>
          <li>
            <label for="publish" class="hide-on-small-screen">&nbsp;</label>
            <button id="publish" name="get" :disabled="!canpublish" @click="publish">
              {{ $t("mqtt_publish") }}
              <span>
                <i class="material-icons">send</i>
              </span>
            </button>
          </li>
        </div>
      </ul>
      <ul>
        <li>
          <label for="sub_topic">{{ $t("mqtt_topic") }}</label>
          <input
            id="sub_topic"
            type="text"
            v-model="sub_topic"
            spellcheck="false"
            class="md:rounded-bl-lg"
          />
        </li>
        <div>
          <li>
            <label for="subscribe" class="hide-on-small-screen">&nbsp;</label>
            <button
              id="subscribe"
              name="get"
              :disabled="!cansubscribe"
              @click="toggleSubscription"
              class="rounded-b-lg md:rounded-bl-none md:rounded-br-lg"
            >
              {{ subscriptionState ? $t("mqtt_unsubscribe") : $t("mqtt_subscribe") }}
              <span>
                <i class="material-icons">{{ subscriptionState ? "sync_disabled" : "sync" }}</i>
              </span>
            </button>
          </li>
        </div>
      </ul>
    </pw-section>
  </div>
</template>

<script>
import Paho from "paho-mqtt"
import debounce from "~/helpers/utils/debounce"

export default {
  data() {
    return {
      url: "wss://test.mosquitto.org:8081",
      isUrlValid: true,
      client: null,
      pub_topic: "",
      sub_topic: "",
      msg: "",
      connectionState: false,
      log: null,
      manualDisconnect: false,
      subscriptionState: false,
    }
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
  watch: {
    url(val) {
      this.debouncer()
    },
  },
  computed: {
    validUrl() {
      return this.isUrlValid
    },
    canpublish() {
      return this.pub_topic != "" && this.msg != "" && this.connectionState
    },
    cansubscribe() {
      return this.sub_topic != "" && this.connectionState
    },
  },
  methods: {
    debouncer: debounce(function () {
      this.worker.postMessage({ type: "ws", url: this.url })
    }, 1000),
    workerResponseHandler({ data }) {
      if (data.url === this.url) this.isUrlValid = data.result
    },
    connect() {
      this.log = [
        {
          payload: this.$t("connecting_to", { name: this.url }),
          source: "info",
          color: "var(--ac-color)",
          ts: new Date().toLocaleTimeString(),
        },
      ]
      let parseUrl = new URL(this.url)
      this.client = new Paho.Client(
        parseUrl.hostname,
        parseUrl.port != "" ? Number(parseUrl.port) : 8081,
        "postwoman"
      )
      this.client.connect({
        onSuccess: this.onConnectionSuccess,
        onFailure: this.onConnectionFailure,
        useSSL: true,
      })
      this.client.onConnectionLost = this.onConnectionLost
      this.client.onMessageArrived = this.onMessageArrived
    },
    onConnectionFailure() {
      this.connectionState = false
      this.log.push({
        payload: this.$t("error_occurred"),
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })
    },
    onConnectionSuccess() {
      this.connectionState = true
      this.log.push({
        payload: this.$t("connected_to", { name: this.url }),
        source: "info",
        color: "var(--ac-color)",
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
        color: "var(--ac-color)",
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
          color: "var(--ac-color)",
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
          payload: this.$t("error_occurred") + `while subscribing to topic:  ${this.sub_topic}`,
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
        color: "var(--ac-color)",
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
}
</script>
