<template>
  <Splitpanes
    class="smart-splitter"
    :rtl="SIDEBAR_ON_LEFT && mdAndLarger"
    :class="{
      '!flex-row-reverse': SIDEBAR_ON_LEFT && mdAndLarger,
    }"
    :horizontal="!mdAndLarger"
  >
    <Pane
      size="75"
      min-size="65"
      class="hide-scrollbar !overflow-auto flex flex-col"
    >
      <Splitpanes class="smart-splitter" :horizontal="COLUMN_LAYOUT">
        <Pane
          :size="COLUMN_LAYOUT ? 45 : 50"
          class="hide-scrollbar !overflow-auto flex flex-col"
        >
          <div
            class="sticky top-0 z-10 flex flex-shrink-0 p-4 overflow-x-auto space-x-2 bg-primary hide-scrollbar"
          >
            <div class="inline-flex flex-1 space-x-2">
              <div class="flex flex-1">
                <label for="client-version">
                  <tippy
                    ref="versionOptions"
                    interactive
                    trigger="click"
                    theme="popover"
                    arrow
                  >
                    <template #trigger>
                      <span class="select-wrapper">
                        <input
                          id="client-version"
                          v-tippy="{ theme: 'tooltip' }"
                          title="socket.io-client version"
                          class="flex px-4 py-2 font-semibold border rounded-l cursor-pointer bg-primaryLight border-divider text-secondaryDark w-26 hover:border-dividerDark focus-visible:bg-transparent focus-visible:border-dividerDark"
                          :value="`Client ${clientVersion}`"
                          readonly
                          :disabled="connectionState"
                        />
                      </span>
                    </template>
                    <SmartItem
                      v-for="(_, version) in socketIoClients"
                      :key="`client-${version}`"
                      :label="`Client ${version}`"
                      @click.native="onSelectVersion(version)"
                    />
                  </tippy>
                </label>
                <input
                  id="socketio-url"
                  v-model="url"
                  type="url"
                  autocomplete="off"
                  spellcheck="false"
                  :class="{ error: !urlValid }"
                  class="flex flex-1 w-full px-4 py-2 border bg-primaryLight border-divider text-secondaryDark hover:border-dividerDark focus-visible:bg-transparent focus-visible:border-dividerDark"
                  :placeholder="$t('socketio.url')"
                  :disabled="connectionState"
                  @keyup.enter="urlValid ? toggleConnection() : null"
                />
                <input
                  id="socketio-path"
                  v-model="path"
                  class="flex flex-1 w-full px-4 py-2 border rounded-r bg-primaryLight border-divider text-secondaryDark hover:border-dividerDark focus-visible:bg-transparent focus-visible:border-dividerDark"
                  spellcheck="false"
                  :disabled="connectionState"
                  @keyup.enter="urlValid ? toggleConnection() : null"
                />
              </div>
              <ButtonPrimary
                id="connect"
                :disabled="!urlValid"
                name="connect"
                class="w-32"
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
          <div
            class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-upperPrimaryStickyFold"
          >
            <span class="flex items-center">
              <label class="font-semibold text-secondaryLight">
                {{ $t("authorization.type") }}
              </label>
              <tippy
                ref="authTypeOptions"
                interactive
                trigger="click"
                theme="popover"
                arrow
              >
                <template #trigger>
                  <span class="select-wrapper">
                    <ButtonSecondary
                      class="pr-8 ml-2 rounded-none"
                      :label="authType"
                    />
                  </span>
                </template>
                <SmartItem
                  label="None"
                  :icon="
                    authType === 'None'
                      ? 'radio_button_checked'
                      : 'radio_button_unchecked'
                  "
                  :active="authType === 'None'"
                  @click.native="
                    () => {
                      authType = 'None'
                      authTypeOptions.tippy().hide()
                    }
                  "
                />
                <SmartItem
                  label="Bearer Token"
                  :icon="
                    authType === 'Bearer'
                      ? 'radio_button_checked'
                      : 'radio_button_unchecked'
                  "
                  :active="authType === 'Bearer'"
                  @click.native="
                    () => {
                      authType = 'Bearer'
                      authTypeOptions.tippy().hide()
                    }
                  "
                />
              </tippy>
            </span>
            <div class="flex">
              <SmartCheckbox
                :on="authActive"
                class="px-2"
                @change="authActive = !authActive"
              >
                {{ $t("state.enabled") }}
              </SmartCheckbox>
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                to="https://docs.hoppscotch.io/features/authorization"
                blank
                :title="$t('app.wiki')"
                svg="help-circle"
              />
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="$t('action.clear')"
                svg="trash-2"
                @click.native="clearContent"
              />
            </div>
          </div>
          <div
            v-if="authType === 'None'"
            class="flex flex-col items-center justify-center p-4 text-secondaryLight"
          >
            <img
              :src="`/images/states/${$colorMode.value}/login.svg`"
              loading="lazy"
              class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
              :alt="$t('empty.authorization')"
            />
            <span class="pb-4 text-center">
              This SocketIO connection does not use any authentication.
            </span>
            <ButtonSecondary
              outline
              :label="$t('app.documentation')"
              to="https://docs.hoppscotch.io/features/authorization"
              blank
              svg="external-link"
              reverse
              class="mb-4"
            />
          </div>
          <div
            v-if="authType === 'Bearer'"
            class="flex flex-1 border-b border-dividerLight"
          >
            <div class="w-2/3 border-r border-dividerLight">
              <div class="flex flex-1 border-b border-dividerLight">
                <SmartEnvInput
                  v-model="bearerToken"
                  placeholder="Token"
                  styles="bg-transparent flex flex-1 py-1 px-4"
                />
              </div>
            </div>
            <div
              class="sticky h-full p-4 overflow-auto bg-primary top-upperTertiaryStickyFold min-w-46 max-w-1/3 z-9"
            >
              <div class="p-2">
                <div class="pb-2 text-secondaryLight">
                  {{ $t("helpers.authorization") }}
                </div>
                <SmartAnchor
                  class="link"
                  :label="`${$t('authorization.learn')} \xA0 →`"
                  to="https://docs.hoppscotch.io/features/authorization"
                  blank
                />
              </div>
            </div>
          </div>
        </Pane>
        <Pane
          :size="COLUMN_LAYOUT ? 65 : 50"
          class="hide-scrollbar !overflow-auto flex flex-col"
        >
          <RealtimeLog :title="$t('socketio.log')" :log="log" />
        </Pane>
      </Splitpanes>
    </Pane>
    <Pane
      v-if="SIDEBAR"
      size="25"
      min-size="20"
      class="hide-scrollbar !overflow-auto flex flex-col"
    >
      <div class="flex items-center justify-between p-4">
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
          autocomplete="off"
          :disabled="!connectionState"
        />
      </div>
      <div class="flex items-center justify-between p-4">
        <label class="font-semibold text-secondaryLight">
          {{ $t("socketio.communication") }}
        </label>
        <div class="flex">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('add.new')"
            svg="plus"
            @click.native="addCommunicationInput"
          />
        </div>
      </div>
      <div class="flex flex-col px-4 pb-4 space-y-2">
        <div
          v-for="(input, index) of communication.inputs"
          :key="`input-${index}`"
        >
          <div class="flex space-x-2">
            <input
              v-model="communication.inputs[index]"
              class="input"
              name="message"
              :placeholder="$t('count.message', { count: index + 1 })"
              type="text"
              autocomplete="off"
              :disabled="!connectionState"
              @keyup.enter="connectionState ? sendMessage() : null"
            />
            <ButtonSecondary
              v-if="index + 1 !== communication.inputs.length"
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('action.remove')"
              svg="trash"
              color="red"
              outline
              @click.native="removeCommunicationInput({ index })"
            />
            <ButtonPrimary
              v-if="index + 1 === communication.inputs.length"
              id="send"
              name="send"
              :disabled="!connectionState"
              :label="$t('action.send')"
              @click.native="sendMessage"
            />
          </div>
        </div>
      </div>
    </Pane>
  </Splitpanes>
