<template>
  <div class="page">
    <pw-section class="blue" :label="$t('request')" ref="request">
      <ul>
        <li>
          <label for="url">{{ $t("url") }}</label>
          <input
            id="url"
            type="url"
            spellcheck="false"
            :class="{ error: !urlValid }"
            v-model="url"
            @keyup.enter="urlValid ? toggleConnection() : null"
          />
        </li>
        <div>
          <li>
            <label for="connect" class="hide-on-small-screen">&nbsp;</label>
            <button :disabled="!urlValid" id="connect" name="connect" @click="toggleConnection">
              {{ !connectionState ? $t("connect") : $t("disconnect") }}
              <span>
                <i class="material-icons">
                  {{ !connectionState ? "sync" : "sync_disabled" }}
                </i>
              </span>
            </button>
          </li>
        </div>
      </ul>
    </pw-section>

    <pw-section class="purple" :label="$t('communication')" id="response" ref="response">
      <ul>
        <li>
          <realtime-log :title="$t('log')" :log="communication.log" />
        </li>
      </ul>
      <ul>
        <li>
          <label for="message">{{ $t("message") }}</label>
          <input
            id="message"
            name="message"
            type="text"
            v-model="communication.input"
            :readonly="!connectionState"
            @keyup.enter="connectionState ? sendMessage() : null"
          />
        </li>
        <div>
          <li>
            <label for="send" class="hide-on-small-screen">&nbsp;</label>
            <button id="send" name="send" :disabled="!connectionState" @click="sendMessage">
              {{ $t("send") }}
              <span>
                <i class="material-icons">send</i>
              </span>
            </button>
          </li>
        </div>
      </ul>
    </pw-section>
  </div>
</template>

<script>
import { wsValid } from "~/functions/utils/valid"

export default {
  components: {
    "pw-section": () => import("../layout/section"),
    realtimeLog: () => import("./log"),
  },
  data() {
    return {
      connectionState: false,
      url: "wss://echo.websocket.org",
      socket: null,
      communication: {
        log: null,
        input: "",
      },
    }
  },
  computed: {
    urlValid() {
      return wsValid(this.url)
    },
  },
  methods: {
    toggleConnection() {
      // If it is connecting:
      if (!this.connectionState) return this.connect()
      // Otherwise, it's disconnecting.
      else return this.disconnect()
    },
    connect() {
      this.communication.log = [
        {
          payload: this.$t("connecting_to", { name: this.url }),
          source: "info",
          color: "var(--ac-color)",
        },
      ]
      try {
        this.socket = new WebSocket(this.url)
        this.socket.onopen = event => {
          this.connectionState = true
          this.communication.log = [
            {
              payload: this.$t("connected_to", { name: this.url }),
              source: "info",
              color: "var(--ac-color)",
              ts: new Date().toLocaleTimeString(),
            },
          ]
          this.$toast.success(this.$t("connected"), {
            icon: "sync",
          })
        }
        this.socket.onerror = event => {
          this.handleError()
        }
        this.socket.onclose = event => {
          this.connectionState = false
          this.communication.log.push({
            payload: this.$t("disconnected_from", { name: this.url }),
            source: "info",
            color: "#ff5555",
            ts: new Date().toLocaleTimeString(),
          })
          this.$toast.error(this.$t("disconnected"), {
            icon: "sync_disabled",
          })
        }
        this.socket.onmessage = event => {
          this.communication.log.push({
            payload: event.data,
            source: "server",
            ts: new Date().toLocaleTimeString(),
          })
        }
      } catch (ex) {
        this.handleError(ex)
        this.$toast.error(this.$t("something_went_wrong"), {
          icon: "error",
        })
      }
    },
    disconnect() {
      this.socket.close()
    },
    handleError(error) {
      this.disconnect()
      this.connectionState = false
      this.communication.log.push({
        payload: this.$t("error_occurred"),
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })
      if (error !== null)
        this.communication.log.push({
          payload: error,
          source: "info",
          color: "#ff5555",
          ts: new Date().toLocaleTimeString(),
        })
    },
    sendMessage() {
      const message = this.communication.input
      this.socket.send(message)
      this.communication.log.push({
        payload: message,
        source: "client",
        ts: new Date().toLocaleTimeString(),
      })
      this.communication.input = ""
    },
  },
}
</script>
