<template>
  <Splitpanes :dbl-click-splitter="false" vertical>
    <Pane class="hide-scrollbar !overflow-auto">
      <Splitpanes :dbl-click-splitter="false" horizontal>
        <Pane class="hide-scrollbar !overflow-auto">
          <AppSection label="request">
            <div class="bg-primary flex p-4 top-0 z-10 sticky">
              <div class="flex-1 inline-flex">
                <input
                  id="socketio-url"
                  v-model="url"
                  v-focus
                  type="url"
                  spellcheck="false"
                  :class="{ error: !urlValid }"
                  class="
                    bg-primaryLight
                    border border-divider
                    rounded-l
                    flex flex-1
                    text-secondaryDark
                    w-full
                    py-2
                    px-4
                    focus-visible:border-accent
                  "
                  :placeholder="$t('socketio.url')"
                  @keyup.enter="urlValid ? toggleConnection() : null"
                />
                <input
                  id="socketio-path"
                  v-model="path"
                  class="
                    bg-primaryLight
                    border border-divider
                    flex flex-1
                    text-secondaryDark
                    w-full
                    py-2
                    px-4
                    focus-visible:border-accent
                  "
                  spellcheck="false"
                />
                <ButtonPrimary
                  id="connect"
                  :disabled="!urlValid"
                  name="connect"
                  class="rounded-l-none w-28"
                  :label="
                    !connectionState
                      ? $t('action.connect')
                      : $t('action.disconnect')
                  "
                  :loading="connectingState"
                  @click.native="toggleConnection"
                />
              </div>
            </div>
          </AppSection>
        </Pane>
        <Pane class="hide-scrollbar !overflow-auto">
          <AppSection label="response">
            <RealtimeLog :title="$t('log')" :log="communication.log" />
          </AppSection>
        </Pane>
      </Splitpanes>
    </Pane>
    <Pane
      v-if="RIGHT_SIDEBAR"
      max-size="35"
      size="25"
      min-size="20"
      class="hide-scrollbar !overflow-auto"
    >
      <AppSection label="messages">
        <div class="flex flex-col flex-1 p-4 inline-flex">
          <label for="events" class="font-semibold text-secondaryLight">
            {{ $t("socketio.events") }}
          </label>
        </div>
        <div class="flex px-4">
          <input
            id="event_name"
            v-model="communication.eventName"
            class="input"
            name="event_name"
            :placeholder="$t('socketio.event_name')"
            type="text"
            :disabled="!connectionState"
          />
        </div>
        <div class="flex flex-1 p-4 items-center justify-between">
          <label class="font-semibold text-secondaryLight">{{
            $t("socketio.communication")
          }}</label>
          <div class="flex">
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('add.new')"
              icon="add"
              @click.native="addCommunicationInput"
            />
          </div>
        </div>
        <div class="flex flex-col space-y-2 px-4">
          <div
            v-for="(input, index) of communication.inputs"
            :key="`input-${index}`"
          >
            <div class="flex">
              <input
                v-model="communication.inputs[index]"
                class="input !rounded-r-none"
                name="message"
                :placeholder="$t('count.message', { count: index + 1 })"
                type="text"
                :disabled="!connectionState"
                @keyup.enter="connectionState ? sendMessage() : null"
              />
              <ButtonSecondary
                v-if="index + 1 !== communication.inputs.length"
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('action.remove')"
                icon="remove_circle_outline"
                class="rounded-l-none"
                color="red"
                outline
                @click.native="removeCommunicationInput({ index })"
              />
              <ButtonPrimary
                v-if="index + 1 === communication.inputs.length"
                id="send"
                name="send"
                :disabled="!connectionState"
                class="rounded-l-none"
                :label="$t('action.send')"
                @click.native="sendMessage"
              />
            </div>
          </div>
        </div>
      </AppSection>
    </Pane>
  </Splitpanes>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"
import { io as Client } from "socket.io-client"
import wildcard from "socketio-wildcard"
import debounce from "~/helpers/utils/debounce"
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"
import { useSetting } from "~/newstore/settings"

export default defineComponent({
  components: { Splitpanes, Pane },
  setup() {
    return {
      RIGHT_SIDEBAR: useSetting("RIGHT_SIDEBAR"),
    }
  },
  data() {
    return {
      url: "wss://main-daxrc78qyb411dls-gtw.qovery.io",
      path: "/socket.io",
      isUrlValid: true,
      connectingState: false,
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
      this.connectingState = true
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
          this.connectingState = false
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
          this.connectingState = false
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
      } catch (e) {
        this.handleError(e)
        this.$toast.error(this.$t("error.something_went_wrong"), {
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
      this.connectingState = false
      this.connectionState = false
      this.communication.log.push({
        payload: this.$t("error.something_went_wrong"),
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
          } catch (e) {
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
})
</script>
