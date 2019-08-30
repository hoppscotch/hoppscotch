<template>
  <div class="page">
    <pw-section class="blue" label="Request" ref="request">
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
          <input id="url" type="url" :class="{ error: !isValidURL }" v-model="url" @keyup.enter="isValidURL ? sendRequest() : null">
        </li>
        <li>
          <label for="path">Path</label>
          <input id="path" v-model="path" @keyup.enter="isValidURL ? sendRequest() : null">
        </li>
        <li>
          <label for="action" class="hide-on-small-screen">&nbsp;</label>
          <button id="action" name="action" @click="sendRequest" :disabled="!isValidURL" ref="sendButton">Send <span id="hidden-message">Again</span></button>
        </li>
      </ul>
    </pw-section>
    <pw-section class="blue-dark" label="Request Body" v-if="method === 'POST' || method === 'PUT' || method === 'PATCH'">
      <ul>
        <li>
          <label>Content Type</label>
          <select v-model="contentType">
            <option>application/json</option>
            <option>www-form/urlencoded</option>
          </select>
          <span>
            <input v-model="rawInput" style="cursor: pointer;" type="checkbox" id="rawInput">
            <label for="rawInput" style="cursor: pointer;">Raw Input</label>
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
            <label for="request" class="hide-on-small-screen">&nbsp;</label>
            <button name="request" @click="removeRequestBodyParam(index)">Remove</button>
          </li>
        </ol>
        <ul>
          <li>
            <label for="addrequest">Action</label>
            <button name="addrequest" @click="addRequestBodyParam">Add</button>
          </li>
        </ul>
        <ul>
          <li>
            <label for="request">Parameter List</label>
            <textarea name="request" rows="1" readonly>{{rawRequestBody || '(add at least one parameter)'}}</textarea>
          </li>
        </ul>
      </div>
      <div v-else>
        <textarea v-model="rawParams" style="font-family: monospace;" rows="16" @keydown="formatRawParams"></textarea>
      </div>
    </pw-section>
    <pw-section class="green" label="Authentication" collapsed>
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
          <input v-model="httpPassword" type="password">
        </li>
      </ul>
      <ul v-if="auth === 'Bearer Token'">
        <li>
          <label for="bearer_token">Token</label>
          <input v-model="bearerToken">
        </li>
      </ul>
    </pw-section>
    <pw-section class="orange" label="Headers" collapsed>
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
          <label for="header" class="hide-on-small-screen">&nbsp;</label>
          <button name="header" @click="removeRequestHeader(index)">Remove</button>
        </li>
      </ol>
      <ul>
        <li>
          <label for="add">Action</label>
          <button name="add" @click="addRequestHeader">Add</button>
        </li>
      </ul>
      <ul>
        <li>
          <label for="request">Header List</label>
          <textarea name="request" rows="1" readonly>{{headerString || '(add at least one header)'}}</textarea>
        </li>
      </ul>
    </pw-section>
    <pw-section class="cyan" label="Parameters" collapsed>
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
          <label for="param" class="hide-on-small-screen">&nbsp;</label>
          <button name="param" @click="removeRequestParam(index)">Remove</button>
        </li>
      </ol>
      <ul>
        <li>
          <label for="add">Action</label>
          <button name="add" @click="addRequestParam">Add</button>
        </li>
      </ul>
      <ul>
        <li>
          <label for="request">Parameter List</label>
          <textarea name="request" rows="1" readonly>{{queryString || '(add at least one parameter)'}}</textarea>
        </li>
      </ul>
    </pw-section>
    <pw-section class="purple" label="Response" id="response" ref="response">
      <ul>
        <li>
          <label for="status">status</label>
          <input name="status" type="text" readonly :value="response.status || '(waiting to send request)'" :class="statusCategory ? statusCategory.className : ''">
        </li>
      </ul>
      <ul v-for="(value, key) in response.headers">
        <li>
          <label for="value">{{key}}</label>
          <input name="value" :value="value" readonly>
        </li>
      </ul>
      <ul>
        <li>
          <div class="flex-wrap">
            <label for="body">response</label>
            <button v-if="response.body" name="action" @click="copyResponse">Copy Response</button>
          </div>
          <div id="response-details-wrapper">
            <textarea name="body" rows="16" id="response-details" readonly>{{response.body || '(waiting to send request)'}}</textarea>
            <iframe src="about:blank" class="covers-response" ref="previewFrame" :class="{hidden: !previewEnabled}"></iframe>
          </div>
          <div v-if="response.body && responseType === 'text/html'" class="align-right">
            <button @click.prevent="togglePreview">{{ previewEnabled ? 'Hide Preview' : 'Preview HTML' }}</button>
          </div>
        </li>
      </ul>
    </pw-section>
    <history @useHistory="handleUseHistory" ref="historyComponent" />
  </div>
</template>

<script>
		import history from "../components/history";
		import section from "../components/section";

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
    components: {
      'pw-section': section,
      history
    },
    data() {
      return {
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
        previewEnabled: false
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
            const obj = JSON.parse(`{${bodyParams.filter(({ key }) => !!key).map(({ key, value }) => `
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
        if (this.hasRequestBody) {
          const requestBody = this.rawInput ? this.rawParams : this.rawRequestBody;

          Object.assign(headers, {
            'Content-Length': requestBody.length,
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
            headers
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
      setRouteQueries(queries) {
        for (const key in queries) {
          if (this[key]) this[key] = queries[key];
        }
      },
      observeRequestButton() {
        const requestElement = this.$refs.request.$el;
        const sendButton = this.$refs.sendButton;
        const observer = new IntersectionObserver((entries, observer) => {
          entries.forEach(entry => {
           sendButton.className = entry.isIntersecting ? '' : 'show';
          });
        }, { threshold: 1 });

        observer.observe(requestElement);
      }
    },
    created() {
      if (Object.keys(this.$route.query).length) this.setRouteQueries(this.$route.query);
    },
    mounted() {
        this.observeRequestButton();
    }
  }

</script>
