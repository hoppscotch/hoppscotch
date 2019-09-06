<template>
  <div class="page">
    <pw-section class="blue" label="Request" ref="request">
      <button id="show-modal" @click="showModal = true">IMPORT</button>
      <import-modal v-if="showModal" @close="showModal = false">
        <div slot="header">
          <h2>IMPORT CURL</h2>
        </div>
        <div slot="body">
          <textarea id="import-text" style="height:20rem">
          </textarea>
        </div>
        <div slot="footer">
          <button class="modal-default-button" @click="handleImport">OK</button>
        </div>
      </import-modal>
      <ul>
        <li>
          <label for="method">Method</label>
          <select id="method" v-model="method">
            <option>GET</option>
            <option>HEAD</option>
            <option>POST</option>
            <option>PUT</option>
            <option>DELETE</option>
            <option>OPTIONS</option>
            <option>PATCH</option>
          </select>
        </li>
        <li>
          <label for="url">URL</label>
          <input :class="{ error: !isValidURL }" @keyup.enter="isValidURL ? sendRequest() : null" id="url" type="url" v-model="url">
        </li>
        <li>
          <label for="path">Path</label>
          <input @keyup.enter="isValidURL ? sendRequest() : null" id="path" v-model="path">
        </li>
        <li>
          <label class="hide-on-small-screen" for="action">&nbsp;</label>
          <button :disabled="!isValidURL" @click="sendRequest" class="show" id="action" name="action" ref="sendButton">
            Send <span id="hidden-message">Again</span>
          </button>
        </li>
      </ul>
    </pw-section>
    <pw-section class="blue-dark" label="Request Body" v-if="method === 'POST' || method === 'PUT' || method === 'PATCH'">
      <ul>
        <li>
          <autocomplete :source="validContentTypes" :spellcheck="false" v-model="contentType">Content Type
          </autocomplete>
          <span>
            <pw-toggle :on="rawInput" @change="rawInput = !rawInput">
              Raw input {{ rawInput ? "enabled" : "disabled" }}
            </pw-toggle>
          </span>
        </li>
      </ul>
      <div v-if="!rawInput">
        <ol v-for="(param, index) in bodyParams">
          <li>
            <label :for="'bparam'+index">Key {{index + 1}}</label>
            <input :name="'bparam'+index" v-model="param.key">
          </li>
          <li>
            <label :for="'bvalue'+index">Value {{index + 1}}</label>
            <input :name="'bvalue'+index" v-model="param.value">
          </li>
          <li>
            <label class="hide-on-small-screen" for="request">&nbsp;</label>
            <button @click="removeRequestBodyParam(index)" name="request">Remove</button>
          </li>
        </ol>
        <ul>
          <li>
            <label for="addrequest">Action</label>
            <button @click="addRequestBodyParam" name="addrequest">Add</button>
          </li>
        </ul>
        <ul>
          <li>
            <label for="request">Parameter List</label>
            <textarea name="request" readonly rows="1" v-textarea-auto-height="rawRequestBody">{{rawRequestBody || '(add at least one parameter)'}}</textarea>
          </li>
        </ul>
      </div>
      <div v-else>
        <textarea @keydown="formatRawParams" rows="16" style="font-family: monospace;" v-model="rawParams" v-textarea-auto-height="rawParams"></textarea>
      </div>
    </pw-section>
    <pw-section class="purple" id="response" label="Response" ref="response">
      <ul>
        <li>
          <label for="status">status</label>
          <input :class="statusCategory ? statusCategory.className : ''" :value="response.status || '(waiting to send request)'" name="status" readonly type="text">
        </li>
      </ul>
      <ul v-for="(value, key) in response.headers">
        <li>
          <label for="value">{{key}}</label>
          <input :value="value" name="value" readonly>
        </li>
      </ul>
      <ul v-if="response.body">
        <li>
          <div class="flex-wrap">
            <label for="body">response</label>
            <div>
              <button class="block" @click="copyRequest" name="copyRequest" v-if="isValidURL">Copy Request URL</button>
              <button @click="copyResponse" name="copyResponse" v-if="response.body">Copy Response</button>
            </div>
          </div>
          <div id="response-details-wrapper">
            <textarea id="response-details" name="body" readonly rows="16">{{response.body || '(waiting to send request)'}}</textarea>
            <iframe :class="{hidden: !previewEnabled}" class="covers-response" ref="previewFrame" src="about:blank"></iframe>
          </div>
          <div class="align-right" v-if="response.body && responseType === 'text/html'">
            <button @click.prevent="togglePreview">{{ previewEnabled ? 'Hide Preview' : 'Preview HTML' }}</button>
          </div>
        </li>
      </ul>
    </pw-section>
    <pw-section class="green" collapsed label="Authentication">
      <ul>
        <li>
          <label for="auth">Authentication Type</label>
          <select v-model="auth">
            <option>None</option>
            <option>Basic</option>
            <option>Bearer Token</option>
          </select>
        </li>
      </ul>
      <ul v-if="auth === 'Basic'">
        <li>
          <label for="http_basic_user">User</label>
          <input v-model="httpUser">
        </li>
        <li>
          <label for="http_basic_passwd">Password</label>
          <input type="password" v-model="httpPassword">
        </li>
      </ul>
      <ul v-if="auth === 'Bearer Token'">
        <li>
          <label for="bearer_token">Token</label>
          <input v-model="bearerToken">
        </li>
      </ul>
    </pw-section>
    <pw-section class="orange" collapsed label="Headers">
      <ol v-for="(header, index) in headers">
        <li>
          <label :for="'header'+index">Key {{index + 1}}</label>
          <input :name="'header'+index" v-model="header.key">
        </li>
        <li>
          <label :for="'value'+index">Value {{index + 1}}</label>
          <input :name="'value'+index" v-model="header.value">
        </li>
        <li>
          <label class="hide-on-small-screen" for="header">&nbsp;</label>
          <button @click="removeRequestHeader(index)" name="header">Remove</button>
        </li>
      </ol>
      <ul>
        <li>
          <label for="add">Action</label>
          <button @click="addRequestHeader" name="add">Add</button>
        </li>
      </ul>
      <ul>
        <li>
          <label for="request">Header List</label>
          <textarea name="request" readonly ref="requestTextarea" rows="1" v-textarea-auto-height="headerString">{{headerString || '(add at least one header)'}}</textarea>
        </li>
      </ul>
    </pw-section>
    <pw-section class="cyan" collapsed label="Parameters">
      <ol v-for="(param, index) in params">
        <li>
          <label :for="'param'+index">Key {{index + 1}}</label>
          <input :name="'param'+index" v-model="param.key">
        </li>
        <li>
          <label :for="'value'+index">Value {{index + 1}}</label>
          <input :name="'value'+index" v-model="param.value">
        </li>
        <li>
          <label class="hide-on-small-screen" for="param">&nbsp;</label>
          <button @click="removeRequestParam(index)" name="param">Remove</button>
        </li>
      </ol>
      <ul>
        <li>
          <label for="add">Action</label>
          <button @click="addRequestParam" name="add">Add</button>
        </li>
      </ul>
      <ul>
        <li>
          <label for="request">Parameter List</label>
          <textarea name="request" readonly rows="1" v-textarea-auto-height="queryString">{{queryString || '(add at least one parameter)'}}</textarea>
        </li>
      </ul>
    </pw-section>
    <history @useHistory="handleUseHistory" ref="historyComponent" />
  </div>
