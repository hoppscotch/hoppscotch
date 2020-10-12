<template>
  <div class="page">
    <pw-section class="blue" :label="$t('request')" ref="request">
      <ul>
        <li>
          <label for="websocket-url">{{ $t("url") }}</label>
          <input
            id="websocket-url"
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
              {{ !isConnected ? $t("connect") : $t("disconnect") }}
              <span>
                <i class="material-icons">
                  {{ !isConnected ? "sync" : "sync_disabled" }}
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
          <log :title="$t('log')" :log="log" />
        </li>
      </ul>
      <ul>
        <li>
          <label for="websocket-message">{{ $t("message") }}</label>
          <input
            id="websocket-message"
            name="message"
            type="text"
            v-model="message"
            :readonly="!isConnected"
            @keyup.enter="isConnected ? sendMessage() : null"
            @keyup.up="isConnected ? walkHistory('up') : null"
            @keyup.down="isConnected ? walkHistory('down') : null"
          />
        </li>
        <div>
          <li>
            <label for="send" class="hide-on-small-screen">&nbsp;</label>
            <button id="send" name="send" :disabled="!isConnected" @click="sendMessage">
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
import { wsValid } from "~/helpers/utils/valid"

export default {
  data() {
    return {
      currentIndex: -1, //index of the message log array to put in input box
    }
  },
  computed: {
    urlValid() {
      return wsValid(this.url)
    },
    url: {
      get() {
        return this.$store.state.ws.url
      },
      set(value) {
        this.$store.commit("setWebSocketState", { value, attribute: "url" })
      },
    },
    message: {
      get() {
        return this.$store.state.ws.message
      },
      set(value) {
        this.$store.commit("setWebSocketState", { value, attribute: "message" })
      },
    },
    log: {
      get() {
        return this.$store.state.ws.log
      },
      set(value) {
        this.$store.commit("setWebSocketState", { value, attribute: "log" })
      },
    },
    socket: {
      get() {
        return this.$store.state.ws.socket
      },
      set(value) {
        this.$store.commit("setWebSocketState", { value, attribute: "socket" })
      },
    },
    isConnected() {
      return this.socket instanceof WebSocket
    },
  },
  methods: {
    toggleConnection() {
      // If it is connecting:
      if (!this.isConnected) return this.connect()
      // Otherwise, it's disconnecting.
      else return this.disconnect()
    },
    connect() {
      this.log = [
        {
          payload: this.$t("connecting_to", { name: this.url }),
          source: "info",
          color: "var(--ac-color)",
        },
      ]
      try {
        this.socket = new WebSocket(this.url)
        this.socket.onopen = (event) => {
          this.log = [
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
        this.socket.onerror = (event) => {
          this.handleError()
        }
        this.socket.onclose = (event) => {
          this.addToLog({
            payload: this.$t("disconnected_from", { name: this.url }),
            source: "info",
            color: "#ff5555",
            ts: new Date().toLocaleTimeString(),
          })
          this.$toast.error(this.$t("disconnected"), {
            icon: "sync_disabled",
          })
        }
        this.socket.onmessage = ({ data }) => {
          this.addToLog({
            payload: data,
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
      this.socket = null
    },
    handleError(error) {
      this.disconnect()
      this.addToLog({
        payload: this.$t("error_occurred"),
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })
      if (error !== null)
        this.addToLog({
          payload: error,
          source: "info",
          color: "#ff5555",
          ts: new Date().toLocaleTimeString(),
        })
    },
    sendMessage() {
      const message = this.message
      this.socket.send(message)
      this.addToLog({
        payload: message,
        source: "client",
        ts: new Date().toLocaleTimeString(),
      })
      this.message = ""
    },
    addToLog(obj) {
      this.$store.commit("addWebSocketLog", obj)
    },
    walkHistory(direction) {
      const clientMessages = this.log.filter(({ source }) => source === "client")
      const length = clientMessages.length
      switch (direction) {
        case "up":
          if (length > 0 && this.currentIndex !== 0) {
            //does nothing if message log is empty or the currentIndex is 0 when up arrow is pressed
            if (this.currentIndex === -1) {
              this.currentIndex = length - 1
              this.message = clientMessages[this.currentIndex].payload
            } else if (this.currentIndex === 0) {
              this.message = clientMessages[0].payload
            } else if (this.currentIndex > 0) {
              this.currentIndex = this.currentIndex - 1
              this.message = clientMessages[this.currentIndex].payload
            }
          }
          break
        case "down":
          if (length > 0 && this.currentIndex > -1) {
            if (this.currentIndex === length - 1) {
              this.currentIndex = -1
              this.message = ""
            } else if (this.currentIndex < length - 1) {
              this.currentIndex = this.currentIndex + 1
              this.message = clientMessages[this.currentIndex].payload
            }
          }
          break
      }
    },
    handleRefresh() {
      // refreshing disconnects socket so we must manually add that to log
      if (this.socket instanceof WebSocket) {
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
