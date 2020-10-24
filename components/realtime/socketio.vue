<template>
  <div>
    <pw-section class="blue" :label="$t('request')" ref="request">
      <ul>
        <li>
          <label for="socketio-url">{{ $t("url") }}</label>
          <input
            id="socketio-url"
            type="url"
            spellcheck="false"
            :class="{ error: !urlValid }"
            v-model="url"
            @keyup.enter="urlValid ? toggleConnection() : null"
          />
        </li>
        <div>
          <li>
            <label for="socketio-path">{{ $t("path") }}</label>
            <input id="socketio-path" spellcheck="false" v-model="path" />
          </li>
        </div>
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
          <label for="event_name">{{ $t("event_name") }}</label>
          <input
            id="event_name"
            name="event_name"
            type="text"
            v-model="eventName"
            :readonly="!isConnected"
          />
        </li>
      </ul>
      <ul>
        <li>
          <div class="row-wrapper">
            <label>{{ $t("message") }}s</label>
          </div>
        </li>
      </ul>
      <ul v-for="(input, index) of inputs" :key="`input-${index}`">
        <li>
          <input
            name="message"
            type="text"
            :value="input"
            :readonly="!isConnected"
            @change="
              $store.commit('setSocketIOInput', {
                index,
                value: $event.target.value,
              })
            "
            @keyup.enter="isConnected ? sendMessage() : null"
          />
        </li>
        <div v-if="index + 1 !== inputs.length">
          <li>
            <button
              class="icon"
              @click="$store.commit('removeFromSocketIOInputs', index)"
              v-tooltip.bottom="$t('delete')"
              :id="`delete-socketio-message-${index}`"
            >
              <deleteIcon class="material-icons" />
            </button>
          </li>
        </div>
        <div v-if="index + 1 === inputs.length">
          <li>
            <button id="send" name="send" :disabled="!isConnected" @click="sendMessage">
              {{ $t("send") }}
              <span>
                <i class="material-icons">send</i>
              </span>
            </button>
          </li>
        </div>
      </ul>
      <ul>
        <li>
          <button class="icon" @click="addToInputs('')">
            <i class="material-icons">add</i>
            <span>{{ $t("add_new") }}</span>
          </button>
        </li>
      </ul>
    </pw-section>
  </div>
</template>

<script>
import { socketioValid } from "~/helpers/utils/valid"
import io from "socket.io-client"
import wildcard from "socketio-wildcard"
import deleteIcon from "~/static/icons/delete-24px.svg?inline"

export default {
  components: {
    deleteIcon,
  },
  computed: {
    urlValid() {
      return socketioValid(this.url)
    },
    url: {
      get() {
        return this.$store.state.socketIO.url
      },
      set(value) {
        this.$store.commit("setSocketIOState", { value, attribute: "url" })
      },
    },
    path: {
      get() {
        return this.$store.state.socketIO.path
      },
      set(value) {
        this.$store.commit("setSocketIOState", { value, attribute: "path" })
      },
    },
    socket: {
      get() {
        return this.$store.state.socketIO.socket
      },
      set(value) {
        this.$store.commit("setSocketIOState", { value, attribute: "socket" })
      },
    },
    log: {
      get() {
        return this.$store.state.socketIO.log
      },
      set(value) {
        this.$store.commit("setSocketIOState", { value, attribute: "log" })
      },
    },
    eventName: {
      get() {
        return this.$store.state.socketIO.eventName
      },
      set(value) {
        this.$store.commit("setSocketIOState", { value, attribute: "eventName" })
      },
    },
    inputs: {
      get() {
        return this.$store.state.socketIO.inputs
      },
      set(value) {
        this.$store.commit("setSocketIOState", { value, attribute: "inputs" })
      },
    },
    isConnected() {
      return this.socket instanceof io
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
        if (!this.path) {
          this.path = "/socket.io"
        }
        this.socket = new io(this.url, {
          path: this.path,
        })
        // Add ability to listen to all events
        wildcard(io.Manager)(this.socket)
        this.socket.on("connect", () => {
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
        })
        this.socket.on("*", ({ data }) => {
          const [eventName, message] = data
          this.addToLog({
            payload: `[${eventName}] ${message ? JSON.stringify(message) : ""}`,
            source: "server",
            ts: new Date().toLocaleTimeString(),
          })
        })
        this.socket.on("connect_error", (error) => {
          this.handleError(error)
        })
        this.socket.on("reconnect_error", (error) => {
          this.handleError(error)
        })
        this.socket.on("error", (data) => {
          this.handleError()
        })
        this.socket.on("disconnect", () => {
          this.addToLog({
            payload: this.$t("disconnected_from", { name: this.url }),
            source: "info",
            color: "#ff5555",
            ts: new Date().toLocaleTimeString(),
          })
          this.$toast.error(this.$t("disconnected"), {
            icon: "sync_disabled",
          })
        })
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
      if (error !== null) console.log(error)
      this.addToLog({
        payload: error,
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })
    },
    sendMessage() {
      const eventName = this.eventName
      const messages = (this.inputs || [])
        .map((input) => {
          try {
            return JSON.parse(input)
          } catch (err) {
            return input
          }
        })
        .filter((message) => !!message)

      if (this.socket) {
        this.socket.emit(eventName, ...messages, (data) => {
          // receive response from server
          this.addToLog({
            payload: `[${eventName}] ${JSON.stringify(data)}`,
            source: "server",
            ts: new Date().toLocaleTimeString(),
          })
        })

        this.addToLog({
          payload: `[${eventName}] ${JSON.stringify(messages)}`,
          source: "client",
          ts: new Date().toLocaleTimeString(),
        })
        this.inputs = [""]
      }
    },
    addToLog(obj) {
      this.$store.commit("addSocketIOLog", obj)
    },
    addToInputs(str) {
      this.$store.commit("addSocketIOInputs", str)
    },
  },
}
</script>