</template>
<script>
  import autocomplete from '../components/autocomplete';
  import history from "../components/history";
  import section from "../components/section";
  import textareaAutoHeight from "../directives/textareaAutoHeight";
  import toggle from "../components/toggle";
  import import_modal from "../components/modal";
  import parseCurlCommand from '../assets/js/curlparser.js';

  const statusCategories = [{
      name: 'informational',
      statusCodeRegex: new RegExp(/[1][0-9]+/),
      className: 'info-response'
    },
    {
      name: 'successful',
      statusCodeRegex: new RegExp(/[2][0-9]+/),
      className: 'success-response'
    },
    {
      name: 'redirection',
      statusCodeRegex: new RegExp(/[3][0-9]+/),
      className: 'redir-response'
    },
    {
      name: 'client error',
      statusCodeRegex: new RegExp(/[4][0-9]+/),
      className: 'cl-error-response'
    },
    {
      name: 'server error',
      statusCodeRegex: new RegExp(/[5][0-9]+/),
      className: 'sv-error-response'
    },
    {
      // this object is a catch-all for when no other objects match and should always be last
      name: 'unknown',
      statusCodeRegex: new RegExp(/.*/),
      className: 'missing-data-response'
    }
  ];
  const parseHeaders = xhr => {
    const headers = xhr.getAllResponseHeaders().trim().split(/[\r\n]+/);
    const headerMap = {};
    headers.forEach(line => {
      const parts = line.split(': ');
      const header = parts.shift().toLowerCase();
      const value = parts.join(': ');
      headerMap[header] = value
    });
    return headerMap

  };
  export const findStatusGroup = responseStatus => statusCategories.find(status => status.statusCodeRegex.test(responseStatus));

  export default {
    directives: {
      textareaAutoHeight
    },

    components: {
      'pw-section': section,
      'pw-toggle': toggle,
      'import-modal': import_modal,
      history,
      autocomplete,
    },
    data() {
      return {
        showModal: false,
        method: 'GET',
        url: 'https://reqres.in',
        auth: 'None',
        path: '/api/users',
        httpUser: '',
        httpPassword: '',
        bearerToken: '',
        headers: [],
        params: [],
        bodyParams: [],
        rawParams: '',
        rawInput: false,
        contentType: 'application/json',
        response: {
          status: '',
          headers: '',
          body: ''
        },
        previewEnabled: false,

        /**
         * These are content types that can be automatically
         * serialized by postwoman.
         */
        knownContentTypes: [
          'application/json',
          'application/x-www-form-urlencoded'
        ],

        /**
         * These are a list of Content Types known to Postwoman.
         */
        validContentTypes: [
          'application/json',
          'application/hal+json',
          'application/xml',
          'application/x-www-form-urlencoded',
          'text/html',
          'text/plain'
        ]
      }
    },
    watch: {
      contentType(val) {
        this.rawInput = !this.knownContentTypes.includes(val);
      }
    },
    computed: {
      statusCategory() {
        return findStatusGroup(this.response.status);
      },
      isValidURL() {
        const protocol = '^(https?:\\/\\/)?';
        const validIP = new RegExp(protocol + "(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$");
        const validHostname = new RegExp(protocol + "(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$");
        return validIP.test(this.url) || validHostname.test(this.url);
      },
      hasRequestBody() {
        return ['POST', 'PUT', 'PATCH'].includes(this.method);
      },
      rawRequestBody() {
        const {
          bodyParams
        } = this
        if (this.contentType === 'application/json') {
          try {
            const obj = JSON.parse(`{${bodyParams.filter(({key}) => !!key).map(({key, value}) => `
              "${key}": "${value}"
              `).join()}}`)
            return JSON.stringify(obj)
          } catch (ex) {
            return 'invalid'
          }
        } else {
          return bodyParams
            .filter(({
              key
            }) => !!key)
            .map(({
              key,
              value
            }) => `${key}=${encodeURIComponent(value)}`).join('&')
        }
      },
      headerString() {
        const result = this.headers
          .filter(({
            key
          }) => !!key)
          .map(({
            key,
            value
          }) => `${key}: ${value}`).join(',\n')
        return result == '' ? '' : `${result}`
      },
      queryString() {
        const result = this.params
          .filter(({
            key
          }) => !!key)
          .map(({
            key,
            value
          }) => `${key}=${encodeURIComponent(value)}`).join('&')
        return result === '' ? '' : `?${result}`
      },
      responseType() {
        return (this.response.headers['content-type'] || '').split(';')[0].toLowerCase();
      }
    },
    methods: {
      handleUseHistory({
        method,
        url,
        path
      }) {
        this.method = method;
        this.url = url;
        this.path = path;
        this.$refs.request.$el.scrollIntoView({
          behavior: 'smooth'
        });
      },
      async sendRequest() {
        if (!this.isValidURL) {
          alert('Please check the formatting of the URL.');
          return;
        }

        // Start showing the loading bar as soon as possible.
        // The nuxt axios module will hide it when the request is made.
        this.$nuxt.$loading.start();

        if (this.$refs.response.$el.classList.contains('hidden')) {
          this.$refs.response.$el.classList.toggle('hidden')
        }
        this.$refs.response.$el.scrollIntoView({
          behavior: 'smooth'
        });
        this.previewEnabled = false;
        this.response.status = 'Fetching...';
        this.response.body = 'Loading...';

        const auth = this.auth === 'Basic' ? {
          username: this.httpUser,
          password: this.httpPassword
        } : null;

        let headers = {};

        // If the request has a request body, we want to ensure Content-Length and
        // Content-Type are sent.
        let requestBody;
        if (this.hasRequestBody) {
          requestBody = this.rawInput ? this.rawParams : this.rawRequestBody;

          Object.assign(headers, {
            //'Content-Length': requestBody.length,
            'Content-Type': `${this.contentType}; charset=utf-8`
          });
        }

        // If the request uses a token for auth, we want to make sure it's sent here.
        if (this.auth === 'Bearer Token') headers['Authorization'] = `Bearer ${this.bearerToken}`;

        headers = Object.assign(
          // Clone the app headers object first, we don't want to
          // mutate it with the request headers added by default.
          Object.assign({}, this.headers),

          // We make our temporary headers object the source so
          // that you can override the added headers if you
          // specify them.
          headers
        );

        try {
          const payload = await this.$axios({
            method: this.method,
            url: this.url + this.path + this.queryString,
            auth,
            headers,
            data: requestBody ? requestBody.toString() : null
          });

          (() => {
            const status = this.response.status = payload.status;
            const headers = this.response.headers = payload.headers;

            // We don't need to bother parsing JSON, axios already handles it for us!
            const body = this.response.body = payload.data;

            const date = new Date().toLocaleDateString();
            const time = new Date().toLocaleTimeString();

            // Addition of an entry to the history component.
            const entry = {
              status,
              date,
              time,
              method: this.method,
              url: this.url,
              path: this.path
            };
            this.$refs.historyComponent.addEntry(entry);
          })();
        } catch (error) {
          if (error.response) {
            this.response.headers = error.response.headers;
            this.response.status = error.response.status;
            this.response.body = error.response.data;

            // Addition of an entry to the history component.
            const entry = {
              status: this.response.status,
              date: new Date().toLocaleDateString(),
              time: new Date().toLocaleTimeString(),
              method: this.method,
              url: this.url,
              path: this.path
            };
            this.$refs.historyComponent.addEntry(entry);
            return;
          }

          this.response.status = error.message;
          this.response.body = "See JavaScript console (F12) for details.";
        }
      },

      addRequestHeader() {
        this.headers.push({
          key: '',
          value: ''
        });
        return false
      },
      removeRequestHeader(index) {
        this.headers.splice(index, 1)
      },
      addRequestParam() {
        this.params.push({
          key: '',
          value: ''
        })
        return false
      },
      removeRequestParam(index) {
        this.params.splice(index, 1)
      },
      addRequestBodyParam() {
        this.bodyParams.push({
          key: '',
          value: ''
        })
        return false
      },
      removeRequestBodyParam(index) {
        this.bodyParams.splice(index, 1)
      },
      formatRawParams(event) {
        if ((event.which !== 13 && event.which !== 9)) {
          return;
        }
        const textBody = event.target.value;
        const textBeforeCursor = textBody.substring(0, event.target.selectionStart);
        const textAfterCursor = textBody.substring(event.target.selectionEnd);
        if (event.which === 13) {
          event.preventDefault();
          const oldSelectionStart = event.target.selectionStart;
          const lastLine = textBeforeCursor.split('\n').slice(-1)[0];
          const rightPadding = lastLine.match(/([\s\t]*).*/)[1] || "";
          event.target.value = textBeforeCursor + '\n' + rightPadding + textAfterCursor;
          setTimeout(() => event.target.selectionStart = event.target.selectionEnd = oldSelectionStart + rightPadding.length + 1, 1);
        } else if (event.which === 9) {
          event.preventDefault();
          const oldSelectionStart = event.target.selectionStart;
          event.target.value = textBeforeCursor + '\xa0\xa0' + textAfterCursor;
          event.target.selectionStart = event.target.selectionEnd = oldSelectionStart + 2;
          return false;
        }
      },
      copyRequest() {
        var dummy = document.createElement('input');
        document.body.appendChild(dummy);
        dummy.value = window.location.href;
        dummy.select();
        document.execCommand('copy');
        document.body.removeChild(dummy);
      },
      copyResponse() {
        var copyText = document.getElementById("response-details");
        copyText.select();
        document.execCommand("copy");
      },
      togglePreview() {
        this.previewEnabled = !this.previewEnabled;
        if (this.previewEnabled) {
          // If you want to add 'preview' support for other response types,
          // just add them here.
          if (this.responseType === "text/html") {
            // If the preview already has that URL loaded, let's not bother re-loading it all.
            if (this.$refs.previewFrame.getAttribute('data-previewing-url') === this.url)
              return;
            // Use DOMParser to parse document HTML.
            const previewDocument = new DOMParser().parseFromString(this.response.body, this.responseType);
            // Inject <base href="..."> tag to head, to fix relative CSS/HTML paths.
            previewDocument.head.innerHTML = `<base href="${this.url}">` + previewDocument.head.innerHTML;
            // Finally, set the iframe source to the resulting HTML.
            this.$refs.previewFrame.srcdoc = previewDocument.documentElement.outerHTML;
            this.$refs.previewFrame.setAttribute('data-previewing-url', this.url);
          }
        }
      },
      setRouteQueryState() {
        const flat = key => this[key] !== '' ? `${key}=${this[key]}&` : ''
        const deep = key => {
          const haveItems = [...this[key]].length
          if (haveItems && this[key]['value'] !== '') {
            return `${key}=${JSON.stringify(this[key])}&`
          } else return ''
        }
        let flats = ['method', 'url', 'path', 'auth', 'httpUser', 'httpPassword', 'bearerToken', 'contentType'].map(item => flat(item))
        let deeps = ['headers', 'params', 'bodyParams'].map(item => deep(item))
        this.$router.replace('/?' + flats.concat(deeps).join('').slice(0, -1))
      },
      setRouteQueries(queries) {
        if (typeof(queries) !== 'object') throw new Error('Route query parameters must be a Object')
        for (const key in queries) {
          if (key === 'headers' || key === 'params' || key === 'bodyParams') this[key] = JSON.parse(queries[key])
          else if (typeof(this[key]) === 'string') this[key] = queries[key];
        }
      },
      observeRequestButton() {
        const requestElement = this.$refs.request.$el;
        const sendButtonElement = this.$refs.sendButton;
        const observer = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
            sendButtonElement.classList.toggle('show');
          });
        }, {
          threshold: 1
        });

        observer.observe(requestElement);
      },
      handleImport () {
        console.log("handleimport");
        let textarea = document.getElementById("import-text")
        let text = textarea.value;
        try {
         let parsedCurl = parseCurlCommand(text);
         console.log(parsedCurl); 
         this.url=parsedCurl.url.replace(/\"/g,"").replace(/\'/g,"");
         this.url = this.url[this.url.length -1] == '/' ? this.url.slice(0, -1): this.url;
         this.path = "";
         this.headers
         this.showModal = false;
         this.headers = [];
          for (const key of Object.keys(parsedCurl.headers)) {
              this.headers.push({
                key: key,
                value: parsedCurl.headers[key]
              })
          }
          this.method = parsedCurl.method.toUpperCase();
        } catch (error) {
          this.showModal = false;
        }
      }
    },
    mounted() {
      this.observeRequestButton();
    },
    created() {
      if (Object.keys(this.$route.query).length) this.setRouteQueries(this.$route.query);
      this.$watch(vm => [
        vm.method,
        vm.url,
        vm.auth,
        vm.path,
        vm.httpUser,
        vm.httpPassword,
        vm.bearerToken,
        vm.headers,
        vm.params,
        vm.bodyParams,
        vm.contentType
      ], val => {
        this.setRouteQueryState()
      })

    }
  }

</script>
