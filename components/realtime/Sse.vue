<template>
  <div>
    <AppSection label="request">
      <ul>
        <li>
          <label for="server">{{ $t("server") }}</label>
          <input
            id="server"
            v-model="server"
            type="url"
            :class="{ error: !serverValid }"
            class="input md:rounded-bl-lg"
            :placeholder="$t('url')"
            @keyup.enter="serverValid ? toggleSSEConnection() : null"
          />
        </li>
        <div>
          <li>
            <label for="start" class="hide-on-small-screen">&nbsp;</label>
            <button
              id="start"
              :disabled="!serverValid"
              name="start"
              class="button rounded-b-lg md:rounded-bl-none md:rounded-br-lg"
              @click="toggleSSEConnection"
            >
              {{ !connectionSSEState ? $t("start") : $t("stop") }}
              <span>
                <i class="material-icons">
                  {{ !connectionSSEState ? "sync" : "sync_disabled" }}
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
          <RealtimeLog :title="$t('events')" :log="events.log" />
          <div id="result"></div>
        </li>
      </ul>
    </AppSection>
  </div>
</template>

<script>
import { logHoppRequestRunToAnalytics } from "~/helpers/fb/analytics"
import debounce from "~/helpers/utils/debounce"

export default {
  data() {
    return {
      connectionSSEState: false,
      server: "https://express-eventsource.herokuapp.com/events",
      isUrlValid: true,
      sse: null,
      events: {
        log: null,
        input: "",
      },
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
      this.events.log = [
        {
          payload: this.$t("connecting_to", { name: this.server }),
          source: "info",
          color: "var(--accent-color)",
        },
      ]
      if (typeof EventSource !== "undefined") {
        try {
          this.sse = new EventSource(this.server)
          this.sse.onopen = () => {
            this.connectionSSEState = true
            this.events.log = [
              {
                payload: this.$t("connected_to", { name: this.server }),
                source: "info",
                color: "var(--accent-color)",
                ts: new Date().toLocaleTimeString(),
              },
            ]
            this.$toast.success(this.$t("connected"), {
              icon: "sync",
            })
          }
          this.sse.onerror = () => {
            this.handleSSEError()
          }
          this.sse.onclose = () => {
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
          this.sse.onmessage = ({ data }) => {
            this.events.log.push({
              payload: data,
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

      logHoppRequestRunToAnalytics({
        platform: "mqtt",
      })
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
