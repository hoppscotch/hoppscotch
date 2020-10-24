<template>
  <div>
    <pw-section class="blue" :label="$t('request')">
      <ul>
        <li>
          <label for="mqtt-url">{{ $t("url") }}</label>
          <input id="mqtt-url" type="url" v-model="url" spellcheck="false" />
        </li>
        <div>
          <li>
            <label for="connect" class="hide-on-small-screen">&nbsp;</label>
            <button id="connect" :disabled="!validUrl" @click="toggleConnection">
              {{ isConnected ? $t("disconnect") : $t("connect") }}
              <span>
                <i class="material-icons">{{ !isConnected ? "sync" : "sync_disabled" }}</i>
              </span>
            </button>
          </li>
        </div>
      </ul>
    </pw-section>

    <pw-section class="blue" :label="$t('communication')">
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
          <input id="mqtt-message" type="text" v-model="msg" spellcheck="false" />
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
          <input id="sub_topic" type="text" v-model="sub_topic" spellcheck="false" />
        </li>
        <div>
          <li>
            <label for="subscribe" class="hide-on-small-screen">&nbsp;</label>
            <button id="subscribe" name="get" :disabled="!cansubscribe" @click="toggleSubscription">
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
import { wsValid } from "~/helpers/utils/valid"

export default {
  data() {
    return {
      manualDisconnect: false,
      subscriptionState: false,
    }
  },
  computed: {
    validUrl() {
      return wsValid(this.url)
    },
    canpublish() {
      return this.pub_topic != "" && this.msg != "" && this.isConnected
    },
    cansubscribe() {
      return this.sub_topic != "" && this.isConnected
    },
    url: {
      get() {
        return this.$store.state.mqtt.url
      },
      set(value) {
        this.$store.commit("setMQTTState", { value, attribute: "url" })
      },
    },
    client: {
      get() {
        return this.$store.state.mqtt.client
      },
      set(value) {
        this.$store.commit("setMQTTState", { value, attribute: "client" })
      },
    },
    pub_topic: {
      get() {
        return this.$store.state.mqtt.pub_topic
      },
      set(value) {
        this.$store.commit("setMQTTState", { value, attribute: "pub_topic" })
      },
    },
    sub_topic: {
      get() {
        return this.$store.state.mqtt.sub_topic
      },
      set(value) {
        this.$store.commit("setMQTTState", { value, attribute: "sub_topic" })
      },
    },
    msg: {
      get() {
        return this.$store.state.mqtt.msg
      },
      set(value) {
        this.$store.commit("setMQTTState", { value, attribute: "msg" })
      },
    },
    log: {
      get() {
        return this.$store.state.mqtt.log
      },
      set(value) {
        this.$store.commit("setMQTTState", { value, attribute: "log" })
      },
    },
    isConnected() {
      return this.client instanceof Paho.Client
    },
  },
  methods: {
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
      this.addToLog({
        payload: this.$t("error_occurred"),
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })
    },
    onConnectionSuccess() {
      this.addToLog({
        payload: this.$t("connected_to", { name: this.url }),
        source: "info",
        color: "var(--ac-color)",
        ts: new Date().toLocaleTimeString(),
      })
      this.$toast.success(this.$t("connected"), {
        icon: "sync",
      })
    },
    onMessageArrived(message) {
      this.addToLog({
        payload: `Message: ${message.payloadString} arrived on topic: ${message.destinationName}`,
        source: "info",
        color: "var(--ac-color)",
        ts: new Date().toLocaleTimeString(),
      })
    },
    toggleConnection() {
      if (this.isConnected) {
        this.disconnect()
      } else {
        this.connect()
      }
    },
    disconnect() {
      this.manualDisconnect = true
      this.client.disconnect()
      this.addToLog({
        payload: this.$t("disconnected_from", { name: this.url }),
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })
    },
    onConnectionLost() {
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
        this.addToLog({
          payload: `Published message: ${this.msg} to topic: ${this.pub_topic}`,
          ts: new Date().toLocaleTimeString(),
          source: "info",
          color: "var(--ac-color)",
        })
      } catch (e) {
        this.addToLog({
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
        this.addToLog({
          payload: this.$t("error_occurred") + `while subscribing to topic:  ${this.sub_topic}`,
          source: "info",
          color: "#ff5555",
          ts: new Date().toLocaleTimeString(),
        })
      }
    },
    usubSuccess() {
      this.subscriptionState = !this.subscriptionState
      this.addToLog({
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
      this.addToLog({
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
    addToLog(obj) {
      this.$store.commit("addMQTTLog", obj)
    },
    handleRefresh() {
      // refreshing disconnects client so we must manually add that to log
      if (this.client instanceof Paho.Client) {
        this.addToLog({
          payload: this.$t("disconnected_from", { name: this.url }),
          source: "info",
          color: "#ff5555",
          ts: new Date().toLocaleTimeString(),
        })
      }
    },
  },
  beforeMount() {
    window.addEventListener("beforeunload", this.handleRefresh)
  },
}
</script>
