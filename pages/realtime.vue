<template>
  <div class="page">
    <section id="options">
      <tabs>
        <tab :id="'websocket'" :label="$t('websocket')" :selected="true">
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
                  <button
                    :disabled="!urlValid"
                    id="connect"
                    name="connect"
                    @click="toggleConnection"
                  >
                    {{ !connectionState ? $t("connect") : $t("disconnect") }}
                    <span>
                      <i class="material-icons">{{
                        !connectionState ? "sync" : "sync_disabled"
                      }}</i>
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
        </tab>

        <tab :id="'sse'" :label="$t('sse')">
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
                      <i class="material-icons">{{
                        !connectionSSEState ? "sync" : "sync_disabled"
                      }}</i>
                    </span>
                  </button>
                </li>
              </div>
            </ul>
          </pw-section>

          <pw-section class="purple" :label="$t('communication')" id="response" ref="response">
            <ul>
              <li>
                <realtime-log :title="$t('events')" :log="events.log" />
                <div id="result"></div>
              </li>
            </ul>
          </pw-section>
        </tab>

        <tab :id="'socketio'" :label="$t('socketio')">
          <socketio />
        </tab>
        <tab :id="'mqtt'" :label="$t('mqtt')">
          <mqtt />
        </tab>
      </tabs>
    </section>
  </div>
</template>

<script>
import { wsValid, sseValid } from "~/functions/utils/valid"
import realtimeLog from "~/components/realtime/log"

export default {
  components: {
    "pw-section": () => import("../components/layout/section"),
    socketio: () => import("../components/realtime/socketio"),
    tabs: () => import("../components/ui/tabs"),
    tab: () => import("../components/ui/tab"),
    mqtt: () => import("../components/realtime/mqtt"),
    realtimeLog,
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
      return wsValid(this.url)
    },
    serverValid() {
      return sseValid(this.server)
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
}
</script>
