<template>
  <div>
    <AppSection label="request">
      <ul>
        <li>
          <label for="socketio-url">{{ $t("url") }}</label>
          <input
            id="socketio-url"
            v-model="url"
            type="url"
            spellcheck="false"
            :class="{ error: !urlValid }"
            class="input md:rounded-bl-lg"
            :placeholder="$t('url')"
            @keyup.enter="urlValid ? toggleConnection() : null"
          />
        </li>
        <div>
          <li>
            <label for="socketio-path">{{ $t("path") }}</label>
            <input
              id="socketio-path"
              v-model="path"
              class="input"
              spellcheck="false"
            />
          </li>
        </div>
        <div>
          <li>
            <label for="connect" class="hide-on-small-screen">&nbsp;</label>
            <button
              id="connect"
              :disabled="!urlValid"
              name="connect"
              class="button rounded-b-lg md:rounded-bl-none md:rounded-br-lg"
              @click="toggleConnection"
            >
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
    </AppSection>

    <AppSection label="response">
      <ul>
        <li>
          <RealtimeLog :title="$t('log')" :log="communication.log" />
        </li>
      </ul>
      <ul>
        <li>
          <label for="event_name">{{ $t("event_name") }}</label>
          <input
            id="event_name"
            v-model="communication.eventName"
            class="input"
            name="event_name"
            type="text"
            :readonly="!connectionState"
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
      <ul
        v-for="(input, index) of communication.inputs"
        :key="`input-${index}`"
        :class="{ 'border-t': index == 0 }"
        class="
          border-b border-dashed
          divide-y
          md:divide-x
          border-divider
          divide-dashed divide-divider
          md:divide-y-0
        "
      >
        <li>
          <input
            v-model="communication.inputs[index]"
            class="input"
            name="message"
            type="text"
            :readonly="!connectionState"
            @keyup.enter="connectionState ? sendMessage() : null"
          />
        </li>
        <div v-if="index + 1 !== communication.inputs.length">
          <li>
            <button
              v-tooltip.bottom="$t('delete')"
              class="icon button"
              @click="removeCommunicationInput({ index })"
            >
              <i class="material-icons">delete</i>
            </button>
          </li>
        </div>
        <div v-if="index + 1 === communication.inputs.length">
          <li>
            <button
              id="send"
              class="button"
              name="send"
              :disabled="!connectionState"
              @click="sendMessage"
            >
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
          <button class="icon button" @click="addCommunicationInput">
            <i class="material-icons">add</i>
            <span>{{ $t("add_new") }}</span>
          </button>
        </li>
      </ul>
    </AppSection>
  </div>
</template>

<script>
import { io as Client } from "socket.io-client"
import wildcard from "socketio-wildcard"
import debounce from "~/helpers/utils/debounce"
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"

export default {
  data() {
    return {
      url: "wss://main-daxrc78qyb411dls-gtw.qovery.io",
      path: "/socket.io",
      isUrlValid: true,
      connectionState: false,
      io: null,
      communication: {
        log: null,
        eventName: "",
        inputs: [""],
      },
    }
  },
  computed: {
    urlValid() {
      return this.isUrlValid
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
      this.worker.postMessage({ type: "socketio", url: this.url })
    }, 1000),
    workerResponseHandler({ data }) {
      if (data.url === this.url) this.isUrlValid = data.result
    },
    removeCommunicationInput({ index }) {
      this.$delete(this.communication.inputs, index)
    },
    addCommunicationInput() {
      this.communication.inputs.push("")
    },
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
          color: "var(--accent-color)",
        },
      ]

      try {
        if (!this.path) {
          this.path = "/socket.io"
        }
        this.io = new Client(this.url, {
          path: this.path,
        })
        // Add ability to listen to all events
        wildcard(Client.Manager)(this.io)
        this.io.on("connect", () => {
          this.connectionState = true
          this.communication.log = [
            {
              payload: this.$t("connected_to", { name: this.url }),
              source: "info",
              color: "var(--accent-color)",
              ts: new Date().toLocaleTimeString(),
            },
          ]
          this.$toast.success(this.$t("connected"), {
            icon: "sync",
          })
        })
        this.io.on("*", ({ data }) => {
          const [eventName, message] = data
          this.communication.log.push({
            payload: `[${eventName}] ${message ? JSON.stringify(message) : ""}`,
            source: "server",
            ts: new Date().toLocaleTimeString(),
          })
        })
        this.io.on("connect_error", (error) => {
          this.handleError(error)
        })
        this.io.on("reconnect_error", (error) => {
          this.handleError(error)
        })
        this.io.on("error", () => {
          this.handleError()
        })
        this.io.on("disconnect", () => {
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
        })
      } catch (ex) {
        this.handleError(ex)
        this.$toast.error(this.$t("something_went_wrong"), {
          icon: "error",
        })
      }

      logHoppRequestRunToAnalytics({
        platform: "socketio",
      })
    },
    disconnect() {
      this.io.close()
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
      const eventName = this.communication.eventName
      const messages = (this.communication.inputs || [])
        .map((input) => {
          try {
            return JSON.parse(input)
          } catch (err) {
            return input
          }
        })
        .filter((message) => !!message)

      if (this.io) {
        this.io.emit(eventName, ...messages, (data) => {
          // receive response from server
          this.communication.log.push({
            payload: `[${eventName}] ${JSON.stringify(data)}`,
            source: "server",
            ts: new Date().toLocaleTimeString(),
          })
        })

        this.communication.log.push({
          payload: `[${eventName}] ${JSON.stringify(messages)}`,
          source: "client",
          ts: new Date().toLocaleTimeString(),
        })
        this.communication.inputs = [""]
      }
    },
  },
}
</script>
