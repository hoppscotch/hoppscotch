<template>
  <Splitpanes vertical :dbl-click-splitter="false">
    <Pane class="overflow-auto hide-scrollbar">
      <Splitpanes horizontal :dbl-click-splitter="false">
        <Pane class="overflow-auto hide-scrollbar">
          <AppSection label="request">
            <div class="bg-primary flex p-4 top-0 z-10 sticky">
              <div class="flex-1 inline-flex">
                <input
                  id="socketio-url"
                  v-model="url"
                  type="url"
                  spellcheck="false"
                  :class="{ error: !urlValid }"
                  class="
                    bg-primaryLight
                    border border-divider
                    rounded-l-lg
                    font-mono
                    text-secondaryDark
                    w-full
                    py-1
                    px-4
                    transition
                    truncate
                    focus:outline-none focus:border-accent
                  "
                  :placeholder="$t('url')"
                  @keyup.enter="urlValid ? toggleConnection() : null"
                />
                <input
                  id="socketio-path"
                  v-model="path"
                  class="
                    bg-primaryLight
                    border border-divider
                    font-mono
                    text-secondaryDark
                    w-full
                    py-1
                    px-4
                    transition
                    truncate
                    focus:outline-none focus:border-accent
                  "
                  spellcheck="false"
                />
                <ButtonPrimary
                  id="connect"
                  :disabled="!urlValid"
                  name="connect"
                  class="rounded-l-none"
                  :icon="!connectionState ? 'sync' : 'sync_disabled'"
                  :label="!connectionState ? $t('connect') : $t('disconnect')"
                  reverse
                  @click.native="toggleConnection"
                />
              </div>
            </div>
          </AppSection>
        </Pane>
        <Pane class="overflow-auto hide-scrollbar">
          <AppSection label="response">
            <RealtimeLog :title="$t('log')" :log="communication.log" />
          </AppSection>
        </Pane>
      </Splitpanes>
    </Pane>
    <Pane
      max-size="30"
      size="25"
      min-size="20"
      class="overflow-auto hide-scrollbar"
    >
      <AppSection label="messages">
        <label for="event_name">{{ $t("event_name") }}</label>
        <input
          id="event_name"
          v-model="communication.eventName"
          class="input"
          name="event_name"
          type="text"
          :readonly="!connectionState"
        />
        <div class="flex flex-1">
          <label>{{ $t("message") }}s</label>
        </div>
        <div
          v-for="(input, index) of communication.inputs"
          :key="`input-${index}`"
          :class="{ 'border-t': index == 0 }"
          class="
            divide-y divide-dashed divide-divider
            border-b border-dashed border-divider
            md:divide-x md:divide-y-0
          "
        >
          <input
            v-model="communication.inputs[index]"
            class="input"
            name="message"
            type="text"
            :readonly="!connectionState"
            @keyup.enter="connectionState ? sendMessage() : null"
          />
          <div v-if="index + 1 !== communication.inputs.length">
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('delete')"
              icon="delete"
              @click.native="removeCommunicationInput({ index })"
            />
          </div>
          <div v-if="index + 1 === communication.inputs.length">
            <ButtonSecondary
              id="send"
              class="button"
              name="send"
              :disabled="!connectionState"
              icon="send"
              :label="$t('send')"
              @click.native="sendMessage"
            />
          </div>
          <ButtonSecondary
            icon="add"
            :label="$t('add_new')"
            @click.native="addCommunicationInput"
          />
        </div>
      </AppSection>
    </Pane>
  </Splitpanes>
</template>

<script>
import { Splitpanes, Pane } from "splitpanes"
import { io as Client } from "socket.io-client"
import wildcard from "socketio-wildcard"
import debounce from "~/helpers/utils/debounce"
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"

export default {
  components: { Splitpanes, Pane },
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
