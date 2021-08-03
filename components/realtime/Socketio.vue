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
                  type="url"
                  spellcheck="false"
                  :class="{ error: !urlValid }"
                  class="
                    bg-primaryLight
                    border border-divider
                    rounded-l
                    flex
                    font-semibold font-mono
                    flex-1
                    text-secondaryDark
                    w-full
                    py-2
                    px-4
                    transition
                    truncate
                    focus:border-accent focus:outline-none
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
                    flex
                    font-semibold font-mono
                    flex-1
                    text-secondaryDark
                    w-full
                    py-2
                    px-4
                    transition
                    truncate
                    focus:border-accent focus:outline-none
                  "
                  spellcheck="false"
                />
                <ButtonPrimary
                  id="connect"
                  :disabled="!urlValid"
                  name="connect"
                  class="rounded-l-none w-28"
                  :label="!connectionState ? $t('connect') : $t('disconnect')"
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
          <label for="events" class="font-semibold">
            {{ $t("events") }}
          </label>
        </div>
        <div class="flex px-4">
          <input
            id="event_name"
            v-model="communication.eventName"
            class="input"
            name="event_name"
            :placeholder="$t('event_name')"
            type="text"
            :disabled="!connectionState"
          />
        </div>
        <div class="bg-primary flex flex-1 p-4 items-center justify-between">
          <label class="font-semibold">{{ $t("communication") }}</label>
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
                :title="$t('delete')"
                icon="delete"
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
                :label="$t('send')"
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
      this.connectingState = false
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
})
</script>
