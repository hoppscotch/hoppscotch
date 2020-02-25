<template>
  <div class="page">
    <section id="options">
      <input id="tab-one" type="radio" name="options" checked="checked" />
      <label for="tab-one">{{ $t("websocket") }}</label>
      <div class="tab">
        <pw-section class="blue" :label="$t('request')" ref="request">
          <ul>
            <li>
              <label for="url">{{ $t("url") }}</label>
              <input
                id="url"
                type="url"
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
              <label for="log">{{ $t("log") }}</label>
              <div id="log" name="log" class="log">
                <span v-if="communication.log">
                  <span
                    v-for="(logEntry, index) in communication.log"
                    :style="{ color: logEntry.color }"
                    :key="index"
                    >@ {{ logEntry.ts }}{{ getSourcePrefix(logEntry.source)
                    }}{{ logEntry.payload }}</span
                  >
                </span>
                <span v-else>{{ $t("waiting_for_connection") }}</span>
              </div>
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
      <input id="tab-two" type="radio" name="options" />
      <label for="tab-two">{{ $t("sse") }}</label>
      <div class="tab">
        <pw-section class="blue" :label="$t('request')" ref="request">
          <ul>
            <li>
              <label for="server">{{ $t("server") }}</label>
              <input
                id="server"
                type="url"
                :class="{ error: !serverValid }"
                v-model="server"
                @keyup.enter="serverValid ? toggleSSEConnection() : null"
              />
            </li>
            <div>
              <li>
                <label for="start" class="hide-on-small-screen">&nbsp;</label>
                <button
                  :disabled="!serverValid"
                  id="start"
                  name="start"
                  @click="toggleSSEConnection"
                >
                  {{ !connectionSSEState ? $t("start") : $t("stop") }}
                  <span>
                    <i class="material-icons">
                      {{ !connectionSSEState ? "sync" : "sync_disabled" }}
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
              <label for="log">{{ $t("events") }}</label>
              <div id="log" name="log" class="log">
                <span v-if="events.log">
                  <span
                    v-for="(logEntry, index) in events.log"
                    :style="{ color: logEntry.color }"
                    :key="index"
                    >@ {{ logEntry.ts }}{{ getSourcePrefix(logEntry.source)
                    }}{{ logEntry.payload }}</span
                  >
                </span>
                <span v-else>{{ $t("waiting_for_connection") }}</span>
              </div>
              <div id="result"></div>
            </li>
          </ul>
        </pw-section>
      </div>
    </section>
  </div>
</template>

<style scoped lang="scss">
div.log {
  margin: 4px;
  padding: 8px 16px;
  width: calc(100% - 8px);
  border-radius: 8px;
  background-color: var(--bg-dark-color);
  color: var(--fg-color);
  height: 256px;
  overflow: auto;

  &,
  span {
    font-size: 16px;
    font-family: "Roboto Mono", monospace;
    font-weight: 400;
  }

  span {
    display: block;
    white-space: pre-wrap;
    word-wrap: break-word;
    word-break: break-all;
  }
}
</style>

<script>
export default {
  components: {
    "pw-section": () => import("../components/section"),
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
      connectionSSEState: false,
      server: "https://express-eventsource.herokuapp.com/events",
      sse: null,
      events: {
        log: null,
        input: "",
      },
    }
  },
  computed: {
    urlValid() {
      const protocol = "^(wss?:\\/\\/)?"
      const validIP = new RegExp(
        `${protocol}(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]).){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$`
      )
      const validHostname = new RegExp(
        `${protocol}(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]).)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9/])$`
      )
      return validIP.test(this.url) || validHostname.test(this.url)
    },
    serverValid() {
      const protocol = "^(https?:\\/\\/)?"
      const validIP = new RegExp(
        `${protocol}(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5]).){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$`
      )
      const validHostname = new RegExp(
        `${protocol}(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]).)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9-]*[A-Za-z0-9/])$`
      )
      return validIP.test(this.server) || validHostname.test(this.server)
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
    collapse({ target }) {
      const el = target.parentNode.className
      document.getElementsByClassName(el)[0].classList.toggle("hidden")
    },
    getSourcePrefix(source) {
      const sourceEmojis = {
        // Source used for info messages.
        info: "\tℹ️ [INFO]:\t",
        // Source used for client to server messages.
        client: "\t👽 [SENT]:\t",
        // Source used for server to client messages.
        server: "\t📥 [RECEIVED]:\t",
      }
      if (Object.keys(sourceEmojis).includes(source)) return sourceEmojis[source]
      return ""
    },
    toggleSSEConnection() {
      // If it is connecting:
      if (!this.connectionSSEState) return this.start()
      // Otherwise, it's disconnecting.
      else return this.stop()
    },
    start() {
      this.events.log = [
        {
          payload: this.$t("connecting_to", { name: this.server }),
          source: "info",
          color: "var(--ac-color)",
        },
      ]
      if (typeof EventSource !== "undefined") {
        try {
          this.sse = new EventSource(this.server)
          this.sse.onopen = event => {
            this.connectionSSEState = true
            this.events.log = [
              {
                payload: this.$t("connected_to", { name: this.server }),
                source: "info",
                color: "var(--ac-color)",
                ts: new Date().toLocaleTimeString(),
              },
            ]
            this.$toast.success(this.$t("connected"), {
              icon: "sync",
            })
          }
          this.sse.onerror = event => {
            this.handleSSEError()
          }
          this.sse.onclose = event => {
            this.connectionSSEState = false
            this.events.log.push({
              payload: this.$t("disconnected_from", { name: this.server }),
              source: "info",
              color: "#ff5555",
              ts: new Date().toLocaleTimeString(),
            })
            this.$toast.error(this.$t("disconnected"), {
              icon: "sync_disabled",
            })
          }
          this.sse.onmessage = event => {
            this.events.log.push({
              payload: event.data,
              source: "server",
              ts: new Date().toLocaleTimeString(),
            })
          }
        } catch (ex) {
          this.handleSSEError(ex)
          this.$toast.error(this.$t("something_went_wrong"), {
            icon: "error",
          })
        }
      } else {
        this.events.log = [
          {
            payload: this.$t("browser_support_sse"),
            source: "info",
            color: "#ff5555",
            ts: new Date().toLocaleTimeString(),
          },
        ]
      }
    },
    handleSSEError(error) {
      this.stop()
      this.connectionSSEState = false
      this.events.log.push({
        payload: this.$t("error_occurred"),
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })
      if (error !== null)
        this.events.log.push({
          payload: error,
          source: "info",
          color: "#ff5555",
          ts: new Date().toLocaleTimeString(),
        })
    },
    stop() {
      this.sse.onclose()
      this.sse.close()
    },
  },
  updated: function() {
    this.$nextTick(function() {
      const divLog = document.getElementById("log")
      divLog.scrollBy(0, divLog.scrollHeight + 100)
    })
  },
}
</script>
