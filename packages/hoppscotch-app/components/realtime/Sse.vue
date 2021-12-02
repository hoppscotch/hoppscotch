<template>
  <Splitpanes class="smart-splitter" :horizontal="COLUMN_LAYOUT">
    <Pane :size="COLUMN_LAYOUT ? 45 : 50" class="hide-scrollbar !overflow-auto">
      <div class="bg-primary flex p-4 top-0 z-10 sticky">
        <div class="space-x-2 flex-1 inline-flex">
          <div class="flex flex-1">
            <input
              id="server"
              v-model="server"
              type="url"
              autocomplete="off"
              :class="{ error: !serverValid }"
              class="bg-primaryLight border border-divider rounded-l flex flex-1 text-secondaryDark w-full py-2 px-4 hover:border-dividerDark focus-visible:bg-transparent focus-visible:border-dividerDark"
              :placeholder="$t('sse.url')"
              :disabled="connectionSSEState"
              @keyup.enter="serverValid ? toggleSSEConnection() : null"
            />
            <label
              for="event-type"
              class="bg-primaryLight border-t border-b border-divider font-semibold text-secondaryLight py-2 px-4 truncate"
            >
              {{ $t("sse.event_type") }}
            </label>
            <input
              id="event-type"
              v-model="eventType"
              class="bg-primaryLight border border-divider rounded-r flex flex-1 text-secondaryDark w-full py-2 px-4 hover:border-dividerDark focus-visible:bg-transparent focus-visible:border-dividerDark"
              spellcheck="false"
              :disabled="connectionSSEState"
              @keyup.enter="serverValid ? toggleSSEConnection() : null"
            />
          </div>
          <ButtonPrimary
            id="start"
            :disabled="!serverValid"
            name="start"
            class="w-32"
            :label="
              !connectionSSEState ? $t('action.start') : $t('action.stop')
            "
            :loading="connectingState"
            @click.native="toggleSSEConnection"
          />
        </div>
      </div>
    </Pane>
    <Pane :size="COLUMN_LAYOUT ? 65 : 50" class="hide-scrollbar !overflow-auto">
      <AppSection label="response">
        <ul>
          <li>
            <RealtimeLog :title="$t('sse.log')" :log="log" />
            <div id="result"></div>
          </li>
        </ul>
      </AppSection>
    </Pane>
  </Splitpanes>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"
import debounce from "lodash/debounce"
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"
import { useSetting } from "~/newstore/settings"
import {
  SSEEndpoint$,
  setSSEEndpoint,
  SSEEventType$,
  setSSEEventType,
  SSESocket$,
  setSSESocket,
  SSEConnectingState$,
  SSEConnectionState$,
  setSSEConnectionState,
  setSSEConnectingState,
  SSELog$,
  setSSELog,
  addSSELogLine,
} from "~/newstore/SSESession"
import { useStream } from "~/helpers/utils/composables"

export default defineComponent({
  components: { Splitpanes, Pane },
  setup() {
    return {
      COLUMN_LAYOUT: useSetting("COLUMN_LAYOUT"),
      connectionSSEState: useStream(
        SSEConnectionState$,
        false,
        setSSEConnectionState
      ),
      connectingState: useStream(
        SSEConnectingState$,
        false,
        setSSEConnectingState
      ),
      server: useStream(SSEEndpoint$, "", setSSEEndpoint),
      eventType: useStream(SSEEventType$, "", setSSEEventType),
      sse: useStream(SSESocket$, null, setSSESocket),
      log: useStream(SSELog$, [], setSSELog),
    }
  },
  data() {
    return {
      isUrlValid: true,
    }
  },
  computed: {
    serverValid() {
      return this.isUrlValid
    },
  },
  watch: {
    server() {
      this.debouncer()
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
      this.worker.postMessage({ type: "sse", url: this.server })
    }, 1000),
    workerResponseHandler({ data }) {
      if (data.url === this.url) this.isUrlValid = data.result
    },
    toggleSSEConnection() {
      // If it is connecting:
      if (!this.connectionSSEState) return this.start()
      // Otherwise, it's disconnecting.
      else return this.stop()
    },
    start() {
      this.connectingState = true
      this.log = [
        {
          payload: this.$t("state.connecting_to", { name: this.server }),
          source: "info",
          color: "var(--accent-color)",
        },
      ]
      if (typeof EventSource !== "undefined") {
        try {
          this.sse = new EventSource(this.server)
          this.sse.onopen = () => {
            this.connectingState = false
            this.connectionSSEState = true
            this.log = [
              {
                payload: this.$t("state.connected_to", { name: this.server }),
                source: "info",
                color: "var(--accent-color)",
                ts: new Date().toLocaleTimeString(),
              },
            ]
            this.$toast.success(this.$t("state.connected"))
          }
          this.sse.onerror = () => {
            this.handleSSEError()
          }
          this.sse.onclose = () => {
            this.connectionSSEState = false
            addSSELogLine({
              payload: this.$t("state.disconnected_from", {
                name: this.server,
              }),
              source: "info",
              color: "#ff5555",
              ts: new Date().toLocaleTimeString(),
            })
            this.$toast.error(this.$t("state.disconnected"))
          }
          this.sse.addEventListener(this.eventType, ({ data }) => {
            addSSELogLine({
              payload: data,
              source: "server",
              ts: new Date().toLocaleTimeString(),
            })
          })
        } catch (e) {
          this.handleSSEError(e)
          this.$toast.error(this.$t("error.something_went_wrong"))
        }
      } else {
        this.log = [
          {
            payload: this.$t("error.browser_support_sse"),
            source: "info",
            color: "#ff5555",
            ts: new Date().toLocaleTimeString(),
          },
        ]
      }

      logHoppRequestRunToAnalytics({
        platform: "sse",
      })
    },
    handleSSEError(error) {
      this.stop()
      this.connectionSSEState = false
      addSSELogLine({
        payload: this.$t("error.something_went_wrong"),
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })
      if (error !== null)
        addSSELogLine({
          payload: error,
          source: "info",
          color: "#ff5555",
          ts: new Date().toLocaleTimeString(),
        })
    },
    stop() {
      this.sse.close()
      this.sse.onclose()
    },
  },
})
</script>
