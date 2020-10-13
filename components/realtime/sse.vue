<template>
  <div class="page">
    <pw-section class="blue" :label="$t('request')" ref="request">
      <ul>
        <li>
          <label for="server">{{ $t("server") }}</label>
          <input
            id="server"
            type="url"
            :class="{ error: !serverValid }"
            v-model="server"
            @keyup.enter="serverValid ? toggleSSEConnection() : null"
          />
        </li>
        <div>
          <li>
            <label for="start" class="hide-on-small-screen">&nbsp;</label>
            <button :disabled="!serverValid" id="start" name="start" @click="toggleSSEConnection">
              {{ !isConnected ? $t("start") : $t("stop") }}
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
          <log :title="$t('events')" :log="log" />
          <div id="result"></div>
        </li>
      </ul>
    </pw-section>
  </div>
</template>

<script>
import { httpValid } from "~/helpers/utils/valid"

export default {
  computed: {
    serverValid() {
      return httpValid(this.server)
    },
    server: {
      get() {
        return this.$store.state.eventSource.server
      },
      set(value) {
        this.$store.commit("setEventSourceState", { value, attribute: "server" })
      },
    },
    sse: {
      get() {
        return this.$store.state.eventSource.sse
      },
      set(value) {
        this.$store.commit("setEventSourceState", { value, attribute: "sse" })
      },
    },
    isConnected() {
      return this.sse instanceof EventSource
    },
    log: {
      get() {
        return this.$store.state.eventSource.log
      },
      set(value) {
        this.$store.commit("setEventSourceState", { value, attribute: "log" })
      },
    },
  },
  methods: {
    toggleSSEConnection() {
      // If it is connecting:
      if (!this.isConnected) return this.start()
      // Otherwise, it's disconnecting.
      else return this.stop()
    },
    addToLog(obj) {
      this.$store.commit("addEventSourceLog", obj)
    },
    start() {
      this.log = [
        {
          payload: this.$t("connecting_to", { name: this.server }),
          source: "info",
          color: "var(--ac-color)",
        },
      ]
      if (typeof EventSource !== "undefined") {
        try {
          this.sse = new EventSource(this.server)
          this.sse.onopen = (event) => {
            this.log = [
              {
                payload: this.$t("connected_to", { name: this.server }),
                source: "info",
                color: "var(--ac-color)",
                ts: new Date().toLocaleTimeString(),
              },
            ]
            this.$toast.success(this.$t("connected"), {
              icon: "sync",
            })
          }
          this.sse.onerror = (event) => {
            this.handleSSEError()
          }
          this.sse.onclose = (event) => {
            this.addToLog({
              payload: this.$t("disconnected_from", { name: this.server }),
              source: "info",
              color: "#ff5555",
              ts: new Date().toLocaleTimeString(),
            })
            this.$toast.error(this.$t("disconnected"), {
              icon: "sync_disabled",
            })
          }
          ;(this.sse.onmessage = ({ data }) => {
            this.addToLog({
              payload: data,
              source: "server",
              ts: new Date().toLocaleTimeString(),
            })
          }),
            // needed because the default event source sends out "data" for its EventStream type, instead of standard "message"
            // so we need to add custom event listener
            this.sse.addEventListener("data", ({ data }) => {
              this.addToLog({
                payload: data,
                source: "server",
                ts: new Date().toLocaleTimeString(),
              })
            })
        } catch (ex) {
          this.handleSSEError(ex)
          this.$toast.error(this.$t("something_went_wrong"), {
            icon: "error",
          })
        }
      } else {
        this.log = [
          {
            payload: this.$t("browser_support_sse"),
            source: "info",
            color: "#ff5555",
            ts: new Date().toLocaleTimeString(),
          },
        ]
      }
    },
    handleSSEError(error) {
      this.stop()
      this.addToLog({
        payload: this.$t("error_occurred"),
        source: "info",
        color: "#ff5555",
        ts: new Date().toLocaleTimeString(),
      })
      if (error)
        this.addToLog({
          payload: error,
          source: "info",
          color: "#ff5555",
          ts: new Date().toLocaleTimeString(),
        })
    },
    stop() {
      this.sse.onclose()
      this.sse.close()
      this.sse = null
    },
  },
}
</script>
