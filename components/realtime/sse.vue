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
    </pw-section>

    <pw-section class="purple" :label="$t('communication')" id="response" ref="response">
      <ul>
        <li>
          <realtime-log :title="$t('events')" :log="events.log" />
          <div id="result"></div>
        </li>
      </ul>
    </pw-section>
  </div>
</template>

<script>
import { httpValid } from "~/helpers/utils/valid"

export default {
  components: {
    "pw-section": () => import("../layout/section"),
    realtimeLog: () => import("./log"),
  },
  data() {
    return {
      connectionSSEState: false,
      server: "https://express-eventsource.herokuapp.com/events",
      sse: null,
      events: {
        log: null,
        input: "",
      },
    }
  },
  computed: {
    serverValid() {
      return httpValid(this.server)
    },
  },
  methods: {
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
          color: "var(--ac-color)",
        },
      ]
      if (typeof EventSource !== "undefined") {
        try {
          this.sse = new EventSource(this.server)
          this.sse.onopen = (event) => {
            this.connectionSSEState = true
            this.events.log = [
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