</template>

<script>
import { defineComponent, ref } from "@nuxtjs/composition-api"
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"
// All Socket.IO client version imports
import ClientV2 from "socket.io-client-v2"
import { io as ClientV3 } from "socket.io-client-v3"
import { io as ClientV4 } from "socket.io-client-v4"

import wildcard from "socketio-wildcard"
import debounce from "lodash/debounce"
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core"
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"
import { useSetting } from "~/newstore/settings"
import {
  SIOEndpoint$,
  setSIOEndpoint,
  SIOVersion$,
  setSIOVersion,
  SIOPath$,
  setSIOPath,
  SIOConnectionState$,
  SIOConnectingState$,
  setSIOConnectionState,
  setSIOConnectingState,
  SIOSocket$,
  setSIOSocket,
  SIOLog$,
  setSIOLog,
  addSIOLogLine,
} from "~/newstore/SocketIOSession"
import { useStream } from "~/helpers/utils/composables"

const socketIoClients = {
  v4: ClientV4,
  v3: ClientV3,
  v2: ClientV2,
}

export default defineComponent({
  components: { Splitpanes, Pane },
  setup() {
    const breakpoints = useBreakpoints(breakpointsTailwind)
    const mdAndLarger = breakpoints.greater("md")

    return {
      mdAndLarger,
      SIDEBAR: useSetting("SIDEBAR"),
      COLUMN_LAYOUT: useSetting("COLUMN_LAYOUT"),
      SIDEBAR_ON_LEFT: useSetting("SIDEBAR_ON_LEFT"),
      socketIoClients,
      url: useStream(SIOEndpoint$, "", setSIOEndpoint),
      clientVersion: useStream(SIOVersion$, "", setSIOVersion),
      path: useStream(SIOPath$, "", setSIOPath),
      connectingState: useStream(
        SIOConnectingState$,
        false,
        setSIOConnectingState
      ),
      connectionState: useStream(
        SIOConnectionState$,
        false,
        setSIOConnectionState
      ),
      io: useStream(SIOSocket$, null, setSIOSocket),
      log: useStream(SIOLog$, [], setSIOLog),
      authTypeOptions: ref(null),
    }
  },
  data() {
    return {
      isUrlValid: true,
      communication: {
        eventName: "",
        inputs: [""],
      },
      authType: "None",
      bearerToken: "",
      authActive: true,
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
    connectionState(connected) {
      if (connected) this.$refs.versionOptions.tippy().disable()
      else this.$refs.versionOptions.tippy().enable()
    },
  },
  created() {
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
      this.log = [
        {
          payload: this.$t("state.connecting_to", { name: this.url }),
          source: "info",
          color: "var(--accent-color)",
        },
      ]

      try {
        if (!this.path) {
          this.path = "/socket.io"
        }
        const Client = socketIoClients[this.clientVersion]
        if (this.authActive && this.authType === "Bearer") {
          this.io = new Client(this.url, {
            path: this.path,
            auth: {
              token: this.bearerToken,
            },
          })
        } else {
          this.io = new Client(this.url, { path: this.path })
        }

        // Add ability to listen to all events
        wildcard(Client.Manager)(this.io)
        this.io.on("connect", () => {
          this.connectingState = false
          this.connectionState = true
          this.log = [
            {
              payload: this.$t("state.connected_to", { name: this.url }),
              source: "info",
              color: "var(--accent-color)",
              ts: new Date().toLocaleTimeString(),
            },
          ]
          this.$toast.success(this.$t("state.connected"))
        })
        this.io.on("*", ({ data }) => {
          const [eventName, message] = data
          addSIOLogLine({
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
          addSIOLogLine({
            payload: this.$t("state.disconnected_from", { name: this.url }),
            source: "info",
            color: "#ff5555",
            ts: new Date().toLocaleTimeString(),
          })
          this.$toast.error(this.$t("state.disconnected"))
        })
      } catch (e) {
        this.handleError(e)
        this.$toast.error(this.$t("error.something_went_wrong"))
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
      addSIOLogLine({
        payload: this.$t("error.something_went_wrong"),
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })
      if (error !== null)
        addSIOLogLine({
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
          addSIOLogLine({
            payload: `[${eventName}] ${JSON.stringify(data)}`,
            source: "server",
            ts: new Date().toLocaleTimeString(),
          })
        })

        addSIOLogLine({
          payload: `[${eventName}] ${JSON.stringify(messages)}`,
          source: "client",
          ts: new Date().toLocaleTimeString(),
        })
        this.communication.inputs = [""]
      }
    },
    onSelectVersion(version) {
      this.clientVersion = version
      this.$refs.versionOptions.tippy().hide()
    },
  },
})
</script>
