<template>
  <div>
    <AppSection label="request">
      <ul>
        <li>
          <label for="websocket-url">{{ $t("url") }}</label>
          <input
            id="websocket-url"
            v-model="url"
            class="input"
            type="url"
            spellcheck="false"
            :class="{ error: !urlValid }"
            :placeholder="$t('url')"
            @keyup.enter="urlValid ? toggleConnection() : null"
          />
        </li>
        <div>
          <li>
            <ButtonSecondary
              id="connect"
              :disabled="!urlValid"
              class="button"
              name="connect"
              :icon="!connectionState ? 'sync' : 'sync_disabled'"
              :label="!connectionState ? $t('connect') : $t('disconnect')"
              reverse
              @click.native="toggleConnection"
            />
          </li>
        </div>
      </ul>
      <ul>
        <li>
          <div class="row-wrapper">
            <label>{{ $t("protocols") }}</label>
          </div>
        </li>
      </ul>
      <ul
        v-for="(protocol, index) of protocols"
        :key="`protocol-${index}`"
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
            v-model="protocol.value"
            class="input"
            :placeholder="$t('protocol_count', { count: index + 1 })"
            name="message"
            type="text"
          />
        </li>
        <div>
          <li>
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="
                protocol.hasOwnProperty('active')
                  ? protocol.active
                    ? $t('turn_off')
                    : $t('turn_on')
                  : $t('turn_off')
              "
              @click.native="
                protocol.active = protocol.hasOwnProperty('active')
                  ? !protocol.active
                  : false
              "
            />
            <i class="material-icons">
              {{
                protocol.hasOwnProperty("active")
                  ? protocol.active
                    ? "check_box"
                    : "check_box_outline_blank"
                  : "check_box"
              }}
            </i>
          </li>
        </div>
        <div>
          <li>
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('delete')"
              icon="delete"
              @click.native="deleteProtocol({ index })"
            />
          </li>
        </div>
      </ul>
      <ul>
        <li>
          <ButtonSecondary
            icon="add"
            :label="$t('add_new')"
            @click.native="addProtocol"
          />
        </li>
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
          <label for="websocket-message">{{ $t("message") }}</label>
          <input
            id="websocket-message"
            v-model="communication.input"
            name="message"
            type="text"
            :readonly="!connectionState"
            class="input md:rounded-bl-lg"
            @keyup.enter="connectionState ? sendMessage() : null"
            @keyup.up="connectionState ? walkHistory('up') : null"
            @keyup.down="connectionState ? walkHistory('down') : null"
          />
        </li>
        <div>
          <li>
            <ButtonSecondary
              id="send"
              name="send"
              :disabled="!connectionState"
              class="button rounded-b-lg md:rounded-bl-none md:rounded-br-lg"
              icon="send"
              :label="$t('send')"
              @click.native="sendMessage"
            />
          </li>
        </div>
      </ul>
    </AppSection>
  </div>
</template>

<script>
import debounce from "~/helpers/utils/debounce"

export default {
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
      currentIndex: -1, // index of the message log array to put in input box
      protocols: [],
      activeProtocols: [],
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
    protocols: {
      handler(newVal) {
        this.activeProtocols = newVal
          .filter((item) =>
            Object.prototype.hasOwnProperty.call(item, "active")
              ? item.active === true
              : true
          )
          .map(({ value }) => value)
      },
      deep: true,
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
        this.socket = new WebSocket(this.url, this.activeProtocols)
        this.socket.onopen = () => {
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
        }
        this.socket.onerror = () => {
          this.handleError()
        }
        this.socket.onclose = () => {
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
      const clientMessages = this.communication.log.filter(
        ({ source }) => source === "client"
      )
      const length = clientMessages.length
      switch (direction) {
        case "up":
          if (length > 0 && this.currentIndex !== 0) {
            // does nothing if message log is empty or the currentIndex is 0 when up arrow is pressed
            if (this.currentIndex === -1) {
              this.currentIndex = length - 1
              this.communication.input =
                clientMessages[this.currentIndex].payload
            } else if (this.currentIndex === 0) {
              this.communication.input = clientMessages[0].payload
            } else if (this.currentIndex > 0) {
              this.currentIndex = this.currentIndex - 1
              this.communication.input =
                clientMessages[this.currentIndex].payload
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
              this.communication.input =
                clientMessages[this.currentIndex].payload
            }
          }
          break
      }
    },
    addProtocol() {
      this.protocols.push({ value: "", active: true })
    },
    deleteProtocol({ index }) {
      const oldProtocols = this.protocols.slice()
      this.$delete(this.protocols, index)
      this.$toast.error(this.$t("deleted"), {
        icon: "delete",
        action: {
          text: this.$t("undo"),
          duration: 4000,
          onClick: (_, toastObject) => {
            this.protocols = oldProtocols
            toastObject.remove()
          },
        },
      })
    },
  },
}
</script>
