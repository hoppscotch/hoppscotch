<template>
  <div class="page">
    <pw-section class="blue" label="Request" ref="request">
      <ul>
        <li>
          <label for="url">URL</label>
          <input id="url" type="url" :class="{ error: !urlValid }" v-model="url" @keyup.enter="urlValid ? toggleConnection() : null">
        </li>
        <li>
          <label for="action" class="hide-on-small-screen">&nbsp;</label>
          <button :disabled="!urlValid" name="action" @click="toggleConnection">
            {{ toggleConnectionVerb }}
            <span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" v-if="!connectionState">
                <path d="M21.921 2.081c2.771 2.772 2.771 7.269 0 10.042l-3.84 3.839-2.121-2.122 3.839-3.84c1.599-1.598 1.599-4.199-.001-5.797-1.598-1.599-4.199-1.599-5.797-.001l-3.84 3.839-2.121-2.121 3.84-3.839c2.771-2.773 7.267-2.773 10.041 0zm-8.082 13.879l-3.84 3.839c-1.598 1.6-4.199 1.599-5.799 0-1.598-1.598-1.598-4.2 0-5.797l3.84-3.84-2.121-2.121-3.84 3.84c-2.771 2.772-2.772 7.268 0 10.041 2.773 2.772 7.27 2.773 10.041 0l3.84-3.84-2.121-2.122z"/>
              </svg>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" v-if="connectionState">
                <path d="M14.9 19.143l-2.78 2.779c-2.771 2.772-7.268 2.772-10.041 0-2.772-2.773-2.771-7.269 0-10.041l2.779-2.779 2.121 2.121-2.779 2.779c-1.598 1.598-1.598 4.2 0 5.797 1.6 1.6 4.201 1.6 5.799 0l2.779-2.777 2.122 2.121zm-3.02-17.063l-2.779 2.779 2.121 2.121 2.78-2.779c1.598-1.598 4.199-1.598 5.795.001 1.602 1.598 1.602 4.199.004 5.797l-2.779 2.779 2.121 2.121 2.779-2.778c2.771-2.773 2.771-7.269 0-10.041-2.774-2.772-7.27-2.772-10.042 0zm-5.945-.795l1.44-.204.438 3.083-1.438.205-.44-3.084zm-4.855 6.09l.206-1.441 3.084.44-.206 1.44-3.084-.439zm4.793-2.521l-1.028 1.03-2.205-2.203 1.029-1.029 2.204 2.202zm12.191 17.86l-1.441.204-.438-3.083 1.439-.205.44 3.084zm4.856-6.09l-.207 1.441-3.084-.439.207-1.441 3.084.439zm-4.793 2.52l1.027-1.029 2.205 2.204-1.029 1.029-2.203-2.204z"/>
              </svg>
            </span>
          </button>
        </li>
      </ul>
    </pw-section>
    <pw-section class="purple" label="Communication" id="response" ref="response">
      <ul>
        <li>
          <label for="log">Log</label>
          <div id="log" name="log" class="log">
            <span v-if="communication.log">
              <span v-for="logEntry in communication.log" :style="{ color: logEntry.color }">@ {{ logEntry.ts }} {{ getSourcePrefix(logEntry.source) }} {{ logEntry.payload }}</span>
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
        <li>
          <label for="send" class="hide-on-small-screen">&nbsp;</label>
          <button name="send" :disabled="!connectionState" @click="sendMessage">
            Send
            <span>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <path d="M0 12l11 3.1 7-8.1-8.156 5.672-4.312-1.202 15.362-7.68-3.974 14.57-3.75-3.339-2.17 2.925v-.769l-2-.56v7.383l4.473-6.031 4.527 4.031 6-22z" />
              </svg>
            </span>
          </button>
        </li>
      </ul>
    </pw-section>
  </div>
</template>
<style lang="scss">
  div.log {
    margin: 4px;
    padding: 8px 16px;
    width: calc(100% - 8px);
    border-radius: 4px;
    background-color: var(--bg-dark-color);
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
