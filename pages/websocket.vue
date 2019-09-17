<template>
  <div class="page">
    <pw-section class="blue" label="Request" ref="request">
      <ul>
        <li>
          <label for="url">URL</label>
          <input id="url" type="url" :class="{ error: !urlValid }" v-model="url" @keyup.enter="urlValid ? toggleConnection() : null">
        </li>
        <div>
          <li>
            <label for="connect" class="hide-on-small-screen">&nbsp;</label>
            <button :disabled="!urlValid" id="connect" name="connect" @click="toggleConnection">
              {{ toggleConnectionVerb }}
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" v-if="connectionState">
                  <path d="M16 0l-3 9h9l-1.866 2h-14.4l10.266-11zm2.267 13h-14.4l-1.867 2h9l-3 9 10.267-11z"/>
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" v-if="!connectionState">
                  <path d="M8 24l3-9h-9l14-15-3 9h9l-14 15z"/>
                </svg>
              </span>
            </button>
          </li>
        </div>
      </ul>
    </pw-section>
    <pw-section class="purple" label="Communication" id="response" ref="response">
      <ul>
        <li>
          <label for="log">Log</label>
          <div id="log" name="log" class="log">
            <span v-if="communication.log">
              <span v-for="(logEntry, index) in communication.log" :style="{ color: logEntry.color }" :key="index">@ {{ logEntry.ts }} {{ getSourcePrefix(logEntry.source) }} {{ logEntry.payload }}</span>
            </span>
            <span v-else>(Waiting for connection...)</span>
          </div>
        </li>
      </ul>
      <ul>
        <li>
          <label for="message">Message</label>
          <input id="message" name="message" type="text" v-model="communication.input" :readonly="!connectionState" @keyup.enter="connectionState ? sendMessage() : null">
        </li>
        <div>
          <li>
            <label for="send" class="hide-on-small-screen">&nbsp;</label>
            <button id="send" name="send" :disabled="!connectionState" @click="sendMessage">
              Send
              <span>
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24">
                  <path d="M24 0l-6 22-8.129-7.239 7.802-8.234-10.458 7.227-7.215-1.754 24-12zm-15 16.668v7.332l3.258-4.431-3.258-2.901z"/>
                </svg>
              </span>
            </button>
          </li>
        </div>
      </ul>
    </pw-section>
  </div>
</template>
<style lang="scss">
  div.log {
    margin: 4px;
    padding: 8px 16px;
    width: calc(100% - 8px);
    border-radius: 8px;
    background-color: var(--brd-color);
    color: var(--fg-color);
    height: 256px;
    overflow: auto;

    &,
    span {
      font-weight: 700;
      font-size: 18px;
      font-family: monospace;
    }

    span {
      display: block;
      white-space: pre-wrap;
    }
  }

</style>
<script>
  import section from "../components/section";
  export default {
    components: {
      'pw-section': section
    },
    data() {
      return {
        connectionState: false,
        url: "wss://echo.websocket.org",
        socket: null,
        communication: {
          log: null,
          input: ""
        }
      }
    },
    computed: {
      toggleConnectionVerb() {
        return !this.connectionState ? "Connect" : "Disconnect";
      },
      urlValid() {
        const pattern = new RegExp('^(wss?:\\/\\/)?' +
          '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' +
          '((\\d{1,3}\\.){3}\\d{1,3}))' +
          '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' +
          '(\\?[;&a-z\\d%_.~+=-]*)?' +
          '(\\#[-a-z\\d_]*)?$', 'i');
        return pattern.test(this.url);
      }
    },
    methods: {
      toggleConnection() {
        // If it is connecting:
        if (!this.connectionState) return this.connect();
        // Otherwise, it's disconnecting.
        else return this.disconnect();
      },
      connect() {
        this.communication.log = [{
          payload: `Connecting to ${this.url}...`,
          source: 'info',
          color: 'var(--ac-color)'
        }];
        try {
          this.socket = new WebSocket(this.url);
          this.socket.onopen = (event) => {
            this.connectionState = true;
            this.communication.log = [{
              payload: `Connected to ${this.url}.`,
              source: 'info',
              color: 'var(--ac-color)',
              ts: (new Date()).toLocaleTimeString()
            }];
          };
          this.socket.onerror = (event) => {
            this.handleError();
          };
          this.socket.onclose = (event) => {
            this.connectionState = false;
            this.communication.log.push({
              payload: `Disconnected from ${this.url}.`,
              source: 'info',
              color: '#ff5555',
              ts: (new Date()).toLocaleTimeString()
            });
          };
          this.socket.onmessage = (event) => {
            this.communication.log.push({
              payload: event.data,
              source: 'server',
              ts: (new Date()).toLocaleTimeString()
            });
          }
        } catch (ex) {
          this.handleError(ex);
        }
      },
      disconnect() {
        if (this.socket != null) this.socket.close();
      },
      handleError(error) {
        this.disconnect();
        this.connectionState = false;
        this.communication.log.push({
          payload: `An error has occurred.`,
          source: 'info',
          color: '#ff5555',
          ts: (new Date()).toLocaleTimeString()
        });
        if (error != null) this.communication.log.push({
          payload: error,
          source: 'info',
          color: '#ff5555',
          ts: (new Date()).toLocaleTimeString()
        });
      },
      sendMessage() {
        const message = this.communication.input;
        this.socket.send(message);
        this.communication.log.push({
          payload: message,
          source: 'client',
          ts: (new Date()).toLocaleTimeString()
        });
        this.communication.input = "";
      },
      collapse({
        target
      }) {
        const el = target.parentNode.className;
        document.getElementsByClassName(el)[0].classList.toggle('hidden');
      },
      getSourcePrefix(source) {
        const sourceEmojis = {
          // Source used for info messages.
          'info': '\tℹ️ [INFO]:\t',
          // Source used for client to server messages.
          'client': '\t👽 [SENT]:\t',
          // Source used for server to client messages.
          'server': '\t📥 [RECEIVED]:\t'
        };
        if (Object.keys(sourceEmojis).includes(source)) return sourceEmojis[source];
        return '';
      }
    },
    updated: function () {
      this.$nextTick(function () {
        var divLog = document.getElementById("log")
        divLog.scrollBy(0, divLog.scrollHeight + 100)
      })
    }
  }

</script>
