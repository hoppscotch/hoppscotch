<template>
  <div class="page">

    <fieldset class="request" ref="request">
      <legend v-on:click="collapse">Request ↕</legend>
      <div class="collapsible">
        <ul>
          <li>
            <label for="url">URL</label>
            <input type="url" :class="{ error: !urlValid }" v-model="url" @keyup.enter="toggleConnection">
          </li>
          <li class="no-grow">
            <label for="action">&nbsp;</label>
            <button class="action" :class="{ disabled: !urlValid }" name="action" @click="toggleConnection">{{ toggleConnectionVerb }}</button>
          </li>
        </ul>
      </div>
    </fieldset>

    <fieldset class="response" id="response" ref="response">
      <legend v-on:click="collapse">Communication ↕</legend>
      <div class="collapsible">
        <ul>
          <li>
            <label for="body">Log</label>
            <div name="body" class="body" readonly>
              <span v-if="communication.log">
                <span v-for="logEntry in communication.log" :style="{ color: logEntry.color }">{{ getSourcePrefix(logEntry.source) }} {{ logEntry.payload }}</span>
              </span>
              <span v-else>(Waiting for connection...)</span>
            </div>
          </li>
        </ul>

        <ul>
          <li>
            <label for="status">Message</label>
            <input name="status" type="text" v-model="communication.input" :readonly="!connectionState" @keyup.enter="sendMessage">
          </li>

          <li class="no-grow">
            <label for="send">&nbsp;</label>
            <button class="action" name="send" :class="{ disabled: !connectionState }" @click="sendMessage">Send</button>
          </li>
        </ul>
      </div>
    </fieldset>
  </div>
</template>

<style lang="scss">
  .no-grow { flex-grow: 0; }
  .action {
    padding-left: 30px;
    padding-right: 30px;
    width: 150px;
  }

  div.body {
    margin: 4px;
    padding: 8px 16px;
    width: calc(100% - 8px);
    border-radius: 4px;
    background-color: #000;
    color: var(--fg-color);
    height: 300px;
    overflow: auto;

    &, span {
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
  export default {

      data () {
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
        toggleConnectionVerb () {
            return !this.connectionState ? "Connect" : "Disconnect";
        },

        urlValid () {
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
        toggleConnection () {
          // If it is connecting:
          if(!this.connectionState) return this.connect();

          // Otherwise, it's disconnecting.
          else return this.disconnect();
        },

        connect () {
          this.communication.log = [
            {
              payload: `Connecting to ${this.url}...`,
              source: 'info',
              color: 'lime'
            }
          ];

          try {
              this.socket = new WebSocket(this.url);

              this.socket.onopen = (event) => {
                  this.connectionState = true;

                  this.communication.log = [
                      {
                          payload: `Connected to ${this.url}.`,
                          source: 'info',
                          color: 'lime'
                      }
                  ];
              };

              this.socket.onerror = (event) => {
                  this.handleError();
              };

              this.socket.onclose = (event) => {
                  this.connectionState = false;

                  this.communication.log.push({
                      payload: `Disconnected from ${this.url}.`,
                      source: 'info',
                      color: 'red'
                  });
              };

              this.socket.onmessage = (event) => {
                  this.communication.log.push({
                      payload: event.data,
                      source: 'server'
                  });
              }
          }catch(ex){
              this.handleError(ex);
          }
        },

        disconnect () {
          if(this.socket != null) this.socket.close();
        },

        handleError (error) {
            this.disconnect();
            this.connectionState = false;

            this.communication.log.push({
                payload: `An error has occurred.`,
                source: 'info',
                color: 'red'
            });
            if(error != null) this.communication.log.push({
                payload: error,
                source: 'info',
                color: 'red'
            });
        },

        sendMessage () {
          const message = this.communication.input;

          this.socket.send(message);
          this.communication.log.push({
              payload: message,
              source: 'client'
          });

          this.communication.input = "";
        },

        collapse({target}) {
          const el = target.parentNode.className;
          document.getElementsByClassName(el)[0].classList.toggle('hidden');
        },

        getSourcePrefix(source){
          const sourceEmojis = {
            // Source used for info messages.
            'info': 'ℹ️ [INFO]:\t',
            // Source used for client to server messages.
            'client': '👽 [SENT]:\t',
            // Source used for server to client messages.
            'server': '📥 [RECEIVED]:\t'
          };

          if (Object.keys(sourceEmojis).includes(source)) return sourceEmojis[source];
          return '';
        }
      }

  }
</script>
