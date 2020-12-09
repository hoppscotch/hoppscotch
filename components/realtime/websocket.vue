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
          <log :title="$t('log')" :log="communication.log" />
        </li>
      </ul>
      <ul>
        <li>
          <label for="websocket-message">{{ $t("message") }}</label>
          <input
            id="websocket-message"
            name="message"
            type="text"
            v-model="communication.input"
            :readonly="!connectionState"
            @keyup.enter="connectionState ? sendMessage() : null"
            @keyup.up="connectionState ? walkHistory('up') : null"
            @keyup.down="connectionState ? walkHistory('down') : null"
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

    <section id="parameters">
      <tabs>
        <tab
          :id="'headers'"
          :label="$t('headers') + `${headers.length !== 0 ? ' \xA0 • \xA0 ' + headers.length : ''}`"
          :selected="true"
        >
          <pw-section class="orange" label="Headers" ref="headers">
            <http-headers
              v-model="headers"
              @add-request-header="addWebsocketHeader"
              @remove-request-header="removeWebsocketHeader"
              @clear-request-header-content="({ key, event }) => clearContent(key, event)"
            />
          </pw-section>
        </tab>
      </tabs>
    </section>
  </div>
</template>

<script>
import HttpHeaders from "~/components/http/headers.vue"
import debounce from "~/helpers/utils/debounce"

export default {
  components: {
    HttpHeaders,
  },
  data() {
    return {
      connectionState: false,
      url: "wss://echo.websocket.org",
      isUrlValid: true,
      socket: null,
      communication: {
        log: null,
        input: "",
      },
      currentIndex: -1, //index of the message log array to put in input box
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
  computed: {
    urlValid() {
      return this.isUrlValid
    },
  },
  watch: {
    url(val) {
      this.debouncer()
    },
    url: {
      get() {
        return this.$store.state.websocket.url
      },
      set(value) {
        this.$store.commit("setWebsocketState", { value, attribute: "url" })
      },
    },
    headers: {
      get() {
        return this.$store.state.websocket.headers
      },
      set(value) {
        this.$store.commit("setWebsocketState", { value, attribute: "headers" })
      },
    },
  },
  methods: {
    addWebsocketHeader() {
      this.$store.commit("addWebsocketHeaders", {
        key: "",
        value: "",
      })
      return false
    },
    removeWebsocketHeader({ index }) {
      // .slice() gives us an entirely new array rather than giving us just the reference
      const oldHeaders = this.headers.slice()
      this.$store.commit("removeWebsocketHeaders", index)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
        action: {
          text: this.$t("undo"),
          onClick: (e, toastObject) => {
            this.headers = oldHeaders
            toastObject.remove()
          },
        },
      })
    },

    clearContent(name, { target }) {
      switch (name) {
        case "bodyParams":
          this.bodyParams = []
          break
        case "rawParams":
          this.rawParams = "{}"
          break
        case "parameters":
          this.params = []
          break
        case "auth":
          this.auth = "None"
          this.httpUser = ""
          this.httpPassword = ""
          this.bearerToken = ""
          this.showTokenRequest = false
          this.tokens = []
          this.tokenReqs = []
          break
        case "access_token":
          this.accessTokenName = ""
          this.oidcDiscoveryUrl = ""
          this.authUrl = ""
          this.accessTokenUrl = ""
          this.clientId = ""
          this.scope = ""
          break
        case "headers":
          this.headers = []
          break
        case "tests":
          this.testReports = []
          break
        case "tokens":
          this.tokens = []
          break
        default:
          this.method = "GET"
          this.url = "https://httpbin.org"
          this.path = "/get"
          this.uri = this.url + this.path
          this.label = ""
          this.bodyParams = []
          this.rawParams = "{}"
          this.files = []
          this.params = []
          this.auth = "None"
          this.httpUser = ""
          this.httpPassword = ""
          this.bearerToken = ""
          this.showTokenRequest = false
          this.tokens = []
          this.tokenReqs = []
          this.accessTokenName = ""
          this.oidcDiscoveryUrl = ""
          this.authUrl = ""
          this.accessTokenUrl = ""
          this.clientId = ""
          this.scope = ""
          this.headers = []
          this.testReports = []
      }
      target.innerHTML = this.doneButton
      this.$toast.info(this.$t("cleared"), {
        icon: "clear_all",
      })
      setTimeout(() => (target.innerHTML = '<i class="material-icons">clear_all</i>'), 1000)
    debouncer: debounce(function () {
      this.worker.postMessage({ type: "ws", url: this.url })
    }, 1000),
    workerResponseHandler(message) {
      if (message.data.url === this.url) this.isUrlValid = message.data.result
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
          color: "var(--ac-color)",
        },
      ]
      try {
        this.socket = new WebSocket(this.url)
        this.socket.onopen = (event) => {
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
        this.socket.onerror = (event) => {
          this.handleError()
        }
        this.socket.onclose = (event) => {
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
        this.socket.onmessage = ({ data }) => {
          this.communication.log.push({
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
      if (this.socket) {
        this.socket.close()
      }
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
    walkHistory(direction) {
      const clientMessages = this.communication.log.filter(({ source }) => source === "client")
      const length = clientMessages.length
      switch (direction) {
        case "up":
          if (length > 0 && this.currentIndex !== 0) {
            //does nothing if message log is empty or the currentIndex is 0 when up arrow is pressed
            if (this.currentIndex === -1) {
              this.currentIndex = length - 1
              this.communication.input = clientMessages[this.currentIndex].payload
            } else if (this.currentIndex === 0) {
              this.communication.input = clientMessages[0].payload
            } else if (this.currentIndex > 0) {
              this.currentIndex = this.currentIndex - 1
              this.communication.input = clientMessages[this.currentIndex].payload
            }
          }
          break
        case "down":
          if (length > 0 && this.currentIndex > -1) {
            if (this.currentIndex === length - 1) {
              this.currentIndex = -1
              this.communication.input = ""
            } else if (this.currentIndex < length - 1) {
              this.currentIndex = this.currentIndex + 1
              this.communication.input = clientMessages[this.currentIndex].payload
            }
          }
          break
      }
    },
  },
}
</script>
